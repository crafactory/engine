# Markdown plugin QA inventory

Reference behavior: [MarkdownRenderChild](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownRenderChild), [post-processor registration](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/registerMarkdownPostProcessor), [context](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPostProcessorContext), and [MarkdownRenderer](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownRenderer).

This increment is limited to reading-mode whole-host post-processing and named fenced-code blocks, not full section, nested embed or Live Preview equivalence.

| Claim/control | Functional evidence | Visual inspection state |
|---|---|---|
| Sorted post-processors and original code bytes | Native fixture verifies LOW/HIGH order, button source and parent sourcePath/frontmatter | Reading note with rendered block |
| Render-child lifecycle and native DOM events | Click persists counter; remove child unloads; source/reading reloads; disable balances load/unload | Before/after removal and disable |
| Sanitized static rendering | Modal renders strong text, no script node or recursive processor markers | Static-render Modal, desktop/narrow |
| Late async callback isolation | Switch from Test.md to Next.md while callback waits; settle old callback, assert no successor output or child; settle Next.md independently | Different successor note, then disabled note |
| Pending owner startup | Register processors, hold startup, request vault switch; raw reading restored before startup settles, subsequent reading stays raw, both late registration methods reject | Restored raw reading host during startup wait |
| Template palette focus | Create a daily note under fixed clock, open templates and advance pending focus timer; actual keyboard Enter inserts Discussion | Focus remains in template input until selection |
| Nonsettling render-child startup | Bounded owner cleanup and repeated enable/disable; late settlement removes registered events and prevents nested startup | Disabled switch, removed status, unchanged raw code |
| Revoked context ownership | Source/reading successor adoption; stale context command cannot unload successor; real button still works | Successor button, final disable |
| Pending child unload | Managed global DOM handler removed despite nonsettling user hook and another nonsettling cleanup; owner stop completes | Disabled switch, restored raw code, real clicks no longer counted |
| Worker limitations preserved | Existing negative exports/method cases remain | Explicit errors/default mode |
| PR review requirement | CodeRabbit latest review complete, findings fixed, tests green before merge | Public PR evidence, no direct-main development |

Exploratory checks include rapid reading/source toggles, disabling during a pending render, removing a child while its load is pending, and repeated enable/disable. getSectionInfo deliberately returns documented nullable unknown rather than fabricated positions. Static rendering does not recursively invoke plugin processors. Error cleanup and viewport checks do not constitute comprehensive adversarial security or accessibility certification.

## Executed visual pass

Linux Electron: dark and light reading at 1440 × 900, sanitized Modal at 375 × 812, visible processor button/context/status, source/reading reload and disabled raw-code restoration. Normal UI inputs exercised the button, palette, settings runtime/permission, theme and enable/disable controls. Screenshots are `docs/images/markdown-plugins-*.png`; no inspected clipping, horizontal document overflow or layering defect was observed. The native session and disposable profile/vault were cleaned up. This does not sign off native mobile or reference DOM parity.
