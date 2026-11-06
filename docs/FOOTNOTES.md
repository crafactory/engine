# Footnotes view workflow contract

The [public reference description](https://help.obsidian.md/plugins/footnotes) requires a
list of the active note's footnotes, editing by clicking a footnote, and navigation to its
position. Engine now contributes a lazy right-sidebar native view, not an Obsidian plugin
stub or a claim that syntax rendering alone implements the view.

## Observable workflow

- Open the **Footnotes tab** or run **Show footnotes view**. Only the current Markdown note
  contributes entries. Empty notes and non-Markdown views have explicit empty states.
- Named definitions show their label and body; repeated references have individual jump
  controls. Unreferenced definitions remain visible and editable. Inline `^[notes]` have
  their own body and reference location.
- Click a body to reveal its exact source edit position. This deliberately uses Source
  mode, the existing CodeMirror editor, undo/redo, autosave and disk conflict handling,
  not a second editor or a text-replacement heuristic. Reference buttons reveal each
  original marker. Android closes the covering drawer before focusing the note.
- Editing, undo, external-file refresh and active-note changes recompute the list.
  The host rejects stale content/path before using offsets. Core-plugin disabling removes
  the tab, panel and command; re-enabling restores the workflow.

## Source and parser boundaries

`src/footnotes.ts` uses public MDAST/GFM footnote packages for structural contexts and
UTF-16 source positions, plus an original balanced inline-note scanner. ASTs are runtime
inputs, not copied implementation. Frontmatter/comments are masked without shifting
offsets; inline/fenced/indented code, image alt text, HTML attributes and link destinations
cannot create inline notes. Unicode and CRLF input offsets retain their full-file meaning.

Named labels are exact and the last duplicate definition wins, matching observations of
Engine's existing unchanged Markdown renderer, rather than pretending the normalized GFM
identifier rules are its behavior. The panel displays plain text through React, not raw
note HTML. Opening/navigation does not mutate the note. No installed Obsidian version has
been pinned for pixel-level or exhaustive semantic comparison.

## Verification

- `tests/footnotes.test.ts`: source spans, CRLF/Unicode, repeated/unreferenced/inline notes,
  nested containers, duplicate labels, code/comment/HTML/link exclusions and malformed input.
- `tests/views.test.ts`: lazy view registration, right-slot ownership and lifecycle.
- `e2e/footnotes.spec.ts`: list/edit/navigation, Reading-to-Source focus, keyboard activation,
  undo, active-note changes, live updates, empty/non-Markdown states and core toggle.
- `e2e-desktop/vault.spec.ts`, `native footnotes edit exact source bytes and restore after
  process restart`: exact changed bytes, untouched surrounding Markdown, repeated reference
  targets, inline edit, actual process restart and external-file refresh.
- `scripts/android-acceptance.mjs`, `footnotes list, source editing, reference navigation
  and restart bytes`: actual WebView list/drawer/editor, exact private-file bytes after
  each edit and restart, and isolation from the original native-probe note.

Tests listed here are contracts, not self-attested passes. Frozen executions and final-head
cloud runs belong in [VERIFICATION.md](VERIFICATION.md) and the PR record; the parent
parity area remains unchecked until exhaustive reference workflows pass.
