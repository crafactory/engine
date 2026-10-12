# Crafactory Engine v0.3.0

An independently implemented, MIT-licensed local-first Markdown workspace. This is a **prerelease**, not a complete 1:1 Obsidian replacement. Back up important vaults and test plugins only against disposable data.

## Feature tracking

Added a generated feature checklist with 93 stable tracking IDs, all 29 documented core plugins, platform/free-extension gaps, 28 bounded test-evidenced checkpoints and unfinished parity gates. Only narrow acceptance checkpoints are checked; no parent area is declared complete. Sync/Publish alone are subscription exclusions. The checklist is a starting inventory, not an exhaustive reference specification.

`npm run inventory:check` is part of the normal verification gate and rejects generated drift, duplicate IDs, missing core entries, extra exclusions and missing test evidence. It does not itself execute the linked tests or detect every future documentation change; refresh the pinned baseline deliberately.

## Experimental plugin compatibility

Added an original CommonJS Worker runtime for `require('obsidian')` with bounded Plugin/Component lifecycle, commands and documented callback precedence, text-file APIs, plugin JSON data and single-selection editor operations. The independent Engine API remains supported. Local enable remains explicit and is not persisted across launches; startup can modify notes, so only enable trusted code.

The public API inventory classifies 271 names: 154 runtime symbols and 117 type-only names. Only 27 runtime symbols have subset implementations; 127 runtime symbols are rejected. Primary member contracts cover 12 classes but not every overload or inherited behavior. Export existence/rejection is not full behavioral compatibility.

Added create-only text writes, serialized in-process appends, plugin data namespaces and cross-plugin symlink rejection. Plugin errors remove commands and do not leave the UI enabled. Vault switching and window close attempt plugin unload before filesystem changes/close; the Worker has a two-second graceful-shutdown timeout. No crash/power-loss, multi-process safety or adversarial sandbox certification is made.

Actual pinned upstream Dataview, Templater, Calendar (Beta), Advanced Tables and Reading Time artifacts are tested at startup in disposable vaults. **All five fail to load; none is certified compatible.** A named unsupported API and a generic load error are recorded distinctly, and testing stops at the first failure. Their source is not redistributed or incorporated into Engine. See `COMMUNITY-PLUGIN-TESTS.md` for hashes, release-tag/manifest-version differences and reproduction.

## Verification interpretation

The source unit suite contains 518 tests, including 271 export-name probes, explicit rejection and member-inventory checks. These are not 518 independent compatible features. Desktop regressions cover 18 cases, including original fixtures and negative paths; five real-plugin startup cases require separately downloaded pinned inputs and are skipped in ordinary desktop runs. Their successful test assertions certify observed refusal, not successful plugin behavior. Browser regression covers 36 cases.

The Linux publishing workflow packages and tests the actual executable before exposing artifacts. The separate corpus workflow fetches the pinned plugin inputs and records startup results; the three-platform workflow builds unsigned Windows/macOS/Linux artifacts. Consult `VERIFICATION.md` for executed run evidence, and do not treat workflow definitions as completed runs.

## Remaining gaps

Full DOM/settings/Modal/view/Markdown processor/CodeMirror/Node environment compatibility, module-wrapper parity, real-plugin workflows, exact metadata caches/events, binary/storage APIs, full Live Preview and table restructuring, full Bases/Canvas semantics, arbitrary workspace trees, native mobile, free first-party extensions, localization, signed installers, large-vault acceptance and complete security/accessibility audits remain outstanding.

The current dependency checks report zero known production advisories and eight moderate development/build advisories. This is not a security guarantee. Linux packages are unsigned; Windows/macOS native runtime and installation are not accepted yet. Original application code remains MIT with third-party resource notices retained; Engine is not affiliated with Obsidian.
