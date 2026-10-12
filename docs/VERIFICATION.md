# Verification results

Executed on 2026-10-11 on Linux x64 with Node.js 22.23.3. These results verify the listed Engine behaviors, not full Obsidian equivalence or all supported operating systems.

## Executed checks

| Check | Result | Scope |
|---|---|---|
| `npm run test` | 55 passed | YAML, references, tags, search, templates, safe Bases expressions, real vault filesystem, Unicode paths, conflicts, recovery, trash, traversal/symlink safety |
| `npm run build` | Passed | Strict TypeScript checking and Vite production bundle |
| `npm run test:e2e` | 23 passed | Real browser keyboard/mouse/input flows, editing, metadata, tasks, palette, search, graph, Canvas, Bases, bookmarks, rename, recovery, templates, theme, layout, import/export, math/diagrams, slides, narrow viewport |
| `npm run test:desktop` | 6 passed | Electron app protocol, actual disk writes, watcher, rename/link update, trash, immediate-close save, Unicode paths/content, opt-in Worker plugin |
| Same desktop suite against `release/linux-unpacked/crafactory-engine` | 6 passed | Actual packaged Electron executable and packaged resources, not the development server |
| Same desktop suite against the executable extracted from the AppImage | 6 passed | Locally built AppImage payload; not a FUSE mount or installation test |
| Linux AppImage and Debian package build | Passed | Electron-builder Linux x64 packaging; unsigned artifacts |
| `npm audit --omit=dev` | 0 known advisories reported | Installed production dependency graph at check time, not a security guarantee |
| `npm audit` | 8 moderate, 0 high, 0 critical advisories | Remaining build-tool dependency chain through electron-builder / @electron/get / global-agent / roarr / sprintf-js |

