import { LiveTable } from './ui/blocks/LiveTable';
import { createRoot, type Root } from 'react-dom/client';
import { StateField, StateEffect, RangeSetBuilder, type EditorState } from '@codemirror/state';
import { EditorView, Decoration, WidgetType, type DecorationSet } from '@codemirror/view';
import DOMPurify from 'dompurify';
import katex from 'katex';
import { Markdown } from './Markdown';
import { frontmatter } from './knowledge';
import {
  liveRegions,
  touchesRange,
  fenceLanguage,
  fenceSource,
  listMarker,
  minimalBlockChange,
  type LiveBlock,
} from './live-model';
import type { Note } from './types';
import { inlineLinks, type InlineLink } from './inline-links';
import { inlineImages, type InlineImage } from './inline-images';
import { bridge } from './bridge';
import { BlockPreviewHost } from './ui/blocks/BlockPreviewHost';
import type { BlockContribution } from './services/ui';

export const refreshLivePreview = StateEffect.define<null>();
interface Context {
  path: string;
  notes: Note[];
  assetVersions?: ReadonlyMap<string, string>;
  onOpen: (target: string) => void;
  blocks?: () => BlockContribution[];
}
const roots = new WeakMap<HTMLElement, Root>();
const blockOwners = new WeakMap<HTMLElement, BlockWidget>();
const imageOwners = new WeakMap<HTMLElement, InlineImageWidget>();

