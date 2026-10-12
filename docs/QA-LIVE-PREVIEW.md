# Live Preview and workspace revision QA

This revision removes the custom software-name/vault-name top bar. The operating system's window frame is unchanged. Vault switching remains in the left ribbon and sidebar footer.

## Acceptance coverage

- Workspace starts at the tabbar; no custom titlebar or brand-name row. Verify desktop, narrow-screen sidebar top alignment, and both themes.
- Inactive top-level Markdown tables, code fences, Mermaid diagrams, blockquotes/callouts, display math, standalone embeds and rules render in the editor.
- Edit source button or double-click a block reveals the exact Markdown. Moving the cursor away renders it again. Selections spanning a block keep that block as source.
- Table header/body cells can be edited. Enter/Tab or blur commits, Escape cancels. Source retains delimiters/alignment and escapes inserted pipes. Undo/redo works.
- Inactive task checkboxes update their own Markdown marker, not other tasks or frontmatter.
- Inline math renders away from the active line; math-like text in fenced/inline code stays code.
- Collapsible callouts honor `+` and `-` in both reading and live views.
- Source/reading/live switching, frontmatter preservation, saving, closing the desktop app, and existing workflows remain covered by regression tests.

## Off-happy-path cases

- Escaped pipes, code-span pipes, empty table cells and Unicode paths/content.
- Invalid math/diagrams, missing embeds, long tables on narrow screens, and selecting across block boundaries.
- React widget teardown during source switching and undo; no uncaught page error or stale write.

This is a wider implemented subset, not full Live Preview or whole-application parity. Table row/column restructuring, nested lists, complete inline grammar, exact cursor semantics, and full reference compatibility remain open.
