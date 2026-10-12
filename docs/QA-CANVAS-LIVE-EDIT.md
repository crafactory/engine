# Canvas and Live Edit regression inventory

Status: bounded candidate coverage executed below; latest-head review/CI and packaged publication remain separate gates. This change does not certify full Obsidian parity.

| Requirement | Functional acceptance | Visual state |
| --- | --- | --- |
| Canvas embed | Reading and Live modes render actual nodes and edges; opening the title opens the original Canvas; no editor controls or writes in an embed | Desktop dark/light, narrow screen; populated, empty and malformed Canvas |
| Canvas rename | Extensionless names preserve `.canvas`; explicitly changing file type is rejected; reopen retains Canvas JSON and embeds resolve the new name | Renamed Canvas and its host note |
| Long document with tables | Type before and after large tables; caret remains in the editor viewport; unchanged widgets retain DOM identity; undo/redo and source transitions remain usable | Scrolled bottom and table source |
| Live links | Wiki aliases and Markdown internal links navigate; safe external links work; selected source remains editable; code and unsafe schemes do not activate | Inactive and active link lines |
| Plugin status | Status takes reserved normal-flow space, never covers context footer | Populated status, right sidebar open, 1440px and 375px |
| Native plugin roadmap | Document kernel boundaries, editor provider replacement, lifecycle, trust and optional compatibility adapter | Documentation review, not runtime implementation |

Off-happy-path exploration: malformed Canvas; unsafe link scheme; rename to `.md`; edit another note referenced by an embed; unload plugin status with a long label. Baseline failures and post-fix results must be recorded separately.

## Executed candidate coverage

The full browser suite passed 48 tests, including twelve new cases. The unit suite passed 553 tests; the Linux desktop suite passed 45 cases with both fixed corpus modes enabled. Seven selected checks failed against the actual v0.5 merge in a detached worktree, then passed on the corrected candidate. A deeper bottom-cell commit check exposed a remaining viewport jump and was corrected using mapped scroll snapshots; it is not omitted from acceptance.

Interactive browser inspection covered actual Canvas geometry and links in dark/light desktop and 375px layouts, bottom-table commit visibility, resize-to-fit, and real compact local-graph activation. A staged status string was used only for illustrative browser geometry, not as evidence of a real community-plugin workflow; the native suite independently exercises a real plugin's status creation/unload.

The narrow Canvas is an overview with pan/zoom controls, not a claim that all node text remains readable at fit-to-screen scale. Invalid/empty sources and unsafe links have positive browser assertions. All installed-reference behavior, arbitrary grammar, complete Canvas file-card rendering, mobile native execution and large-Vault performance remain unverified.
