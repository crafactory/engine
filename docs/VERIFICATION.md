# Verification results

## v0.5.0 review candidate

This candidate is on a feature branch, not a published release. Merge is gated on completed CodeRabbit review of the latest revision, repaired findings, re-review and green CI. No subsequent development increment may bypass this gate. See [contribution workflow](https://github.com/crafactory/engine/blob/main/CONTRIBUTING.md).

[PR #1](https://github.com/crafactory/engine/pull/1) received its first completed CodeRabbit review on implementation `c272da8655a8fc0eeee679bd120dc283aa91941e`: no actionable line comments, but a retained nonsettling-child shutdown concern and a failed docstring-coverage warning. Both were addressed rather than treating a green status as sufficient: bounded cooperative startup/unload waits, late-registration cleanup/generation guards, two native shutdown/late-settlement cases, one canceled-startup unit and JSDoc for changed functions. Latest-revision re-review remains required. Repository branch protection was not changed; main-only publication is an eligibility condition, not proof of enforced required-review rules.

The second completed review of `84a6ced377b0501735de8b98ab947f6ec37db436` found an unload/reload/late-startup race, a retained revoked-context ownership concern and docstring coverage of 78.26%, below the 80% gate. Same-object load now waits for old startup settlement; revoked contexts cannot unload supplied children; unit/native tests cover both sequences. Additional JSDoc addresses the remaining coverage gap, subject to the final bot check. No unresolved review was merged.

Local Linux x64 evidence after review fixes: 534 units, strict TypeScript/production build and all 41 desktop cases passed. The latest 36-case browser regression is recorded in the PR update. The desktop total comprises 31 regular native cases and ten optional external corpus cases actually executed, not skipped. The inventory contains 106 stable entries, including 29 core plugins and 41 bounded checkpoints. Reading processors operate on whole reading hosts only, section mapping returns null, Live Preview processors and recursive static processors remain unsupported. These local source results do not certify newly packaged binaries; public CI/review evidence will be recorded in the PR verification update.

Interactive Electron QA inspected dark/light reading at 1440 × 900, static-render Modal at 375 × 812, real code-button clicks, source/reading transitions and disable restoring the raw fenced code. No horizontal document overflow, inspected-dialog clipping or layering defects were observed. The narrow dialog measured 347 px within a 375 px viewport. Original fixture labels are diagnostic output, not reference UI equivalence. Screenshots are in `docs/images/markdown-plugins-*.png`. The disposable application/vault/profile were closed and removed.

Pinned external plugin bytes were unchanged. Renderer Dataview now reaches an `App.appId` unsupported boundary rather than the previous missing render-child export; this is still startup failure, not functional compatibility. Templater remains a generic class load error, Calendar/Advanced Tables startup-only, and Reading Time retains its eight bounded workflows. Worker still rejects all five. Updated per-mode reports retain timestamps and hashes; no third-party implementation is committed or distributed.

## v0.4.0 local verification

Implementation commit: `8497ef1c59e96c8b404e0fab1a08654a4ca4b0e5`. [Normal CI](https://github.com/crafactory/engine/actions/runs/38205278539) passed 527 units, 36 browser regressions and 23 normal desktop cases; ten optional corpus cases were skipped, not counted as passed. [Three-platform packaging](https://github.com/crafactory/engine/actions/runs/38205278999) passed Linux, Windows and macOS builds, without native Windows/macOS runtime/installation acceptance. [Real-plugin CI](https://github.com/crafactory/engine/actions/runs/38205281119) exercised five pinned inputs in both modes and reproduced the bounded Reading Time workflows; a broad filename filter also repeated the renderer cases once, so the follow-up workflow uses full relative paths to avoid that redundancy.

[Linux publication](https://github.com/crafactory/engine/actions/runs/38205283089) passed all 33 desktop cases against `release/linux-unpacked/crafactory-engine`, including both hash-verified real-plugin modes, before publishing [v0.4.0](https://github.com/crafactory/engine/releases/tag/v0.4.0). These are packaged-executable tests, not FUSE mounting, Debian installation, upgrades or installer acceptance. The binaries are unsigned and existing v0.3.x releases were not overwritten.

Downloaded [SHA256SUMS.txt](https://github.com/crafactory/engine/releases/download/v0.4.0/SHA256SUMS.txt) contains actual asset filenames; both installer entries and the checksum file itself matched GitHub's uploaded-asset SHA-256 metadata. Full installer binaries were not separately re-downloaded for a second local hash calculation.

| Asset | Uploaded SHA-256 |
|---|---|
| [Crafactory-Engine-0.4.0.AppImage](https://github.com/crafactory/engine/releases/download/v0.4.0/Crafactory-Engine-0.4.0.AppImage) | `0a96235de572b804a6193b42bd7a6a42ccdc6317b83084e540bded297085f277` |
| [crafactory-engine_0.4.0_amd64.deb](https://github.com/crafactory/engine/releases/download/v0.4.0/crafactory-engine_0.4.0_amd64.deb) | `51344e774db40d01d9fdc5b8a720e6b9c8cc3393dbaceed89ac1006ce4db4d96` |
| [SHA256SUMS.txt](https://github.com/crafactory/engine/releases/download/v0.4.0/SHA256SUMS.txt) | `61dedb024291398a6d55c05573008a23245b3194ca6f30286ced5c7801a0ed20` |

Executed on 2026-10-12 UTC, Linux x64 and Node.js 22. The installed Obsidian reference version remains unfixed and no differential equivalence is implied.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 98 entries, 29 core, 33 bounded checkpoints | Evidence existence and drift; not full workflow execution |
| `npm run test` | 527 passed | Existing Worker contracts plus six renderer event/hook/inventory contracts |
| `npm run build` | Passed | Strict TypeScript and production bundle; existing large-chunk warnings remain |
| `npm run test:e2e` | 36 passed | Full existing browser regression, not native mobile |
| Desktop with both verified corpus modes | 33 passed | 23 regular native cases + five Worker negative startup cases + five renderer corpus cases |
| Renderer fixture | 5 passed within desktop total | Explicit permission/cancel, real settings and modal focus, DOM/CM/view/unload, Node rejection, failed-startup UI cleanup |
| Real Reading Time | Eight bounded workflows in one renderer corpus case | Actual unchanged bytes, settings JSON, document/editor/selection UI, unload/re-enable |
| Calendar / Advanced Tables | Startup only | No functional workflow certification |
| Dataview / Templater | Startup failures | Named unsupported export / generic class load error; later workflows not run |
| Default Worker real corpus | All five startup failures | Passing assertions verify refusal, not working plugins |
| `npm audit --omit=dev` | 0 known advisories | Not a security guarantee |
| Full `npm audit` | 8 moderate, 0 high, 0 critical | Build/dev vulnerabilities unresolved |
| Interactive Linux Electron visual QA | Dark/light 1440 × 900; settings/Modal 375 × 812 | Viewport fit and normal controls; not exhaustive accessibility or mobile audit |

The renderer's startup error cleanup, boot/unload sequencing and Blob loading are original code. Trusted renderer remains unsandboxed and cannot forcibly stop main-thread code. Third-party corpus files are outside the repository and installer. The packaged workflow additionally downloaded hash-verified inputs and completed the full 33-case desktop suite, as linked above.

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

The inventory reader/parser now normalizes CRLF before section matching and generated-text comparison; repository text uses explicit LF attributes. Three independent regression cases check all 29 core rows and final cells under CRLF, generated-document comparison and preservation of Unicode/lone CR. This raises the source unit suite to 521. No plugin or application capability is upgraded by this patch, and no previously published 0.3.0 binary is overwritten.

Commit `edc2d89030e411655a871dfcd8fa8cc7e9ded07a` passed [the 0.3.1 Verify workflow](https://github.com/crafactory/engine/actions/runs/38198688877): 521 unit tests, TypeScript/production build, 36 browser tests and 18 Linux Electron desktop tests; five optional corpus cases were correctly reported as skipped there. [The separate pinned-corpus workflow](https://github.com/crafactory/engine/actions/runs/38198693360) executed all five real-plugin startup-failure cases successfully; none of these plugins was functionally compatible.

The same commit passed [Linux packaging and publishing](https://github.com/crafactory/engine/actions/runs/38198691046), including all 18 desktop tests against the actual packaged executable before publishing [v0.3.1](https://github.com/crafactory/engine/releases/tag/v0.3.1). [Three-platform packaging](https://github.com/crafactory/engine/actions/runs/38198689122) completed successfully for Linux, Windows and macOS after the CRLF correction. Windows/macOS remain build checks, not native Electron runtime/install acceptance.

The downloaded checksum text's names/digests match the GitHub upload asset metadata. AppImage `Crafactory-Engine-0.3.1.AppImage` has SHA-256 `1a3814be8b4268b8098241f1a91280068cfb1c6907d36be3a20e0ec14176d4fd`; Debian `crafactory-engine_0.3.1_amd64.deb` has `6c57cc427af2ba3227a342df964d19d15dde7d0f649ab8c8b11481a4bb494f4e`. The checksum file has `2349e92992619a72be746738b4a8bdb80c8276dfb9e371f260f83a46745cc1ea`. This checks the manifest against provider-computed upload digests, not a separate redownload/hash of the two complete binaries.
