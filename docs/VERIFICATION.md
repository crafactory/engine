# Verification results

## First core-feature plugin: bookmarks (stage 5, in progress)

This section records source verification for the first core-feature migration in
[NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md) stage 5. The
`engine.bookmarks/v1` contract, its default plugin and the application wiring are
delivered; the rest of the core features are not migrated, so stage 5 stays unchecked and
the native-plugin-kernel gate stays open.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 692 passed (18 files) | 686 prior plus 6 new bookmarks cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `tests/bookmarks.test.ts` | 6 passed | Service behavior, subscription and kernel composition |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline; the 6 are the known `Control+…` platform cases |

The application now consumes `engine.bookmarks/v1` for toggling/adding/removing bookmarks
and mirrors it into render state through `subscribe`; the bookmark e2e case passes.
Persistence remains application-side until the storage providers are wired into the UI.
These are unit/composition and local checks, not packaged-binary acceptance.

## Native editor providers and UI wiring stage 4 (post-0.6.0 development)

This section records source verification for the fourth migration stage in
[NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md), specified in
[SERVICES-SPEC.md](SERVICES-SPEC.md) (`engine.editor/v1` and the optional
`engine.editor.codemirror/v1` capability). The contract, two providers and the application
wiring for selection/viewport are delivered; **body-text drafts and write conflicts still
use the application's existing draft and bridge-conflict logic**, and the
native-plugin-kernel gate stays open.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 686 passed (17 files) | 660 prior plus 26 new editor cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `tests/editor.test.ts` | 26 passed | Shared contract on two providers, drafts, conflicts, viewport migration, capabilities |
| `npm run test:e2e` (macOS) | 44 passed / 7 failed | Baseline 43 plus the new scroll-restore case; the 7 are the known `Control+…` platform cases |

One shared `engine.editor/v1` contract suite runs against the CodeMirror `@codemirror/state`
provider and the plain-text provider: open/edit/mark-saved and dirty tracking, insertion at
the selection, conflict refusal on a mismatched expected base, undo/redo, draft recovery
with selection/viewport/dirty state, viewport shifting across an edit and by the changed
range when text is prepended, a passive view-driven `track` sync, and rejection of a draft
for a different path. Provider
migration is checked in both directions (CodeMirror ↔ plain) preserving text, selection,
viewport and dirtiness, and the CodeMirror capability contract is rejected with a
missing-provider diagnostic when only the plain editor is active.

The application opens one session per active note from the default CodeMirror provider and
restores/reports selection and viewport through it. A browser case
(`e2e/regressions.spec.ts` / `editor session restores scroll position across tab switches`)
scrolls a long note, switches tabs, returns, and asserts the scroll position was restored —
a behavior the pre-wiring baseline did not have. The seven browser failures are the known
macOS `Control+…` versus `Cmd` keybinding cases; they are green on Linux CI. These remain
unit/composition and local checks, not packaged-binary acceptance.

## Native workspace and format views stage 3 (post-0.6.0 development)

This section records source verification for the third migration stage in
[NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md), specified in
[SERVICES-SPEC.md](SERVICES-SPEC.md) (`engine.render/v1`, `engine.workspace/v1` and the
format view plugins). `src/App.tsx` now resolves a note's format view through the native
workspace service instead of hardcoded extension checks; storage/documents/commands still
run through `src/bridge.ts`. This does not complete the native-plugin-kernel gate.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 660 passed (16 files) | 646 prior plus 14 new workspace cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `tests/workspace.test.ts` | 14 passed | Format registry, view slots, composition, kernel-import purity |
| `npm run test:e2e` (macOS) | 43 passed / 7 failed | Identical to the pre-change baseline; failures are `Control+...` keybinding cases |
| `npm run test:desktop` (macOS) | 35 passed / 1 failed / 10 skipped | One `Control+Home/Shift+End` platform failure; ten optional corpus cases skipped |

The new cases cover case-insensitive format resolution, revoked-registration chains that
must not resurrect a stopped scope, view-slot ordering and resolution through the render
service, binding the workspace service to the render provider it consumes, activation
order and missing-provider rejection for the workspace provider, scope-stop revocation of
format/view registrations, additive composition with the storage/document/commands
providers, and a static check that every import under `src/kernel/` is a sibling relative
module — so the kernel cannot import
a Markdown, Canvas or Bases implementation.

The browser suite shows no new failures: the same seven macOS `Control+...` keybinding
cases fail as before the change, and the Canvas/Bases format-dispatch flows pass. The
desktop suite adds one platform-specific keybinding failure in a CommonJS-editor test;
both are `Cmd`-vs-`Control` differences and are green on the Linux CI runner, not
regressions. These are still unit/composition and local checks, not packaged-binary
acceptance.

## Native service providers stage 2 (post-0.6.0 development)

