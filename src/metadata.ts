/* Original CachedMetadata-shaped derivation for Obsidian compatibility.
 *
 * Positions are UTF-16 offsets into the full file (including frontmatter), with zero-based
 * line and column coordinates. This is a bounded subset used by compatibility plugins; it
 * is not a reference section parser.
 */
import {frontmatter} from './knowledge';

export interface CachePosition {line: number; col: number; offset: number}
export interface CachePos {start: CachePosition; end: CachePosition}
export interface HeadingCache {heading: string; level: number; position: CachePos}
export interface LinkCache {link: string; original: string; displayText?: string; position: CachePos}
export interface EmbedCache extends LinkCache {}
export interface TagCache {tag: string; position: CachePos}
export interface SectionCache {type: string; id?: string; position: CachePos}
export interface ListItemCache {line: number; parent: number; task?: string; id?: string; position: CachePos}
export interface BlockCache {id: string; type: string; position: CachePos}
export interface CachedMetadata {
  frontmatter?: Record<string, unknown>;
  frontmatterPosition?: CachePos;
  headings?: HeadingCache[];
  links?: LinkCache[];
  embeds?: EmbedCache[];
  tags?: TagCache[];
  sections?: SectionCache[];
  listItems?: ListItemCache[];
  blocks?: Record<string, BlockCache>;
}

interface Line {text: string; start: number; end: number}

function linesOf(content: string): Line[] {
  const lines: Line[] = [];
  let start = 0;
  for (const raw of content.split('\n')) {
    const text = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    lines.push({text, start, end: start + text.length});
    start += raw.length + 1;
  }
  return lines;
}

function positionAt(lines: Line[], offset: number): CachePosition {
  let low = 0, high = lines.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (lines[mid].start <= offset) low = mid; else high = mid - 1;
  }
  return {line: low, col: Math.max(0, offset - lines[low].start), offset};
}

function positionOf(lines: Line[], start: number, end: number): CachePos {
  return {start: positionAt(lines, start), end: positionAt(lines, end)};
}

