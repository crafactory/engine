# Crafactory Engine v0.1.0

An independently implemented, MIT-licensed, local-first Markdown workspace. This is an early **prerelease**, not a complete 1:1 Obsidian replacement. Back up important vaults before testing.

## Included

Local vaults and ordinary Markdown files, source/basic-live/reading modes, links and backlinks, search, graph, Canvas, basic Bases, properties, tags, tabs and a split pane, commands, templates/daily notes, recovery/trash, import/export, themes/CSS, a small CLI, and an opt-in independent Worker plugin API.

Original code and original branding are MIT licensed. No Obsidian application code or branded assets are included. Third-party resources retain their respective licenses.

## Checks

55 unit tests, 23 browser end-to-end tests, and 6 desktop integration tests passed. The desktop suite also passed against the packaged Linux executable. TypeScript/production build and Linux x64 AppImage/Debian packaging passed.

## Downloads and limitations

Linux x64 AppImage and `.deb` artifacts are unsigned. `SHA256SUMS.txt` contains file checksums, not a cryptographic publisher signature. AppImage execution requires an appropriate Linux environment; the locally built AppImage's extracted executable was tested, but FUSE/installer behavior is not a certified installation test. The explicitly dispatched Linux publishing workflow also tests its packaged executable before uploading artifacts.

Windows/macOS build workflows are configured separately; no native runtime verification is claimed for them. There is no native mobile application.

Full live block preview, full Bases grammar, full Canvas semantics, reference community-plugin compatibility, browser clipper/importer/maps, arbitrary workspace trees, full localization, release signing, large-vault validation, and a complete security/accessibility audit remain outstanding. See `docs/PARITY.md`.

Production dependency audit reported zero known advisories at check time. Eight moderate advisories remain in the development/build-tool dependency chain. See `docs/VERIFICATION.md`.

Obsidian Sync and Publish are deliberately excluded subscription services. Engine is not affiliated with Obsidian.