This section records source verification for the second migration stage in
[NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md), whose contracts are in
[SERVICES-SPEC.md](SERVICES-SPEC.md). It extracts native storage, commands and documents
providers; **the application UI is not switched to them and `src/bridge.ts` remains the
running entry.** This does not complete the native-plugin-kernel gate.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 646 passed (15 files) | 603 prior plus 43 new service cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `tests/services.test.ts` | 43 passed | One shared storage contract suite on two providers, commands, documents, kernel composition |

The shared `engine.storage/v1` contract suite runs the same assertions against the
in-memory preview provider and the local-filesystem provider wrapping `core/vault.mjs`:
create-only semantics and competing creates, optimistic conflict detection, serialized
appends, listing/hiding metadata, path validation, executable-format refusal, rename and
subtree moves, trash, snapshot/restore with no-op detection, plugin-data isolation and
size bounds, state round-trip, attachment storage and Unicode paths. A local-only case
covers symlink-escape rejection. `engine.commands/v1` and `engine.documents/v1` have their
own contract cases, and a composition case verifies the documents provider is activated
after storage with empty diagnostics.

Local browser e2e was exercised on macOS here as a sanity check: 43 of 50 pass, and the
seven failures are `Control+...` keybinding cases (`Control+Home/End/z/a/Shift+ArrowLeft`)
whose macOS equivalents are `Cmd`-based. They are platform differences, not regressions,
and are green on the Linux CI runner; the kernel and service providers are not imported
by the application, so they cannot affect those flows.

These are unit/composition results. They do not exercise the packaged desktop application
or the UI on the new providers, and they do not certify cross-process atomicity, crash
durability or a permission model.

## Native plugin kernel stage 1 (post-0.6.0 development)

This section records source verification for the first migration stage in
[NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md), whose fixed contracts are
in [KERNEL-SPEC.md](KERNEL-SPEC.md). It is an internal assembly kernel; **no product
feature has been migrated and the running application does not use it yet.** This is not
community-plugin compatibility and does not complete the native-plugin-kernel gate.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 603 passed (14 files) | 565 existing plus 38 new kernel cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `tests/kernel.test.ts` | 38 passed | Assembly, scopes, services, events, effects and lifecycle |

The 38 kernel cases cover: bounded semantic-version matching (caret/tilde/comparator/
wildcard/alternative, partial-bound rounding, prerelease ordering/gating and the numeric representability bound);
provider-before-consumer ordering and versioned service resolution; missing provider,
optional provider, version mismatch, duplicate provider, dependency cycle, engine
mismatch and contract allowlist; manifest validation; startup rollback including
reverse-order effect cleanup and recorded cleanup failures; unsupplied declared
provisions and a provision whose supplied version differs from the declaration; effect ordering, late registration after disposal, abort-signal delivery
and event revocation; cross-vault scope isolation with rejection of an upward
runtime-to-vault dependency; reload with descendant-scope teardown and a serialized
restart behind an in-flight stop; all four declared event strategies; and the
diagnostic observer including containment of a throwing observer.

These are assembly-unit results. They do not exercise the packaged desktop application,
real plugins, file I/O or rendering, and they do not certify the kernel as a sandbox.
Later stages remain unchecked, and the native-plugin-kernel gate stays open.

## v0.5.0 review candidate