The pushed implementation commit `73c0daca21c1f5fba3ad8c91bd6974d119ba56f8` passed [the GitHub Actions Verify workflow](https://github.com/crafactory/engine/actions/runs/38155611092), including install, unit/build, browser, and desktop checks. Subsequent documentation and package-metadata commits should be checked through their own workflow runs.

The [Linux prerelease workflow](https://github.com/crafactory/engine/actions/runs/38156323024) also passed unit/build, packaging and packaged-executable desktop tests before publishing [v0.1.0](https://github.com/crafactory/engine/releases/tag/v0.1.0). The separate [three-platform packaging workflow](https://github.com/crafactory/engine/actions/runs/38156310973) successfully built Linux, Windows and macOS artifacts; Windows/macOS native runtime and installation behavior remain unverified.

## Visual inspection

Desktop reading views were inspected in dark and light mode at 1440×940, and the narrow layout was inspected at 390×844. Source/live editors, settings, graph, Canvas, and Bases screenshots are committed in `docs/images`.

No page-level horizontal overflow was found at those viewports. The inspected reading views, dialogs, settings, and table controls did not show unintended text overflow or layering defects. Graph filter controls were moved out of the graph drawing area after detecting label occlusion. Canvas cards are intentionally bounded previews; long note content is not fully visible in a card.

The manual browser session reported no uncaught page errors after corrections. Narrow-screen responsiveness is not native mobile support.

## Corrections made during QA

- A new Canvas card initially retained a stale edit callback. The callback now reads the latest canvas data, and add/edit/save/source round-trip passes.
- Reading-view template insertion previously placed frontmatter at the wrong location. Properties now merge into frontmatter and template body is appended safely for that flow.
- Live editing now keeps YAML frontmatter out of the editing surface while preserving it through saves and property updates.
- Browser ZIP export initially attempted to fetch blob attachments under a restrictive CSP. Preview attachments now use data URLs and the import/image/ZIP flow passes.
- Browser and desktop suites initially shared an output directory, causing trace cleanup collisions when run concurrently. Desktop output is now separated.
- Dependencies were updated to remove reported production advisories and the old test-tool high/critical advisories. Remaining moderate build-tool advisories are explicitly retained as open work rather than hidden by incompatible overrides.

## Not verified

- Native macOS/Windows runtime behavior, signed/notarized installers, and installation/upgrade/uninstall behavior.
- Android/iOS apps, reference plugin compatibility, first-party browser extension parity, or complete reference settings/commands.
- Full live block rendering, the full `.base` expression language, all JSON Canvas fields/interaction semantics, or every Markdown grammar edge case.
- Audio hardware recording, OS PDF save/visual fidelity, arbitrary external sites, adversarial plugin containment, and very-large vault performance.
- OS crash/power-loss durability, multi-process vault access, cross-platform filesystem permission preservation, or a complete security/accessibility audit.

The Xvfb desktop test launcher uses `--no-sandbox` solely for test-environment execution. Production configuration keeps renderer sandboxing enabled; these runs do not certify OS sandbox enforcement.

Consult `PARITY.md` for the broader unfinished target and `SECURITY.md` before testing with important data.

## 0.2.0 workspace and Live Preview regression

On 2026-10-12 UTC, the revised source passed 68 unit tests, 36 browser end-to-end tests, TypeScript/production build and 7 desktop integration tests. The additional 13 unit tests cover block mapping, literal-code protection, UTF-16/CRLF ranges, selections and loss-minimizing table changes. The additional 13 browser tests cover the removed header, live blocks, cell edits, undo/redo, task/frontmatter integrity, folded/nested callouts, source selections, errors, narrow screens and embed refresh. The added desktop test verifies table/task changes in the actual Markdown file.

Manual inspection covered dark/light desktop at 1440×940 and a light 390×844 viewport, with no document-level horizontal overflow. Tabbar top is 0 and statusbar bottom matches the viewport. The sidebar remains accessible after removing the custom titlebar. Screenshots are in `docs/images/live-blocks-*.png`; source-preview switching and table/task edits produced no uncaught page errors in the inspected session.

The implementation commit `cebfe70da9206fb1739f557415cd555013e28f3d` also passed [the 0.2.0 Verify workflow](https://github.com/crafactory/engine/actions/runs/38193971090). The [0.2.0 Linux publishing workflow](https://github.com/crafactory/engine/actions/runs/38193971063) passed unit/build, packaging and all 7 packaged-program desktop tests before publishing [v0.2.0](https://github.com/crafactory/engine/releases/tag/v0.2.0). The [0.2.0 three-platform packaging workflow](https://github.com/crafactory/engine/actions/runs/38193973228) passed for Linux, Windows and macOS; the latter two are build artifacts, not native runtime acceptance.

Full application parity, native Windows/macOS runtime, table restructuring, nested live grammar and a complete accessibility/security audit remain outstanding.

## 0.3.0 checklist and plugin compatibility revision

Local source verification on 2026-10-12 UTC passed inventory validation, 518 unit tests and production TypeScript/Vite build. Of these unit cases, 271 probe documented export names; many others test explicit rejection. This count is not a feature-completion or plugin-compatibility percentage. The checklist contains 93 entries, including all 29 core plugins and 28 narrowly scoped acceptance checkpoints.

Browser regression passed 36 tests. Linux Electron desktop regression passed all 18 original/subset/negative cases, including CommonJS text create/append, plugin data load/save/unload/re-enable, real selection edits, window-close unload, duplicate create/traversal refusal, reading-mode command availability and unsupported DOM/Node/export/editor/Bases startup. Ordinary desktop runs skip the optional five upstream-corpus cases without the required environment variable.

Actual pinned upstream releases of five community plugins were loaded unchanged into isolated Linux vaults. All five failed during startup; their exact observed errors and fingerprints are in `COMMUNITY-PLUGIN-TESTS.md` and `compatibility/community-results.json`. Passing negative startup assertions is not positive compatibility. No subsequent workflows, additional blockers, other native operating systems or installed-reference comparisons were tested.

The revised Community plugins warning/empty state was manually inspected in dark/light 1440×940 and light 390×844 browser viewports. Warning text, dialog bounds and close controls fit; no document-level horizontal overflow or uncaught page errors were observed. Narrow navigation uses its existing horizontally scrolling strip. Screenshots are `docs/images/plugin-compatibility-*.png`.

Dependency audits reported zero known production advisories; the full dependency graph still has eight moderate, zero high and zero critical advisories. No dependencies or proprietary SDKs were added for the compatibility layer. No third-party corpus implementation is committed or packaged.

The expanded API index and primary 12-class contract inventory remain documentation-based, not complete member/overload/timing acceptance. Native Windows/macOS/mobile, installed reference version, full plugin/environment parity and broad security/accessibility/performance audits are still open.

The initial implementation commit `2779811edabaf5cc680ee2d067922bfc1a951d37` passed [Verify](https://github.com/crafactory/engine/actions/runs/38198273673), [Linux packaged-program verification/publishing](https://github.com/crafactory/engine/actions/runs/38198275597) and [the real-plugin startup corpus](https://github.com/crafactory/engine/actions/runs/38198277365). [v0.3.0](https://github.com/crafactory/engine/releases/tag/v0.3.0) therefore contains validated Linux artifacts. Its [three-platform build](https://github.com/crafactory/engine/actions/runs/38198273871) failed in the Windows inventory gate: CRLF left a carriage return in the `Core plugins` section name. That failure is retained here and is not described as a successful three-platform release.

## 0.3.1 cross-platform inventory correction

The inventory reader/parser now normalizes CRLF before section matching and generated-text comparison; repository text uses explicit LF attributes. Three independent regression cases check all 29 core rows and final cells under CRLF, generated-document comparison and preservation of Unicode/lone CR. This raises the source unit suite to 521. No plugin or application capability is upgraded by this patch, and no previously published 0.3.0 binary is overwritten. Completed 0.3.1 run evidence is recorded separately below once verified.
