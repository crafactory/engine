# Live Preview and workspace revision QA

This revision removes the custom software-name/vault-name top bar. The operating system's window frame is unchanged. Vault switching remains in the left ribbon and sidebar footer.

## Acceptance coverage

- Workspace starts at the tabbar; no custom titlebar or brand-name row. Verify desktop, narrow-screen sidebar top alignment, and both themes.
- Live mode hides frontmatter with line decorations while keeping the full document (and undo history) intact; source mode shows it. The cursor is clamped below hidden frontmatter. Inactive top-level Markdown tables, code fences, Mermaid diagrams, blockquotes/callouts, display math, standalone embeds and rules render in the editor.
- Click inside a rendered block (code, diagram, quote/callout, math, embed, rule or table padding) to reveal the exact Markdown at the clicked line. Moving the cursor away renders it again. There is no separate Edit source button. Selections spanning a block keep that block as source.
- Table header/body cells can be edited. Tab/Shift+Tab move between cells; Tab on the last cell appends a row and focuses its first cell. Hovering the bottom/right edge exposes Add row below / Add column right affordances; selecting a cell exposes move/delete controls for its row and column. Column alignment (`:---`, `---:`, `:---:`) is applied. Enter or blur commits, Escape cancels. Source retains delimiters and escapes inserted pipes. Undo/redo works.
- Inactive task checkboxes update their own Markdown marker, not other tasks or frontmatter.
- Inline images render through the bridge (or safe external URLs) and reveal source on click; inline `#tags` render as pills outside code/links. Inline math renders away from the active line; math-like text in fenced/inline code stays code. Bold/italic/highlight/strike/inline code hide markers only when the touched span is not active, escaped markers stay literal, and setext headings render as headings.
- Collapsible callouts honor `+` and `-` in both reading and live views.
- Source/live switching keeps undo history; reading mode still remounts the editor. Reading processors are not run in live blocks; explicitly registered `engine.ui` block previews (e.g., Mermaid) render and reveal source on click. Source/reading/live switching, frontmatter preservation, saving, closing the desktop app, and existing workflows remain covered by regression tests.

## Off-happy-path cases

- Escaped pipes, code-span pipes, empty table cells and Unicode paths/content.
- Invalid math/diagrams, missing embeds, long tables/code lines (scroll inside the block, not the page), and selecting across block boundaries.
- React widget teardown during source switching and undo; no uncaught page error or stale write.

This is a wider implemented subset, not full Live Preview or whole-application parity. An alignment-setting UI, nested lists, complete inline grammar, exact cursor semantics, inline properties UI (properties remain in the side panel), and full reference compatibility remain open.