This section records feature-branch candidate verification before publication, not a claim that candidate builds are releases. Final review, merge and publication outcomes are recorded in the [PR verification updates](https://github.com/crafactory/engine/pull/1) and corresponding release. Merge is gated on completed CodeRabbit review of the latest revision, repaired findings, re-review and green CI. No subsequent development increment may bypass this gate. See [contribution workflow](https://github.com/crafactory/engine/blob/main/CONTRIBUTING.md).

[PR #1](https://github.com/crafactory/engine/pull/1) received its first completed CodeRabbit review on implementation `c272da8655a8fc0eeee679bd120dc283aa91941e`: no actionable line comments, but a retained nonsettling-child shutdown concern and a failed docstring-coverage warning. Both were addressed rather than treating a green status as sufficient: bounded cooperative startup/unload waits, late-registration cleanup/generation guards, two native shutdown/late-settlement cases, one canceled-startup unit and JSDoc for changed functions. Latest-revision re-review remains required. Repository branch protection was not changed; main-only publication is an eligibility condition, not proof of enforced required-review rules.

The second completed review of `84a6ced377b0501735de8b98ab947f6ec37db436` found an unload/reload/late-startup race, a retained revoked-context ownership concern and docstring coverage of 78.26%, below the 80% gate. Same-object load now waits for old startup settlement; revoked contexts cannot unload supplied children; unit/native tests cover both sequences. Additional JSDoc addresses the remaining coverage gap, subject to the final bot check. No unresolved review was merged.

The completed review of `7acf4871c28d7a7aa87d85f69d7d77cb4d672712` found a pending-unload/reload race and retained managed-handler cleanup concern. Component now installs both lifecycle barriers before hooks, waits for complete prior unload before reload, captures old resources, and invokes all cleanup without blocking resource revocation on pending hooks or another cleanup promise. Native testing covers a permanently pending child unload plus another pending cleanup while its global handler is actually removed. A deferred-unload unit verifies that old cleanup does not consume next-generation resources; disposed parents cannot tear down supplied foreign children. Async completion may overlap and remains a bounded original policy, not reference timing certification.

The initial aggregate docstring report was 78.26%; its follow-up could not identify missing declarations or rule out scope/parser/stale-result behavior, so no unsupported cause was asserted. Additional documentation was followed by a completed full review of `929735b8309b9664bf42cd69f2c6735888a21f82`, which passed at 80.77% against the unchanged 80% threshold. That review retained a pending-owner-startup processor-revocation concern and a distinct-successor-note test nitpick; both are repaired in the next candidate rather than bypassed. Earlier lifecycle review also identified repeated self-awaited hook calls; public idempotence is restored while host-only lifecycle tracking preserves actual completion waits.

[PR CI](https://github.com/crafactory/engine/actions/runs/38214737099) and [branch CI](https://github.com/crafactory/engine/actions/runs/38214733521) failed the daily-note/template browser flow on the 929735b revision. The creation timer could steal palette focus; creation now respects intervening modal/input/document focus, and palette-kind changes remount the input state. A controlled-clock regression always creates a new daily note, advances the pending focus timer while the template dialog is open, verifies input focus, and inserts using real keyboard Enter. Both failures remain recorded; they are not represented as passes.

Local Linux x64 evidence for the 929735b source: 536 units, strict TypeScript/production build, 36 browser regressions and all 42 desktop cases passed locally, despite the later public browser failures above. The next candidate passed 540 units, strict TypeScript/production build, 36 browser cases and all 43 desktop cases locally, comprising 33 regular native cases and ten optional external corpus cases actually executed. Final review and public CI must still be recorded in the PR before merge. The inventory contains 108 stable entries, including 29 core plugins and 43 bounded checkpoints. Reading processors operate on whole reading hosts only, section mapping returns null, Live Preview processors and recursive static processors remain unsupported. Local source results do not certify newly packaged binaries.

Interactive Electron QA inspected dark/light reading at 1440 × 900, static-render Modal at 375 × 812, real code-button clicks, source/reading transitions and disable restoring the raw fenced code. No horizontal document overflow, inspected-dialog clipping or layering defects were observed. The narrow dialog measured 347 px within a 375 px viewport. Original fixture labels are diagnostic output, not reference UI equivalence. Screenshots are in `docs/images/markdown-plugins-*.png`. The disposable application/vault/profile were closed and removed.

The subsequent browser focus replay used the same controlled creation clock and actual palette/keyboard inputs: focus remained in the template input after advancing the creation timer, and Discussion appeared after Enter. The unchanged dark desktop layout was visually inspected with the inserted template. This browser check is not native platform acceptance.

The completed review of `79427c97df710b6022f780fbc89e74323939887a` established no further issue and no retained architecture concern, but its expanded docstring analysis failed at 71.88% over 32 functions. No merge occurred. Additional workspace, deferred-focus and inert external-store helper documentation is included for re-review, without lowering or disabling the 80% gate. The [79427c9 PR verification](https://github.com/crafactory/engine/actions/runs/38217336127), [three-platform builds](https://github.com/crafactory/engine/actions/runs/38217336320) and [separate two-mode corpus](https://github.com/crafactory/engine/actions/runs/38217330367) passed; these do not satisfy the still-open latest-head review gate by themselves.

The full review of `e6bb66e489f00962b37d1529345e4f3b08215e3b` identified code-handler failure leaving an empty replacement container. The next candidate restores the original pre node before propagating either synchronous throw or asynchronous rejection, with two direct registry units independent of host rerender. It also documents lifecycle fixture hooks and the renderer failure callback after the expanded 36-function report still showed 75%, below the unchanged 80% gate. CodeRabbit auto-paused after multiple reviewed commits; review is explicitly resumed rather than bypassed. Final candidate inventory is 109 entries/44 bounded checkpoints, with 542 units and unchanged 36 browser/43 native cases; latest execution, review and publication results belong in the PR.

The completed review of `372391d2a358f173c6cf3c4ddcfd46984754eed9` confirmed no actionable merge-blocking risk or retained architecture concern, and the code-block finding thread was resolved. Its docstring check was still 77.78% over 36 functions; this warning continued to block merge despite [green PR CI](https://github.com/crafactory/engine/actions/runs/38219692904), [three-platform builds](https://github.com/crafactory/engine/actions/runs/38219692850) and [pinned two-mode corpus](https://github.com/crafactory/engine/actions/runs/38219693909). Documentation now explicitly covers the compatibility runtime entry and Component event/interval/DOM ownership methods, pending the next unchanged-threshold check. No functional changes are introduced by this documentation-only follow-up.

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
