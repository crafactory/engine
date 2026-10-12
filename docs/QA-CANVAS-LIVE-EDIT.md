# Canvas and Live Edit regression inventory

Status: planned checks, not completion evidence. This change does not certify full Obsidian parity.

| Requirement | Functional acceptance | Visual state |
| --- | --- | --- |
| Canvas embed | Reading and Live modes render actual nodes and edges; opening the title opens the original Canvas; no editor controls or writes in an embed | Desktop dark/light, narrow screen; populated, empty and malformed Canvas |
| Canvas rename | Extensionless names preserve `.canvas`; explicitly changing file type is rejected; reopen retains Canvas JSON and embeds resolve the new name | Renamed Canvas and its host note |
| Long document with tables | Type before and after large tables; caret remains in the editor viewport; unchanged widgets retain DOM identity; undo/redo and source transitions remain usable | Scrolled bottom and table source |
| Live links | Wiki aliases and Markdown internal links navigate; safe external links work; selected source remains editable; code and unsafe schemes do not activate | Inactive and active link lines |
| Plugin status | Status takes reserved normal-flow space, never covers context footer | Populated status, right sidebar open, 1440px and 375px |
| Native plugin roadmap | Document kernel boundaries, editor provider replacement, lifecycle, trust and optional compatibility adapter | Documentation review, not runtime implementation |

Off-happy-path exploration: malformed Canvas; unsafe link scheme; rename to `.md`; edit another note referenced by an embed; unload plugin status with a long label. Baseline failures and post-fix results must be recorded separately.