/** Ranges occupied by inline code spans so links/tags inside them stay literal. */
function inlineCodeRanges(text: string): {from: number; to: number}[] {
  const ranges: {from: number; to: number}[] = [];
  for (const match of text.matchAll(/(`+)([\s\S]*?)\1/g)) {
    const from = match.index ?? 0;
    ranges.push({from, to: from + match[0].length});
  }
  return ranges;
}

function inRanges(index: number, ranges: {from: number; to: number}[]): boolean {
  return ranges.some(range => index >= range.from && index < range.to);
}

function tagNames(value: unknown): string[] {
  if (typeof value === 'string') return value.split(/[,\s]+/).map(tag => tag.replace(/^#/, '')).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(tagNames);
  return [];
}

/** Derive a bounded CachedMetadata value for one Markdown file. */
export function parseMetadata(content: string): CachedMetadata {
  const lines = linesOf(content);
  const parsed = frontmatter(content);
  const result: CachedMetadata = {};
  if (parsed.raw) {
    result.frontmatter = parsed.properties;
    const end = Math.max(0, parsed.raw.replace(/\r?\n$/, '').length);
    result.frontmatterPosition = positionOf(lines, 0, end);
  }
  const bodyStart = parsed.raw.length;
  const bodyLine = positionAt(lines, bodyStart).line;
  const headings: HeadingCache[] = [], links: LinkCache[] = [], embeds: EmbedCache[] = [], tags: TagCache[] = [], listItems: ListItemCache[] = [];
  const blocks: Record<string, BlockCache> = {};
  const headingLines = new Set<number>();

  for (let index = bodyLine; index < lines.length; index++) {
    const line = lines[index], text = line.text;
    const heading = text.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const start = line.start + text.length - text.trimStart().length;
      headings.push({heading: heading[2], level: heading[1].length, position: positionOf(lines, start, line.end)});
      headingLines.add(index);
    } else if (/^ {0,3}(=+|-+)\s*$/.test(text) && index > bodyLine) {
      const previous = lines[index - 1];
      if (previous.text.trim() && !/^ {0,3}(=+|-+)\s*$/.test(previous.text)) {
        const start = previous.start + previous.text.length - previous.text.trimStart().length;
        headings.push({heading: previous.text.trim(), level: text.trimStart().startsWith('=') ? 1 : 2, position: positionOf(lines, start, line.end)});
        headingLines.add(index - 1);
      }
    }

    const task = text.match(/^(\s*)([-*+]|\d{1,9}[.)])\s+\[([ xX])\]\s+/);
    const item = text.match(/^(\s*)([-*+]|\d{1,9}[.)])\s+/);
    if (item) {
      const indent = item[1].replace(/\t/g, '    ').length;
      let parent = -1;
      for (let previous = index - 1; previous >= bodyLine; previous--) {
        const candidate = lines[previous].text.match(/^(\s*)([-*+]|\d{1,9}[.)])\s+/);
        if (!candidate) continue;
        if (candidate[1].replace(/\t/g, '    ').length < indent) { parent = previous; break; }
      }
      const entry: ListItemCache = {line: index, parent, position: positionOf(lines, line.start, line.end)};
      if (task) entry.task = task[3].toLowerCase() === 'x' ? 'x' : ' ';
      listItems.push(entry);
    }

    const block = text.match(/(?:^|\s)\^([A-Za-z0-9-]+)\s*$/);
    if (block) blocks[block[1]] = {id: block[1], type: 'paragraph', position: positionOf(lines, line.start, line.end)};

    const code = inlineCodeRanges(text);
    for (const match of text.matchAll(/(!?)\[\[([^\]\n]+)\]\]/g)) {
      const from = match.index ?? 0;
      if (inRanges(from, code)) continue;
      const inner = match[2];
      const [destination, ...alias] = inner.split('|');
      const [target] = destination.split('#');
      const link: LinkCache = {link: target || destination, original: match[0], position: positionOf(lines, line.start + from, line.start + from + match[0].length)};
      if (alias.length) link.displayText = alias.join('|');
      if (match[1]) { embeds.push(link); links.push(link); } else links.push(link);
    }
    for (const match of text.matchAll(/(!?)\[([^\]\n]*)\]\(([^)\n]+)\)/g)) {
      const from = match.index ?? 0;
      if (inRanges(from, code)) continue;
      const destination = match[3].trim().replace(/^<|>$/g, '');
      if (/^[a-z]+:\/\//i.test(destination) || destination.startsWith('data:')) continue;
      const [target] = destination.split('#');
      const link: LinkCache = {link: target || destination, original: match[0], position: positionOf(lines, line.start + from, line.start + from + match[0].length)};
      if (match[2]) link.displayText = match[2];
      if (match[1]) { embeds.push(link); links.push(link); } else links.push(link);
    }
    for (const match of text.matchAll(/(^|[\s([{])#([\p{L}\p{N}_/-]*[\p{L}_/-][\p{L}\p{N}_/-]*)/gu)) {
      const from = (match.index ?? 0) + match[1].length;
      if (inRanges(from, code)) continue;
      tags.push({tag: '#' + match[2], position: positionOf(lines, line.start + from, line.start + from + 1 + match[2].length)});
    }
  }

  const frontmatterTags = tagNames(parsed.properties.tags);
  for (const tag of frontmatterTags) tags.push({tag: '#' + tag, position: result.frontmatterPosition ?? positionOf(lines, 0, 0)});

  const sections: SectionCache[] = [];
  if (result.frontmatterPosition) sections.push({type: 'yaml', position: result.frontmatterPosition});
  headings.sort((a, b) => a.position.start.offset - b.position.start.offset);
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].position.start.offset;
    const end = headings[i + 1]?.position.start.offset ?? content.length;
    sections.push({type: 'heading', id: headings[i].heading, position: positionOf(lines, start, end)});
  }
  if (!headings.length && bodyStart < content.length) sections.push({type: 'markdown', position: positionOf(lines, bodyStart, content.length)});

  if (headings.length) result.headings = headings;
  if (links.length) result.links = links;
  if (embeds.length) result.embeds = embeds;
  if (tags.length) result.tags = tags;
  if (sections.length) result.sections = sections;
  if (listItems.length) result.listItems = listItems;
  if (Object.keys(blocks).length) result.blocks = blocks;
  return result;
}
