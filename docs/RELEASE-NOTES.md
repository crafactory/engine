# Crafactory Engine v0.2.0

An independently implemented, MIT-licensed, local-first Markdown workspace. This is an early **prerelease**, not a complete 1:1 Obsidian replacement. Back up important vaults before testing.

## Included

Local vaults and ordinary Markdown files, source/basic-live/reading modes, links and backlinks, search, graph, Canvas, basic Bases, properties, tags, tabs and a split pane, commands, templates/daily notes, recovery/trash, import/export, themes/CSS, a small CLI, and an opt-in independent Worker plugin API.

## Changes in this revision

- Removed the custom software-name/vault-name top bar; tabs now meet the top of the workspace. Vault switching remains in the left ribbon/sidebar. The OS window frame is unchanged.
- Added inactive top-level live block rendering for tables, code fences, Mermaid, callouts/quotes, display math, standalone embeds, and rules. Edit source or double-click reveals Markdown; selections intersecting blocks also reveal source.
- Table header/body cells can be edited with Enter/Tab or blur to commit and Escape to cancel. Changes preserve Markdown delimiters/alignment and support undo/redo.
- Added live task toggles and inline math, preserving frontmatter and protecting code literals.
- Added nested collapsible callouts honoring `+` / `-` defaults in reading and live views.
- Added focused browser, desktop-file-save and Markdown-range tests. `docs/QA-LIVE-PREVIEW.md` documents limitations.

Original code and original branding are MIT licensed. No Obsidian application code or branded assets are included. Third-party resources retain their respective licenses.

## Checks

68 unit tests, 36 browser end-to-end tests, and 7 desktop integration tests cover this revision. The Linux publishing workflow reruns unit/build and packaged-executable desktop checks before upload; refer to that workflow's result for release-package verification.

## Downloads and limitations

Linux x64 AppImage and `.deb` artifacts are unsigned. `SHA256SUMS.txt` contains file checksums, not a cryptographic publisher signature. AppImage execution requires an appropriate Linux environment; the locally built AppImage's extracted executable was tested, but FUSE/installer behavior is not a certified installation test. The explicitly dispatched Linux publishing workflow also tests its packaged executable before uploading artifacts.

Windows/macOS build workflows are configured separately; no native runtime verification is claimed for them. There is no native mobile application.

Complete live inline/nested grammar, table row/column restructuring, exact cursor semantics, full Bases grammar, full Canvas semantics, reference community-plugin compatibility, browser clipper/importer/maps, arbitrary workspace trees, full localization, release signing, large-vault validation, and a complete security/accessibility audit remain outstanding. See `docs/PARITY.md`.

Production dependency audit reported zero known advisories at check time. Eight moderate advisories remain in the development/build-tool dependency chain. See `docs/VERIFICATION.md`.

Obsidian Sync and Publish are deliberately excluded subscription services. Engine is not affiliated with Obsidian.