class BlockWidget extends WidgetType {
  readonly notes: Note[];
  /** Snapshot external documents without treating current-document typing as a dependency refresh. */
  readonly contribution: BlockContribution | undefined;
  constructor(
    readonly block: LiveBlock,
    readonly context: () => Context,
  ) {
    super();
    const ctx = context();
    this.notes = ctx.notes.filter((n) => n.path !== ctx.path);
    this.contribution =
      this.block.kind === 'code' || this.block.kind === 'diagram'
        ? ctx.blocks?.().find((entry) => entry.language === fenceLanguage(this.block.content))
        : undefined;
  }
  /** Contributions take source/path only; transclusions still depend on external documents. */
  sameContent(other: BlockWidget) {
    return (
      this.block.kind === other.block.kind &&
      this.block.content === other.block.content &&
      this.context === other.context &&
      (!!this.contribution ||
        (this.notes.length === other.notes.length &&
          this.notes.every(
            (n, i) => n.path === other.notes[i].path && n.content === other.notes[i].content,
          )))
    );
  }
  /** Let CodeMirror reuse a widget only when both its content and source coordinates match. */
  eq(other: BlockWidget) {
    return (
      this.block.from === other.block.from &&
      this.block.to === other.block.to &&
      this.contribution === other.contribution &&
      this.sameContent(other)
    );
  }
  /** Reuse measured DOM while rebinding edit callbacks to newly mapped source positions. */
  updateDOM(host: HTMLElement, view: EditorView) {
    const old = blockOwners.get(host);
    if (!old || this.contribution !== old.contribution) return false;
    if (this.block.kind === 'table' && old.block.kind === 'table' && this.context === old.context) {
      blockOwners.set(host, this);
      if (this.block.content !== old.block.content) this.renderBody(host, view);
      return true;
    }
    if (!this.sameContent(old)) return false;
    blockOwners.set(host, this);
    return true;
  }
  /** Reconcile into the existing React root and reject edits based on superseded source content. */
  renderBody(host: HTMLElement, view: EditorView) {
    const root = roots.get(host);
    if (!root) return;
    const base = this.block.content;
    /** Persist only a still-owned block revision and keep its pre-edit viewport anchor. */
    const onChange = (content: string) => {
      const owner = blockOwners.get(host);
      if (owner?.block.content === base && owner.current(view)) {
        const changes = minimalBlockChange(owner.block.from, base, content);
        // Anchor the viewport before replacing widget-backed source; selection may be elsewhere.
        if (changes) view.dispatch({ changes, effects: view.scrollSnapshot(), userEvent: 'input' });
      }
    };
    const ctx = this.context();
    if (this.contribution) {
      root.render(
        <BlockPreviewHost
          contribution={this.contribution}
          source={fenceSource(base)}
          path={ctx.path}
        />,
      );
      return;
    }
    root.render(
      this.block.kind === 'table' ? (
        <LiveTable
          content={base}
          onChange={onChange}
          onMeasure={() => {
            if (blockOwners.has(host)) view.requestMeasure();
          }}
        />
      ) : (
        <Markdown
          content={base}
          notes={ctx.notes}
          path={ctx.path}
          onOpen={ctx.onOpen}
          onChange={onChange}
          pluginProcessing={false}
        />
      ),
    );
  }
  /** Mount a bounded live widget without admitting reading-only plugin processors. */
  toDOM(view: EditorView) {
    const host = document.createElement('div');
    host.className = 'live-block live-block-' + this.block.kind;
    blockOwners.set(host, this);
    host.dataset.liveBlock = this.block.kind;
    host.contentEditable = 'false';
    host.tabIndex = 0;
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', 'Edit ' + this.block.kind + ' block');
    /** Reveal current source; code/diagram clicks map the rendered line to its source offset. */
    const reveal = (event?: MouseEvent) => {
      const owner = blockOwners.get(host);
      if (!owner?.current(view)) return;
      let anchor = owner.block.from;
      if (event && (owner.block.kind === 'code' || owner.block.kind === 'diagram')) {
        const pre = host.querySelector('.live-block-body pre');
        if (pre) {
          const rect = pre.getBoundingClientRect(),
            style = getComputedStyle(pre);
          const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 20;
          const line = Math.max(
            0,
            Math.floor((event.clientY - rect.top + pre.scrollTop) / lineHeight),
          );
          const lines = owner.block.content.split('\n'),
            fence = /^```/.test(lines[0] || '');
          const target = Math.min(lines.length - 1, line + (fence ? 1 : 0));
          anchor =
            owner.block.from +
            lines.slice(0, target).reduce((total, text) => total + text.length + 1, 0);
        }
      }
      view.dispatch({ selection: { anchor }, scrollIntoView: true });
      view.focus();
    };
    host.onclick = (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('button,input,a,summary,audio,video,textarea,select')) return;
      if (window.getSelection()?.toString()) return;
      reveal(event);
    };
    host.onkeydown = (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === host) {
        event.preventDefault();
        reveal();
      }
    };
    const body = document.createElement('div');
    body.className = 'live-block-body';
    host.append(body);
    const root = createRoot(body);
    roots.set(host, root);
    this.renderBody(host, view);
    requestAnimationFrame(() => {
      if (host.isConnected) view.requestMeasure();
    });
    return host;
  }
  /** Reject gestures whose captured block no longer matches the editor document. */
  current(view: EditorView) {
    return view.state.sliceDoc(this.block.from, this.block.to) === this.block.content;
  }
  /** Release the owned React root after CodeMirror finishes its synchronous DOM update. */
  destroy(dom: HTMLElement) {
    const root = roots.get(dom);
    roots.delete(dom);
    blockOwners.delete(dom);
    queueMicrotask(() => root?.unmount());
  }
  /** Keep widget controls independent of CodeMirror's source-selection event handling. */
  ignoreEvent() {
    return true;
  }
}
class LinkWidget extends WidgetType {
  /** Bind an immutable safe link token to the current editor's navigation context. */
  constructor(
    readonly link: InlineLink,
    readonly context: () => Context,
  ) {
    super();
  }
  /** Preserve the link node when its displayed label and destination are unchanged. */
  eq(other: LinkWidget) {
    return (
      this.link.target === other.link.target &&
      this.link.label === other.link.label &&
      this.context === other.context
    );
  }
  /** Render a keyboard-accessible link without changing selection before navigation. */
  toDOM() {
    const anchor = document.createElement('a');
    anchor.className = 'live-link';
    anchor.textContent = this.link.label;
    if (this.link.external) {
      anchor.href = this.link.target;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    } else {
      anchor.href = '#';
      anchor.onclick = (e) => {
        e.preventDefault();
        this.context().onOpen(this.link.target);
      };
    }
    return anchor;
  }
  /** Let anchors handle pointer and keyboard activation rather than editing hidden syntax. */
  ignoreEvent() {
    return true;
  }
}
class TagWidget extends WidgetType {
  /** Bind a tag token to its source offset. */
  constructor(
    readonly tag: string,
    readonly from: number,
  ) {
    super();
  }
  /** Reuse a tag pill while its text is unchanged. */
  eq(other: TagWidget) {
    return this.tag === other.tag && this.from === other.from;
  }
  /** Render a clickable pill that reveals its source. */
  toDOM(view: EditorView) {
    const pill = document.createElement('span');
    pill.className = 'live-tag';
    pill.textContent = this.tag;
    pill.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      view.dispatch({ selection: { anchor: this.from }, scrollIntoView: true });
      view.focus();
    };
    return pill;
  }
  /** Let the pill handle clicks rather than the editor. */
  ignoreEvent() {
    return true;
  }
}
class InlineImageWidget extends WidgetType {
  readonly target: string;
  readonly assetVersion: string | undefined;
  /** Bind an immutable safe image token to the current editor context. */
  constructor(
    readonly image: InlineImage,
    readonly from: number,
    readonly context: () => Context,
  ) {
    super();
    const ctx = context(),
      dir = ctx.path.split('/').slice(0, -1).join('/');
    const relative = (name: string) => (dir ? `${dir}/${name}` : name);
    this.target = image.src.startsWith('/')
      ? image.src.slice(1)
      : image.src.startsWith('./')
        ? relative(image.src.slice(2))
        : image.src.includes('/')
          ? image.src
          : relative(image.src);
    // Snapshot metadata: asking the live context during equality would compare the new
    // revision on both widgets and incorrectly retain stale decoded bytes.
    this.assetVersion = image.external ? undefined : ctx.assetVersions?.get(this.target);
  }
  /** Compare visual identity independently of the source offset mapped by the editor. */
  sameImage(other: InlineImageWidget) {
    return (
      this.image.src === other.image.src &&
      this.image.alt === other.image.alt &&
      this.context === other.context &&
      this.assetVersion === other.assetVersion
    );
  }
  /** Rebind source gestures when coordinates move, without reloading the image. */
  eq(other: InlineImageWidget) {
    return this.from === other.from && this.sameImage(other);
  }
  /** Retain the decoded image and bind its existing listener to the newest source owner. */
  updateDOM(dom: HTMLElement) {
    const old = imageOwners.get(dom);
    if (!old || !this.sameImage(old)) return false;
    imageOwners.set(dom, this);
    return true;
  }
  /** Render a local asset through the bridge or a safe external URL. */
  toDOM(view: EditorView) {
    const wrap = document.createElement('span');
    wrap.className = 'live-inline-image-wrap';
    imageOwners.set(wrap, this);
    const img = document.createElement('img');
    img.className = 'live-inline-image';
    img.alt = this.image.alt;
    img.title = this.image.alt;
    img.loading = 'lazy';
    img.onload = () => {
      if (imageOwners.has(wrap) && wrap.isConnected) view.requestMeasure();
    };
    if (this.image.external) {
      img.src = this.image.src;
    } else {
      const target = this.target;
      bridge
        .asset(target)
        .then((url) => {
          if (!imageOwners.has(wrap)) return;
          if (url) {
            img.src = url;
          } else {
            img.alt = 'Missing image: ' + this.image.alt;
            img.title = 'Missing asset: ' + target;
          }
        })
        .catch((error) => {
          if (imageOwners.has(wrap)) {
            img.alt = 'Missing image: ' + this.image.alt;
            img.title = 'Asset error: ' + target + ': ' + String(error);
          }
        });
    }
    img.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const owner = imageOwners.get(wrap);
      if (!owner) return;
      view.dispatch({ selection: { anchor: owner.from }, scrollIntoView: true });
      view.focus();
    };
    wrap.append(img);
    return wrap;
  }
  /** Let the image own clicks rather than translating them into source selection. */
  ignoreEvent() {
    return true;
  }
  /** Ignore late asset completion after the widget is no longer owned by the editor. */
  destroy(dom: HTMLElement) {
    imageOwners.delete(dom);
  }
}
class InlineMathWidget extends WidgetType {
  /** Capture the expression rendered by this immutable inline widget. */
  constructor(readonly expression: string) {
    super();
  }
  /** Reuse unchanged sanitized math nodes. */
  eq(other: InlineMathWidget) {
    return this.expression === other.expression;
  }
  /** Render untrusted math with KaTeX trust disabled and sanitized output. */
  toDOM() {
    const span = document.createElement('span');
    span.className = 'live-inline-math';
    span.innerHTML = DOMPurify.sanitize(
      katex.renderToString(this.expression, { throwOnError: false, trust: false }),
    );
    return span;
  }
}
class TaskWidget extends WidgetType {
  /** Capture a checkbox's verified source marker and accessible task label. */
  constructor(
    readonly from: number,
    readonly prefix: string,
    readonly checked: boolean,
    readonly label: string,
  ) {
    super();
  }
  /** Preserve checkbox DOM only while its complete source identity remains unchanged. */
  eq(other: TaskWidget) {
    return (
      this.from === other.from &&
      this.prefix === other.prefix &&
      this.checked === other.checked &&
      this.label === other.label
    );
  }
  /** Toggle a still-matching source marker through an undoable editor transaction. */
  toDOM(view: EditorView) {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = this.checked;
    box.contentEditable = 'false';
    box.className = 'live-task-checkbox';
    box.setAttribute('aria-label', 'Toggle task: ' + this.label);
    box.onchange = () => {
      const start = this.from + this.prefix.length;
      if (/^\[[ xX]\]$/.test(view.state.sliceDoc(start, start + 3)))
        view.dispatch({
          changes: { from: start + 1, to: start + 2, insert: box.checked ? 'x' : ' ' },
          userEvent: 'input',
        });
    };
    return box;
  }
  /** Let the checkbox own its input event rather than move the source cursor. */
  ignoreEvent() {
    return true;
  }
}

class ListMarkerWidget extends WidgetType {
  /** Capture an immutable list marker and its nesting depth. */
  constructor(
    readonly marker: string,
    readonly ordered: boolean,
    readonly depth: number,
  ) {
    super();
  }
  /** Reuse the marker DOM while its source identity is unchanged. */
  eq(other: ListMarkerWidget) {
    return (
      this.marker === other.marker && this.ordered === other.ordered && this.depth === other.depth
    );
  }
  /** Render a bullet or the original ordered marker instead of the list syntax. */
  toDOM() {
    const span = document.createElement('span');
    span.contentEditable = 'false';
    span.className = 'live-list-marker' + (this.ordered ? ' is-ordered' : '');
    span.style.setProperty('--list-depth', String(this.depth));
    span.textContent = this.ordered ? this.marker : '•';
    return span;
  }
}

/** Register original live decorations and restrict atomic ranges to rendered widgets. */
export function livePreview(context: () => Context) {
  const field = StateField.define<DecorationSet>({
    create: (state) => build(state, context),
    update: (value, tr) =>
      tr.docChanged || tr.selection || tr.effects.some((e) => e.is(refreshLivePreview))
        ? build(tr.state, context)
        : value,
    provide: (field) => EditorView.decorations.from(field),
  });
  // Styled source marks must remain selectable/editable; only rendered widgets are atomic.
  return [
    field,
    EditorView.atomicRanges.of((view) =>
      view.state.field(field).update({ filter: (_from, _to, dec) => !!dec.spec.widget }),
    ),
  ];
}
/** Build bounded block and inline previews while keeping selected source editable. */
function build(state: EditorState, context: () => Context): DecorationSet {
  const ranges: { from: number; to: number; dec: Decoration }[] = [];
  const selected = state.selection.ranges;
  const source = state.doc.toString(),
    meta = frontmatter(source),
    frontmatterEnd = meta.error ? 0 : meta.raw.length;
  const { blocks, literal } = liveRegions(source);
  if (frontmatterEnd) {
    const first = state.doc.lineAt(0).number,
      last = state.doc.lineAt(Math.max(0, frontmatterEnd - 1)).number;
    for (let n = first; n <= last; n++)
      ranges.push({
        from: state.doc.line(n).from,
        to: state.doc.line(n).from,
        dec: Decoration.line({ class: 'frontmatter-hidden' }),
      });
  }
  for (const block of blocks) {
    if (block.from < frontmatterEnd) continue;
    if (!touchesRange(block.from, block.to, selected)) {
      ranges.push({
        from: block.from,
        to: block.to,
        dec: Decoration.replace({ block: true, widget: new BlockWidget(block, context) }),
      });
      continue;
    }
    if (block.kind === 'code' || block.kind === 'diagram') {
      const first = state.doc.lineAt(block.from).number,
        last = state.doc.lineAt(block.to).number;
      for (let n = first; n <= last; n++)
        ranges.push({
          from: state.doc.line(n).from,
          to: state.doc.line(n).from,
          dec: Decoration.line({ class: 'live-code-source' }),
        });
    }
  }
  const escapedAt = (text: string, index: number) => {
    let count = 0;
    for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) count++;
    return count % 2 === 1;
  };
  const setext = new Map<number, number>();
  for (let n = 2; n <= state.doc.lines; n++) {
    const underline = state.doc.line(n).text,
      previous = state.doc.line(n - 1).text;
    if (!previous.trim()) continue;
    if (/^ {0,3}=+\s*$/.test(underline)) setext.set(n - 1, 1);
    else if (/^ {0,3}-+\s*$/.test(underline)) setext.set(n - 1, 2);
  }
  for (let n = 1; n <= state.doc.lines; n++) {
    const line = state.doc.line(n);
    if (line.from < frontmatterEnd) continue;
    if ([...blocks, ...literal].some((b) => line.from >= b.from && line.from < b.to)) continue;
    const links = inlineLinks(line.text);
    for (const link of links) {
      const from = line.from + link.from,
        to = line.from + link.to;
      ranges.push({
        from,
        to,
        dec: touchesRange(from, to, selected)
          ? Decoration.mark({ class: 'live-link', attributes: { 'data-live-target': link.target } })
          : Decoration.replace({ widget: new LinkWidget(link, context) }),
      });
    }
    const heading = line.text.match(/^(#{1,6}) /);
    if (heading) {
      ranges.push({
        from: line.from,
        to: line.from,
        dec: Decoration.line({ class: 'live-heading live-h' + heading[1].length }),
      });
      if (!touchesRange(line.from, line.from + heading[0].length, selected))
        ranges.push({
          from: line.from,
          to: line.from + heading[0].length,
          dec: Decoration.replace({}),
        });
    }
    const level = setext.get(n);
    if (level) {
      ranges.push({
        from: line.from,
        to: line.from,
        dec: Decoration.line({ class: 'live-heading live-h' + level }),
      });
      if (n < state.doc.lines) {
        const underline = state.doc.line(n + 1);
        if (!touchesRange(underline.from, underline.to + 1, selected))
          ranges.push({ from: underline.from, to: underline.to, dec: Decoration.replace({}) });
      }
    }
    const task = line.text.match(/^(\s*[-*+] +)\[([ xX])\] (.*)$/);
    if (task) {
      const from = line.from,
        to = line.from + task[1].length + 3;
      if (!touchesRange(from, to, selected))
        ranges.push({
          from,
          to,
          dec: Decoration.replace({
            widget: new TaskWidget(line.from, task[1], task[2].toLowerCase() === 'x', task[3]),
          }),
        });
    } else {
      const marker = listMarker(line.text, line.from);
      if (marker && !touchesRange(marker.from, marker.to, selected))
        ranges.push({
          from: marker.from,
          to: marker.to,
          dec: Decoration.replace({
            widget: new ListMarkerWidget(marker.marker, marker.ordered, marker.depth),
          }),
        });
    }
    const occupied: { from: number; to: number }[] = [];
    for (const match of line.text.matchAll(/(\*\*|==|~~|`|\*|_)(.+?)\1/g)) {
      const index = match.index!,
        from = line.from + index,
        to = from + match[0].length,
        marker = match[1];
      if (escapedAt(line.text, index)) continue;
      if (
        marker === '_' &&
        (/\w/.test(line.text[index - 1] || '') ||
          /\w/.test(line.text[index + match[0].length] || ''))
      )
        continue;
      occupied.push({ from, to });
      if (links.some((link) => from < line.from + link.to && to > line.from + link.from)) continue;
      const active = touchesRange(from, to, selected);
      const cls =
        marker === '**'
          ? 'live-bold'
          : marker === '=='
            ? 'live-mark'
            : marker === '~~'
              ? 'live-strike'
              : marker === '*' || marker === '_'
                ? 'live-italic'
                : 'live-code';
      ranges.push({ from, to, dec: Decoration.mark({ class: cls }) });
      if (!active)
        ranges.push(
          { from, to: from + marker.length, dec: Decoration.replace({}) },
          { from: to - marker.length, to, dec: Decoration.replace({}) },
        );
    }
    for (const image of inlineImages(line.text)) {
      const from = line.from + image.from,
        to = line.from + image.to;
      if (occupied.some((range) => from < range.to && to > range.from)) continue;
      if (links.some((link) => from < line.from + link.to && to > line.from + link.from)) continue;
      if (touchesRange(from, to, selected)) continue;
      occupied.push({ from, to });
      ranges.push({
        from,
        to,
        dec: Decoration.replace({ widget: new InlineImageWidget(image, from, context) }),
      });
    }
    for (const match of line.text.matchAll(/(^|[\s([{])#([A-Za-z0-9_/-]+)/g)) {
      const index = match.index! + match[1].length,
        from = line.from + index,
        to = from + match[0].length - match[1].length;
      if (escapedAt(line.text, index)) continue;
      if (occupied.some((range) => from < range.to && to > range.from)) continue;
      if (links.some((link) => from < line.from + link.to && to > line.from + link.from)) continue;
      if (touchesRange(from, to, selected)) continue;
      occupied.push({ from, to });
      ranges.push({
        from,
        to,
        dec: Decoration.replace({ widget: new TagWidget('#' + match[2], from) }),
      });
    }
    for (const match of line.text.matchAll(/(?<!\\)\$(?!\$)([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\$)/g)) {
      const index = match.index!,
        from = line.from + index,
        to = from + match[0].length;
      if (escapedAt(line.text, index)) continue;
      if (occupied.some((r) => from < r.to && to > r.from)) continue;
      if (links.some((link) => from < line.from + link.to && to > line.from + link.from)) continue;
      if (!touchesRange(from, to, selected))
        ranges.push({
          from,
          to,
          dec: Decoration.replace({ widget: new InlineMathWidget(match[1]) }),
        });
    }
  }
  ranges.sort((a, b) => a.from - b.from || a.dec.startSide - b.dec.startSide || a.to - b.to);
  const builder = new RangeSetBuilder<Decoration>();
  for (const r of ranges) builder.add(r.from, r.to, r.dec);
  return builder.finish();
}
