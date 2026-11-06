# Verification results

> **Scope:** this is a chronological evidence log, not the current support matrix. Older
> sections preserve the counts and boundaries at the time they were recorded. For current
> plugin status see [PLUGIN-SUPPORT-MATRIX.md](PLUGIN-SUPPORT-MATRIX.md); for API boundaries
> see [PLUGIN-COMPATIBILITY.md](PLUGIN-COMPATIBILITY.md).

## Shared-code Android and expanded plugin controls

[PR #76](https://github.com/crafactory/engine/pull/76) adds an actual APK/native WebView
gate, not responsive-browser certification. Its first complete
[nine-group native run](https://github.com/crafactory/engine/actions/runs/42184825123)
on `a448d11` records API35 Pixel6/WebView 124.0.6367.219, exact real InputConnection
Chinese composition and keyboard/Back, native note/binary overwrite/restart, decoded asset
replacement, history/long names, drawers/rotation/worker/renderer/modal/ribbon, unchanged
Style Settings, save failure/root-Back recovery, autosave-isolated background persistence,
restart data/renewed trust, actual chooser/ZIP/dot-asset bytes, no broad storage permissions
and release exclusion of the owned debug IME. Missing-path probes and the deliberately
induced persistence failure remain in logs; this is not a claim of zero console output.

Visual review of that passing run found a red error on normal share cancellation and
overlapping settings tabs. Follow-up native assertions demand no error after chooser
cancellation and labels contained inside non-shrinking buttons. Unit tests handle only
the exact observed Android cancellation, preserve genuine share errors and leave cache
write/permission checks outside that exception. A browser CSS regression uses native
touch-target minima plus an explicit old-flex-shrink negative control; it is not native
runtime evidence. The final PR head must pass these strengthened native gates.

The frozen pre-visual-follow-up `fcd3b9d` runtime passed 911 units/56 files, 70 browser,
104 Electron including all 22 unchanged corpus cases without skips, and 23 vault cases
against the actual Linux package, sequentially with isolated output directories.
The visual follow-up raises units to 915/56; all browser/desktop/package regressions
and final-head Verify, three-platform packaging, native Android and independent corpus
remain mandatory merge gates. See the current PR checks for their exact-head results.
Effective CodeRabbit review `5796771964` produced 11 findings, all repaired and resolved;
additional optional reviews are not chased after that effective review/fix round.

The single [support matrix](PLUGIN-SUPPORT-MATRIX.md) separates five-control desktop
Style Settings from its three-control mobile workflow and retains Excalidraw/core Canvas,
authenticated/conflicted Git and Copilot secrets/inference gaps. [ANDROID.md](ANDROID.md)
contains the framework comparison, private-vault/uninstall/debug-signature warnings and
remaining SAF, backup, installer, signing, device/keyboard and iOS exclusions.

## Live Editing geometry, rendering and native assets

The 2026-11-06 PR #75 increment starts from merged PR #74 and uses original host
regressions, not upstream plugin implementation. Its negative baselines reproduce
186px of table column redistribution, inline-image DOM replacement during prose edits,
unchanged diagram replacement on external-note refresh, 750px of excess table overflow
after resizing an open cell, missing sanitized Mermaid labels, invalid root-note image
paths and a decoded image remaining at 24px after the asset changed to 48px.

Fixes retain measured cell geometry and mapped image ownership, reflow the active edit
grid on container resize without committing its draft, keep source-only contributions
mounted across unrelated document refreshes, emit native SVG text under unchanged mandatory
sanitization, preserve native path guards and selectively invalidate changed image assets
from size/mtime snapshots. Unchanged images retain DOM; real diagram source changes and
external transclusions still update. This is not a guarantee that legitimate content,
font or viewport changes never alter layout, nor a complete image-path/asset-watch contract.

Frozen local acceptance passed:

- 869 unit tests across 49 files, TypeScript and the production build.
- All 70 browser cases, including six new Live stability cases at 1440px/390px,
  unchanged diagram identity/geometry, source ownership, draft-preserving container resize,
  external transclusion refresh and actual rendered-label/source invalidation.
- All 104 Electron cases, with all 22 hash-pinned Worker/renderer corpus scenarios
  executed and no skips. Passing a boundary test is not plugin feature compatibility.
- All 23 vault cases against a newly built actual Linux executable, including decoded
  local asset bytes, geometry/identity continuity, bare/`./`/root image references, changed
  bytes refreshing while an unrelated decoded image retains DOM, and exact persisted text.

The [initial effective CodeRabbit review](https://github.com/crafactory/engine/pull/75#pullrequestreview-5796123711)
identified the label and container-resize defects; both were repaired with original
negative/positive regressions, without weakening sanitizer or storage boundaries.
Exact-head cloud gates and final review resolution are recorded in
[PR #75](https://github.com/crafactory/engine/pull/75). Windows/macOS packages remain build
checks, not native runtime acceptance. Android is a subsequent increment, not evidence
from these responsive browser screenshots. No broader external-plugin verdict is promoted
by this editor-only increment.

## Historical multi-plugin gaps and Kanban pointer persistence

On 2026-11-05 UTC, implementation `e2eddc25eebc44fd107b18aa5266f1f1e021fb05`
in [PR #74](https://github.com/crafactory/engine/pull/74) passed inventory validation,
869 units across 49 files, TypeScript/production build, all 64 browser tests and all
102 Linux Electron desktop tests. All eleven Worker and eleven renderer corpus cases
executed without skips. Reports were regenerated only from the fresh complete
`/tmp/engine-gaps-accept2-{worker,renderer}` pair. Renderer outcomes are nine clean
bounded passes, one bounded pass retaining only the known Excalidraw core Canvas
refusal, and Copilot startup with errors. Worker refusals are negative evidence.

The unchanged Tasks bundle now queries/completes/refreshes without the former private
property-type-manager error. Original contracts also verify live inferred properties,
validated profile-local vault-keyed overrides, case-insensitive lookup and restart
persistence. This is not types.json or a complete property editor.

The unchanged Style Settings bundle parses original documented fixture CSS, exposes
class-toggle/variable-text/variable-select/variable-number/variable-number-slider controls,
changes computed CSS, saves exact plugin JSON, filters/clears search and restores all five
controls, effects and values after application restart. Real range Home/ArrowRight input
exposed the missing public `SliderComponent.setDynamicTooltip`; its implementation updates
live tooltips without replacing controls.
Host-owned Component children no longer collide with plugin-owned configuration trees.
Other settings kinds, import/export and theme/snippet management remain unverified.

The unchanged Kanban bundle now creates/edits a card through actual embedded editors,
opens reachable board settings, enables completion checkboxes, completes the card,
creates another list and moves the card using real frame-paced mouse input. Assertions
check section ownership, checked Markdown, persisted configuration and byte-identical
saved data across document switch and application restart/re-enable/reopen.
After-connected insertion notification registers real drag hitboxes; public Node.detach
cleans up dragged DOM. Neither missing registration nor cleanup errors are allowed.
Other card/list ordering, movement/conversion and cross-plugin integrations are not certified.

Eleven targeted cases also pass against the actual Linux packaged executable at
`/tmp/engine-gaps-package/linux-unpacked/crafactory-engine`, including these three plugins
and eight host contracts. Cross-window chained factories, viewless event type checks,
insertion notification/once/cancellation, text/element detach, search/extra/date settings,
large modal reachability, property restart and actual owned suggestions are covered.
This is Linux runtime acceptance, not native Windows/macOS, installer or release acceptance.
Public renderer export inventory rises to 72 bounded symbols; counts are not compatibility.

Negative evidence is retained: unchanged PR #73 fails the search/property/event,
DOM/modal and insertion/factory/event assertions, while an isolated original child-tree
lifecycle regression also fails against that baseline. A fluent-component harness return
caused a then-assimilation hang; it was corrected without claiming a product deadlock.
A #private-field candidate broke guarded receivers and was replaced with symbol-backed
ownership. A card editor selector initially targeted the new-card composer; a later
candidate completed the Kanban workflow but reported missing detach during cleanup.
The preliminary desktop1 run overlapped runtime changes and was not used for final
acceptance or report generation.

The [initial effective CodeRabbit review](https://github.com/crafactory/engine/pull/74#pullrequestreview-5781526190)
covered `6fab5fb`. Both actionable findings and the viewless-event follow-up were repaired
with original regressions in `e2eddc2`, and both finding threads were resolved.
The [single incremental re-review request was rate limited](https://github.com/crafactory/engine/pull/74#issuecomment-6653128941);
no optional review loop was pursued under the maintainer-authorized policy.
Exact final-head Verify, three-platform packaging and the separate pinned-corpus workflow
remain independent merge gates, recorded in the PR's final acceptance checkpoint.
The narrow accepted binary rename recreation risk, native profile-wide trust boundary,
core Canvas refusal and Copilot secret-storage limitation remain unchanged.

## Kanban cards, DOM ownership and focused editor routing

On 2026-11-04 UTC, the original host changes in [PR #73](https://github.com/crafactory/engine/pull/73)
passed inventory validation, 866 units across 49 files, TypeScript/production build, all 64
browser tests and all 95 Electron desktop tests. All eleven pinned Worker and eleven renderer
cases executed without skips. Both published reports were regenerated exclusively from
`/tmp/engine-pr73-complete-{renderer,worker}`. Renderer outcomes are seven bounded passes,
two bounded passes with errors, one startup with errors and one startup-only observation.
Worker refusals remain negative evidence. The existing bundle-size warning remains.

The unchanged Kanban input now creates an unchecked card, saves its exact Markdown, switches
documents and survives application restart/re-enable/reopen with the visible saved card.
The complete run records no Kanban runtime or console errors; the outcome ratchet no longer
permits the old `has`/`setTimeout` failures. This does not establish completion, later editing,
list/card movement, pointer dragging, conversion or cross-plugin integration.

Original regressions cover eighteen Node/UIEvent document/window ownership checks, actual
focus and timer behavior, foreign window/document targets, detached documents and no
Object.prototype pollution. Another regression replaces selected embedded text through the
actual command palette while preserving the native file, then checks file-switch
invalidation, retired editor assignments and foreign-object rejection. These same two
regressions and the real Kanban workflow pass against the actual Linux packaged executable
at `/tmp/engine-pr73-package/linux-unpacked/crafactory-engine` (three tests). This is bounded
Linux runtime acceptance, not native Windows/macOS or installer/release acceptance.

The ownership regression fails against the unchanged packaged PR #72 executable, recorded in
`/tmp/engine-pr73-focus-baseline.log`. Earlier candidates exposed read-only activeEditor,
optional-delegate TypeScript, a harness variable typo and an obsolete expected-error ratchet;
those failed runs remain separate from acceptance. An initial packaged command selected a
nonexistent `engine` filename and all three cases failed to launch with ENOENT; the corrected
command selects `crafactory-engine` and passes. The failed invocation is not a product result.
Logs are `/tmp/engine-pr73-complete-{check,browser,desktop}.log`,
`/tmp/engine-pr73-packaged-{desktop,acceptance}.log` and `/tmp/engine-pr73-focus*-*.log`.

The enabled-plugin Set is lifecycle-owned and own-runtime only, including cleanup on failed
construction/startup and throwing shutdown. Embedded focus routing is also scoped to its
owning runtime; it is not shared plugin discovery or cross-plugin editor context. Native
profile trust and the previously accepted binary publication race are unchanged.
Use the PR for effective review, exact-head cloud checks and merge state; these local
results do not claim those external steps have completed.

The [effective CodeRabbit implementation review](https://github.com/crafactory/engine/pull/73#issuecomment-6621975902)
completed successfully on `0a84173` with no actionable comments and no established blocking
defect. Later changes only align reports/documentation. Automatic review of those later
commits is skipped because the repository has fewer than ten stars; no optional manual
repeat is requested under the maintainer's bounded-review instruction. This completed
review is not a claim of formal GitHub approval or a substitute for exact-head cloud checks.

## Third-review recovery, stylesheet identity and trust-profile repairs

On 2026-11-04 UTC, the completed review of `ead4e7a` identified four further inline
correctness findings and a stylesheet path-swap follow-up. The repaired Linux source
passes inventory validation, 860 units across 49 files, production build, 64 browser tests
and all 93 Electron desktop tests. All eleven pinned Worker and eleven pinned renderer
inputs executed with no skips. Both reports were regenerated exclusively from
`/tmp/engine-pr72-round3-complete-{renderer,worker}`; classifications and known plugin errors
remain bounded, not upgraded to full compatibility. The existing bundle-size warning remains.

Four new actual Electron regressions all fail on unchanged `ead4e7a`: filesystem failure
loses the overlay registration, an earlier unload discards a later changed draft, merge uses
old destination content, and an open trust panel does not observe an external confirmed
profile update. All four pass after repair and against the actual Linux packaged executable.
A separate packaged CSS loading/ownership/cleanup regression also passes. The existing
startup-false and startup-true trust tests additionally cover both switches diverging,
reverting one while retaining the other's notice, then reverting the other. Pure recovery
tests verify attempts continue across owner/recovery errors and retain the original failure.

Seven isolated child-process stylesheet tests cover ordinary content, oversized rejection
before content reads, concurrent growth, final symlink replacement, descriptor-identity
rejection even when final no-follow flags are deliberately bypassed in the harness, a parent
swap before entering, and an ancestor replacement after entering. The reader compares
lossless file identities and rejects missing inode identities; symlinked config/package/style
paths are unsupported. On Windows, an OS refusal to rename an entered cwd is an accepted
safe outcome with no content read. These tests secure this reader, not the entire vault API
or trusted native plugins. Windows/macOS packaging is not native runtime/security acceptance.

Logs are `/tmp/engine-pr72-round3-{check-final,browser,desktop-full,baseline-desktop,packaged-desktop,packaged-css}.log`.
The earlier repair candidate passed 858 units but failed TypeScript on an optional captured
leaf ID; it was not accepted. The repaired failure path retains explicit IDs and leaves
implicit extension views implicit. Nine targeted desktop cases passed before the later
full run and additional recovery-error assertions; those partial results do not replace
the complete 860/64/93 evidence.

The maintainer's accepted binary final-check-to-rename recreation window remains unchanged,
not repaired. A subsequent instruction explicitly prioritizes early PRs, frequent commits
and one or two effective Review + Fix rounds: after effective review, review-service
unavailability alone need not block merge when no known blocking issue remains and exact-head
required checks pass. CONTRIBUTING records the revised policy. Use the PR for current cloud
checks, consolidated re-review and merge state; this local evidence does not claim those
external steps have completed.

## Native profile, drawing, board and Git increment

On 2026-11-03, the complete Linux x64 candidate passed inventory validation, 838 unit tests
across 47 files, TypeScript/production build, all 64 browser tests and all 79 Electron desktop
tests. The desktop run included all eleven unchanged, hash-pinned upstream inputs in each of
Worker and renderer mode; none of those corpus cases was skipped. Build output retained the
existing large-chunk warning. This is source-runtime evidence, not installer/release or native
Windows/macOS acceptance.

The renderer report contains six `BOUNDED_WORKFLOWS_PASS`, three
`BOUNDED_WORKFLOWS_WITH_ERRORS`, one `STARTUP_WITH_ERRORS` and one `STARTUP_ONLY` outcome.
All eleven default Worker inputs still refuse startup. Exact inputs, grants, timestamps,
workflow assertions and runtime/console diagnostics are retained in
[renderer evidence](compatibility/renderer-community-results.json) and
[Worker evidence](compatibility/community-results.json), generated from one complete run per
mode rather than mixed probes. The current tracker is
[PLUGIN-SUPPORT-MATRIX.md](PLUGIN-SUPPORT-MATRIX.md).

The explicit native profile test verifies default refusal, both cancellation layers,
restart-based grant/revocation, real bytes outside a disposable vault, a Git subprocess,
package-relative CommonJS loading, concurrent preference updates and rollback on write failure.
The profile grants every renderer script OS-user filesystem/process/credential/network access;
it is not per-plugin isolation. Test processes use allowlisted environments and temporary
homes, not OS filesystem containment. Defaults retain context isolation, sandboxing and no Node
integration; the Xvfb launcher's `--no-sandbox` means these runs do not certify OS sandbox
enforcement. See [native permissions](NATIVE-PLUGIN-PERMISSIONS.md).

Excalidraw acceptance draws a real rectangle through pointer input, checks actual file save,
switches documents, restarts the application, re-enables the plugin and reopens the exact
element identity/dimensions. Its private Obsidian core Canvas integration still rejects.
Git acceptance stages the real index, makes a specific-message commit, pushes to a local bare
remote and pulls a peer commit into the actual editor. Kanban creates and persists a board/list,
switches/restarts/reopens it, but card submission still reports undefined `has`, and focus
reports undefined `setTimeout`; negative acceptance checks that no card was saved. Tasks retains
its property-type error, and Copilot initialization reaches unsupported secret storage.
These are bounded observations, not full-feature compatibility.

An earlier complete candidate had 75 desktop passes and three failures: Templater exposed
legacy CM5 configuration/specification, state-copy and stream-advancement gaps; Excalidraw's
harness dragged before the rectangle tool finished activating; Tasks' retained property-type
error required an explicit with-errors outcome instead of a clean workflow pass. Original CM5
repairs, active-tool synchronization and accurate outcome classification preceded the complete
passing run. The additional CM5 regression fixture is included in the final 79 cases.

The final-source CodeRabbit review and cloud checks are separate merge gates, not established
by these local results. Authentication/signing/hooks/conflicts, additional drawing tools/export/
embedding, Kanban cards/completion/moves, arbitrary plugin leaf-state restoration, installed
reference differential testing and native Windows/macOS/mobile remain unverified or unsupported.

The initial PR head's [macOS package job](https://github.com/crafactory/engine/actions/runs/41682345882/job/126078993105)
failed before packaging: a new Keymap unit assertion hard-coded Control as Mod. The fixture now
explicitly exercises Mac/Meta, Windows/Control and Linux/Control, including refusal of the other
modifier, without changing product behavior. That failed cloud job is not a macOS build pass.

The first full [CodeRabbit review](https://github.com/crafactory/engine/pull/72#pullrequestreview-5756869972)
completed on `0a472a4` with sixteen inline findings and two follow-up findings in the review body.
The review-repair candidate stages binary overwrites before rename/link, checks actual stylesheet
bytes, enforces one profile writer, catches unsafe-eval persistence errors, flushes/recreates
renamed/trash views, cancels layout saves before vault switching, removes stale same-leaf
registrations, rejects lifecycle-flag mutations, rolls back synchronous rejected editor
mutations, matches delegated once handlers before consuming them, resolves string-backed files,
preserves input against late embed reads, keeps Scope.keys identity, captures the requested
Markdown save path, isolates native Git configuration, and asserts card absence after restart.
The report generator now shows positive bounded workflows together with retained blockers, and
the support matrix distinguishes default versus native Node behavior.

Repair regression coverage includes injected partial temporary-file write failures preserving
original attachment bytes and cleaning debris; a growing stylesheet; lifecycle bypass attempts;
reading-mode editor rollback; queued save/navigation; live key-array mutation; unmatched delegated
once events; late reads after typing and clearing; same-leaf reuse; pending text saved before
rename/trash; second-process refusal; both preference rollback paths; and a real native vault
switch with initialization delayed across the old layout debounce. Two initial layout-fixture
attempts failed because Playwright's main-process VM supplies neither CommonJS require nor a
dynamic-import callback; the fixture uses Electron's Node builtin-module accessor instead.
These harness failures are distinct from the product fix and are not counted as passes.

A first complete repair run had 82 desktop passes and one failed rename assertion: the fixture
read the destination before the asynchronous rename completed, while its value assertion still
matched the old input. The fixture now waits for the destination file and recreated active
plugin view before checking bytes. That run also exposed a Kanban startup regression from an
overly strict `_loaded` setter; its generic diagnostic case passed despite losing the established
board/list workflow. That candidate is not accepted evidence. Redundant lifecycle assignments
are now no-ops without writing host state, state-changing assignments still reject, and the
corpus explicitly prevents previously verified bounded workflows from downgrading to startup
refusals. Final reports must come from a new complete pair of corpus directories.

The corrected review-repair candidate passed inventory, 841 unit tests across 47 files,
TypeScript/production build, all 64 browser tests and all 83 desktop tests, including all
22 pinned corpus cases without skips. The rename/trash regression also passed three consecutive
targeted repetitions. Logs are `/tmp/engine-pr72-repairs-final-check.log`,
`/tmp/engine-pr72-final-browser.log`, `/tmp/engine-pr72-final-desktop.log` and
`/tmp/engine-pr72-rename-repeat.log`. Reports were regenerated exclusively from
`/tmp/engine-pr72-final-renderer` and `/tmp/engine-pr72-final-worker`; the outcome distribution and
remaining compatibility boundaries are unchanged from the accepted initial candidate.
This local result does not establish completion of the separate latest-head review/CI gates.

During the re-review quota wait, the repaired unit fixtures were run against the unchanged
pre-repair implementation `0a472a4` in a disposable worktree: six expected failures and 54
passes across the same three unit files. Four current desktop fixtures against that baseline
gave three expected failures (late embedded reads, pending cross-vault layout writes, and
file-specific rename/trash) and one pass (same-leaf reuse). The passing same-leaf UI fixture
therefore is coverage, not a detector of the stale-registration bug. The host's registration
update was extracted into a pure internal helper with direct tests for moving only the matching
owner/leaf and ignoring stale/foreign close notifications. Baseline logs are
`/tmp/engine-pr72-review-baseline.log.gz`, `/tmp/engine-pr72-review-baseline-build.log` and
`/tmp/engine-pr72-review-baseline-desktop.log`; the disposable worktree was removed afterward.

The next full desktop candidate had 82 passes and one Excalidraw restart failure exposing
`MarkdownView.currentMode` while the fixture reopened a drawing without awaiting enable
completion. The Excalidraw and Kanban restart fixtures now wait for the checked enable control,
which is published only after `controller.ready`, before leaving Settings and reopening.
Excalidraw then passed three consecutive complete draw/save/restart/reopen repetitions.
The unsupported private Markdown-mode surface is not implemented or certified by that result.

The final strengthened source passed inventory, 843 units across 48 files, build and all 64
browser cases (`/tmp/engine-pr72-leaf-{check,browser}.log`); all 83 desktop cases, including all
22 pinned corpus cases, then passed without skips (`/tmp/engine-pr72-reviewed-desktop.log`).
Final reports use only `/tmp/engine-pr72-reviewed-renderer` and
`/tmp/engine-pr72-reviewed-worker`. The repeated Excalidraw log is
`/tmp/engine-pr72-restart-repeat.log`. This supersedes the earlier 841-unit repair checkpoint,
not the retained historical failures, and still does not replace completed latest-head review.

## Maintainer acceptance of the binary publication race

On 2026-11-04 the maintainer explicitly accepted the narrow final-check-to-rename deletion
race from [finding 4458871645](https://github.com/crafactory/engine/pull/72#discussion_r4458871645)
and requested another completed CodeRabbit review, merge if otherwise clean, then the next
plugin increment. No complex storage rewrite or truncate-in-place fallback was authorized.
The existing checks and staged-write protection remain unchanged. A new deterministic unit
injects deletion immediately before target rename, verifies that modify recreates the target
with the staged bytes and cleans temporary files. This is characterization of accepted
behavior, not a fix or cross-process conditional-write guarantee.

The unresolved/blocker language in the earlier checkpoint below records the decision before
this acceptance. It no longer blocks merge by itself; other findings, completed latest-head
review and latest-head CI still must satisfy CONTRIBUTING.

## Second native-increment review repairs

The [completed review of `64b89c2`](https://github.com/crafactory/engine/pull/72#pullrequestreview-5757536733)
reported seven inline findings and two body follow-ups. The next candidate bounds stylesheet
reads through a handle before allocating; honors explicit same-file leaf activation; publishes
activation overrides only after successful host open; prepares and seals every owner's drafts
before retiring any file view; suppresses host-owned repeat saves after sealing; includes the
latest plugin draft when constructing merge content; derives both trust restart notices from
saved versus startup-active values; and makes asynchronously rejected Editor instances stale
while preserving the rejection for settle.

The repaired source passed inventory, 850 units across 48 files and TypeScript/production build
(`/tmp/engine-pr72-round2-final-check.log`), with the existing large-chunk warning. All 64 browser
cases passed (`/tmp/engine-pr72-round2-complete-browser.log`). Six new desktop regressions passed
together (`/tmp/engine-pr72-round2-targeted2.log`). The complete desktop suite passed all 89 cases
(`/tmp/engine-pr72-round2-complete-desktop.log`), including all 22 pinned corpus cases with none
skipped. Both reports were regenerated exclusively from the new complete pair
`/tmp/engine-pr72-round2-complete-renderer` and `/tmp/engine-pr72-round2-complete-worker`:
11 renderer outcomes plus 11 default-Worker refusals. Plugin classifications remain bounded,
including the same Kanban card/focus errors and Excalidraw core-Canvas refusal.
Those same six tests on unchanged `64b89c2`
produced five expected failures and one pass: both restart-reversion cases, exact earlier-leaf
identity, pending merge content and repeated retirement saves detected the old behavior; the
initial-save failure retention case already passed and is retained as coverage, not proof of
that repair. Baseline logs are `/tmp/engine-pr72-round2-baseline{,-build}.log`; its disposable
worktree was removed.

An initial repair unit fixture incorrectly supplied a plugin-prefixed command ID to the raw-ID
runtime harness (849 passes, one failure). Its corrected invocation passes. The first six-case
desktop probe had five passes and one harness failure because link resolution ran immediately
after create, before the next host metadata snapshot. The fixture now waits for the actual
explorer entry and opens through that UI. Neither failed probe supplies corpus-report rows.

Binary finding [4458871645](https://github.com/crafactory/engine/pull/72#discussion_r4458871645)
is still unresolved. A second regular-file/device/inode check catches deletion during staging,
and its regression passes, but cannot make rename atomically require an existing target.
The explicit local injection `/tmp/engine-pr72-binary-final-race.mjs` deleted the target after
the final stat and immediately before rename; modify returned success and recreated it with
the replacement bytes. This is a reproduced limitation, not hypothetical race coverage or a
resolved review finding. Reverting to truncate-in-place would reintroduce the earlier binary
data-loss issue. Passing finite plugin workflows does not make this candidate merge-ready.

## Narrowed default CSP

This section records removing the default-entry `wasm-unsafe-eval` relaxation left over from
Templater startup work.

| Check | Observed result | Scope |
|---|---|---|
| `npm run check` | 824 passed (43 files); inventory and build passed | Includes two CSP source tests |
| `npm run test:e2e` | **64 passed / 0 failed** | Browser flows |
| `npm run test:desktop` (macOS) | **42 passed / 1 failed / 10 skipped** | New WebAssembly case; known pre-existing CommonJS Control-selection failure; corpus skipped without inputs |
| Desktop WebAssembly check | Default entry throws `CompileError` under CSP; trusted entry compiles | Minimal empty module `[0,97,115,109,1,0,0,0]` |

`index.html` now uses `script-src 'self' blob:`. `trusted.html` retains
`script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'`. Source tests assert both directives,
and desktop tests exercise the actual entries: the default entry refuses WebAssembly compilation
and JS eval, while the opt-in trusted entry allows both after restart. This does **not** claim
default-entry WebAssembly support; no default-entry plugin currently has a verified
WebAssembly-only workflow. Templater still requires the trusted entry and remains
`STARTUP_ONLY`.

## Templater create note from template

This section records the second bounded Templater workflow.

| Check | Observed result | Scope |
|---|---|---|
| `npm run check` | 826 passed (43 files); inventory and build passed | New available-path and leaf cases |
| `npm run test:e2e` | **64 passed / 0 failed** | Browser flows |
| `npm run test:desktop` (macOS) | **42 passed / 1 failed / 10 skipped** | Known pre-existing CommonJS Control-selection failure; corpus skipped without inputs |
| Pinned Templater `2.26.0` corpus (macOS) | **BOUNDED_WORKFLOWS_PASS** | Insert, create-note, exact persistence, disable/re-enable |
| Pinned Templater `2.26.0` corpus (Linux) | Not rerun in this change | Checked-in result remains the previous `STARTUP_ONLY` run |

The corpus now runs **Create new note from template**, selects `Templates/Create`, and asserts
that `Untitled.md` opens with the exact template content and persists to disk. It then continues
to the existing insert/re-enable checks.

The first blockers removed for create-note were `Vault.getAvailablePath`, `Workspace.getLeaf(false)`
and the leaf operations `openFile`/`setEphemeralState`. The reusable leaf routes `openFile` to the
existing host open primitive; it is not a reference tab/leaf tree.

Create-note originally logged a non-fatal internal `this.update` error. Adding the missing
declarative settings base `update()` removed it; the Templater corpus now asserts no page errors
for the combined settings/insert/create-note workflow.

## Calendar view and daily note

This section records the first bounded Calendar workflow.

| Check | Observed result | Scope |
|---|---|---|
| `npm run check` | 829 passed (43 files); inventory and build passed | New `moment`, link-map, daily-note and view cases |
| `npm run test:e2e` | **64 passed / 0 failed** | Browser flows |
| `npm run test:desktop` (macOS) | **44 passed / 0 failed / 10 skipped** | Includes reusable-leaf/exact-path case |
| Pinned Calendar `2.0.0-beta.2` corpus (macOS) | **BOUNDED_WORKFLOWS_PASS** | Open view + create today's daily note + exact content/open |
| Pinned Calendar `2.0.0-beta.2` corpus (Linux) | Not rerun in this change | Checked-in result remains the previous `STARTUP_ONLY` run |

The corpus opens the Calendar view from the command palette, clicks today, confirms
**New Daily Note**, and verifies `Daily notes/YYYY-MM-DD.md` matches the configured folder/template
(`# YYYY-MM-DD\n\n`) and opens with the date as the note title. The Templater corpus and this
Calendar corpus both assert no page errors. The corpus dismisses the command palette explicitly
after **Open view**; palette auto-close for plugin view commands remains a follow-up.

The blockers removed were Obsidian's untyped globals and Daily Notes view plumbing: `moment`,
`window.app`, a production-only `process.env` shim, `app.isMobile`, `app.plugins.getPlugin`, a
synthetic `daily-notes` internal plugin, `app.foldManager`, `Workspace.getUnpinnedLeaf`/
`activeLeaf`, `FileView`, `metadataCache.getCache(path)` and derived
`resolvedLinks`/`unresolvedLinks`. CodeRabbit follow-ups were also fixed: daily-note settings are
read at call time, `getCache(path)` returns null for missing paths, `window.app` is released when
its owning runtime stops, and `activeLeaf` is registered before reveal. Week numbers, other
dates/navigation, context menus, Calendar settings, mobile behavior and a real multi-leaf
workspace remain unverified.

## Advanced Tables formatting

This section records the first bounded Advanced Tables workflow.

| Check | Observed result | Scope |
|---|---|---|
| `npm run check` | 829 passed (43 files); inventory and build passed | No code change required for this workflow |
| `npm run test:e2e` | **64 passed / 0 failed** | Browser flows |
| `npm run test:desktop` (macOS) | **44 passed / 0 failed / 10 skipped** | Includes reusable-leaf/exact-path case |
| Pinned Advanced Tables `0.23.2` corpus (macOS) | **BOUNDED_WORKFLOWS_PASS** | Format table at cursor + exact persistence |
| Pinned Advanced Tables `0.23.2` corpus (Linux) | Not rerun in this change | Checked-in result remains the previous `STARTUP_ONLY` run |

The corpus opens an unformatted table, runs **Advanced Tables: Format table at the cursor** from
the command palette, and verifies the exact padded table in both the editor and `Test.md`.

Exploratory probing found that switching to source mode and moving the cursor before the same
command produced `Advanced Tables: Command unavailable`. Live mode is the verified configuration.
Navigation, row/column edits, sorting, formulas, source-mode behavior and CM5/CM6 edge cases
remain unverified.

## Templater user scripts

This section records user-script loading and invocation after restart.

| Check | Observed result | Scope |
|---|---|---|
| `npm run check` | 829 passed (43 files); inventory and build passed | No new unit gate; corpus covers the workflow |
| `npm run test:e2e` | **64 passed / 0 failed** | Browser flows |
| `npm run test:desktop` (macOS) | **44 passed / 0 failed / 10 skipped** | Includes reusable-leaf/exact-path case |
| Pinned Templater `2.26.0` corpus (macOS) | **BOUNDED_WORKFLOWS_PASS** | User script + startup + settings + insert + create-note + re-enable |
| Pinned Templater `2.26.0` corpus (Linux) | Not rerun in this change | Checked-in result remains the previous `STARTUP_ONLY` run |

The corpus sets **User scripts folder** to `Scripts`, creates `Scripts/hello.js` exporting
`async () => "User script output"`, restarts and re-enables Templater, then inserts
`Templates/UserScript.md` containing `<%* tR += await tp.user.hello() %>`. The editor and exact
`Test.md` bytes gain `User script output`.

No new compatibility blocker was required: the existing `.js` vault read and trusted-renderer
execution path was sufficient. This covers one exported function; other exports and startup hooks
remain unverified, and it does not imply shell/system support.

## Templater startup templates

This section records startup-template execution after restart.

| Check | Observed result | Scope |
|---|---|---|
| `npm run check` | 829 passed (43 files); inventory and build passed | New `App.fileManager.renameFile` case |
| `npm run test:e2e` | **64 passed / 0 failed** | Browser flows |
| `npm run test:desktop` (macOS) | **44 passed / 0 failed / 10 skipped** | Includes reusable-leaf/exact-path case |
| Pinned Templater `2.26.0` corpus (macOS) | **BOUNDED_WORKFLOWS_PASS** | Startup template + settings + insert + create-note + re-enable |
| Pinned Templater `2.26.0` corpus (Linux) | Not rerun in this change | Checked-in result remains the previous `STARTUP_ONLY` run |

The corpus enables **Enable startup templates**, adds `Templates/Startup.md` to the startup list,
restarts the app, re-enables Templater, and verifies the template's
`tp.file.create_new("Startup created", "StartupCreated", false)` creates `StartupCreated.md`
with the exact content.

The first blocker was `App.fileManager`. A bounded `renameFile` now routes through
`Vault.rename`; the startup template itself uses `tp.file.create_new`, which exercises the
existing `getAvailablePath` and `create` paths. It passes `open_new=false`, so the new note is
created but not opened. This does not establish arbitrary startup
hooks, user scripts or shell/system functions.

## Templater declarative settings persistence

This section records the Templater settings workflow and the declarative settings API it needs.

| Check | Observed result | Scope |
|---|---|---|
| `npm run check` | 828 passed (43 files); inventory and build passed | Includes CodeRabbit regression cases |
| `npm run test:e2e` | **64 passed / 0 failed** | Local port 5173 was occupied by an unrelated Vite server; rerun with an equivalent config on 5174 |
| `npm run test:desktop` (macOS) | **44 passed / 0 failed / 10 skipped** | Includes reusable-leaf/exact-path case; corpus skipped without inputs |
| Pinned Templater `2.26.0` corpus (macOS) | **BOUNDED_WORKFLOWS_PASS** | Text/toggle/dropdown/list + dangerous-confirmation/local settings + insert + create-note + re-enable |
| Pinned Templater `2.26.0` corpus (Linux) | Not rerun in this change | Checked-in result remains the previous `STARTUP_ONLY` run |

The former macOS-only CommonJS Control-selection failure was a test-binding bug:
`Control+Home`/`Control+Shift+End` is not the macOS select-to-end binding. Switching the test to
`ControlOrMeta+a` fixed it; the full desktop suite now passes on macOS with 43 passed, 0 failed
and 10 corpus skips.

CodeRabbit review findings were also fixed with regressions: `save` is restricted to the active
note; `getAvailablePath` compares candidates case-insensitively; `MarkdownView.save` waits for
queued editor edits; failed browser-storage writes remain visible in memory; leaf `openFile`
passes an exact path instead of parsing link text; and the reusable leaf is registered for
reveal/dispose.

Templater 2.26 uses Obsidian's declarative settings API: its `display()` is empty and its
`getSettingDefinitions()` returns groups, pages, controls and lists. The first blocker was an
empty settings tab because the base class did not render those definitions. The bounded renderer
now handles toggle/dropdown/text/number/folder controls, list add/delete, group/page headings,
descriptions and `visible` predicates. It also required global `createEl`/`createDiv`/`createSpan`
helpers, DocumentFragment DOM helpers, `Array.prototype.contains`, and a base `update()`.

The corpus changes **Template folder location** to `Templates`, enables **Automatic jump to
cursor**, selects **User script intellisense** value `4`, cancels and then confirms the dangerous
**Trigger Templater on new file creation** warning (acknowledgement checkbox included), adds a
**Template hotkey** and deletes it, verifies the exact `data.json` and `templater-local-settings`
values, restarts the app, re-enables Templater, and verifies the text/toggle/dropdown/local values
and the persisted list item before deleting it. It then runs the insert/create-note workflows.
This is not full settings navigation/search, list reordering, other dangerous settings or
validation-equivalence coverage.

## Templater template insertion

This section records the first bounded Templater workflow beyond startup.

| Check | Observed result | Scope |
|---|---|---|
| `npm run check` | 825 passed (43 files); inventory and build passed | New App storage, `Editor.getDoc` and save cases |
| `npm run test:e2e` | **64 passed / 0 failed** | Browser flows |
| `npm run test:desktop` (macOS) | **42 passed / 1 failed / 10 skipped** | Known pre-existing CommonJS Control-selection failure; corpus skipped without inputs |
| Pinned Templater `2.26.0` corpus (macOS) | **BOUNDED_WORKFLOWS_PASS** | Insert template, exact persistence, disable/re-enable |
| Pinned Templater `2.26.0` corpus (Linux) | Not rerun in this change | Checked-in result remains the previous `STARTUP_ONLY` run |

The corpus workflow creates `Templates/Template.md`, enables Templater in the trusted renderer,
runs **Open insert template modal** from the command palette, selects `Templates/Template`, and
asserts both the editor text and exact `Test.md` bytes (`Original textTemplate body`). It then
disables and re-enables the plugin and verifies the command is registered again.

The first blockers removed were `App.loadLocalStorage`, `Editor.getDoc` and
`MarkdownView.save`. App storage is JSON-backed and profile-local; `getDoc` is a bounded
CodeMirror 5 document view over the existing snapshot selection; `save` flushes pending editor
writes through a new typed host `save` operation. This is not a full CM5 `Doc`, not a different
editor implementation, and at the time was not proof of create-note, settings persistence, user
scripts or shell functions. Create-note was later verified; see the section above.

## Templater startup compatibility

This section records the compatibility surface added while validating Templater.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 822 passed (42 files) | CodeMirror/Platform/UI/notice cases |
| `npm run build` | Passed | Strict TypeScript + multi-page build |
| `npm run test:e2e` | **64 passed / 0 failed** | Existing browser flows |
| pinned Linux corpus workflow | Templater 2.26.0 **STARTUP_ONLY** | Run 41042973930; no template workflow executed |

Added a bounded `FileSystemAdapter`, `Vault.getConfig`, numeric Notice durations, command
icon/hotkey metadata, CLI-handler acceptance, CodeMirror 5 mode/helper/MIME shims, Platform
fields, `addIcon`, `createFragment`, `AbstractInputSuggest`, `FuzzySuggestModal`,
`SettingPage`, `ConfirmationModal`, `util`/`child_process` stubs, a file-menu event backed by `Menu`/`MenuItem` in the file context menu and
`wasm-unsafe-eval` in the default CSP. `AbstractInputSuggest`/`FuzzySuggestModal` are input-driven and `prepareFuzzySearch` returns the documented score/matches shape. Templater then started under the desktop unsafe-eval entry; at that time template insertion, file creation and shell functions remained unverified. Startup errors are no longer masked by an on-unload exception. The default-entry `wasm-unsafe-eval` noted above was later removed, and template insertion was later verified; see the narrowed default CSP and Templater template insertion sections.

## Desktop unsafe-eval opt-in

This section records the trusted-renderer-only CSP entry and its restart flow.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 826 passed (42 files) | Includes custom-view script reads and exact metadata resolution |
| `npm run build` | Passed | Multi-page build includes `trusted.html` |
| `npm run test:e2e` | **64 passed / 0 failed** | Existing browser flows |
| `npm run test:desktop` | New opt-in/restart case | Desktop-only setting |

`trusted.html` mirrors the application entry with `script-src 'self' blob:
'unsafe-eval'`. Electron reads a persisted `trusted-renderer.json` from its user-data
directory, serves `trusted.html` only when the opt-in is true, and otherwise rejects direct
requests for it. The Community plugins tab exposes a warning and two-step confirmation; the
setting takes effect after restart and is unavailable in the browser preview. The desktop
e2e test confirms strict entry rejection before opt-in and `eval('2 + 2') === 4` after restart.
This weakens CSP only for the trusted renderer entry and does not sandbox plugins.

## Bounded MetadataCache and Dataview LIST

This section records the first real Dataview query workflow.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 824 passed (42 files) | Metadata parser, index, renderer and compatibility cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **64 passed / 0 failed** | Existing browser flows |
| pinned Linux corpus workflow | Dataview 0.5.70 **BOUNDED_WORKFLOWS_PASS** | Run 41009214995; query/inline, DataviewJS and dv.view |

`src/metadata.ts` derives an original CachedMetadata-shaped value: frontmatter and its
position, ATX/setext headings, wiki/Markdown links and embeds, inline/frontmatter tags,
yaml/heading sections, list items/tasks and `^block` ids, with zero-based line/column and
UTF-16 full-file offsets. `engine.index/v1.metadata(path)` caches and invalidates it, and
`MetadataCache.getFileCache/getCache` serve it to compatibility plugins. The renderer adds
real CodeMirror editor fields, DOM query/insertion helpers, namespaced Workspace events, a
root-path alias and `String.prototype.contains` for the pinned Dataview bundle. The corpus test now owns real `TABLE`, `TASK`, `FROM`, `WHERE`, `SORT`/`LIMIT`, `GROUP BY`, `FLATTEN` and inline-query workflows; DataviewJS and a `dv.view` custom script run through the explicit desktop `unsafe-eval` opt-in; the custom view resolves `.js` files by exact path and reads them as vault text. This is not full Dataview query semantics.

## Native compatibility support plugin

This section records extracting the Obsidian compatibility loader behind a native contract.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 819 passed (41 files) | +6 compat discovery/host/permission/argument cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **64 passed / 0 failed** | Existing browser flows |
| `npm run test:desktop` (macOS) | 40 passed / 1 failed | Known pre-existing CommonJS Control-selection case; CI Linux remains the gate |

`engine.compat/v1` now exposes package discovery, start/stop and typed host primitives; the
built-in `engine.compat` native plugin provides it. `App` resolves the contract and no longer
imports `startPlugin`/`startRendererPlugin` directly, validates packages, or checks plugin
permissions. Operation arguments are type-checked in the support service before dispatch. The **Obsidian plugin support** Core plugin switch gates package
loading/enabling; disabling it stops enabled packages and clears the community list. The
Community plugins Settings UI and runtime selection remain in the application for the next
migration step. The contract contains no Obsidian App/Vault/Workspace types, so
metadata/workspace compatibility work can stay inside `src/compat/`.

## Compatibility bootstrap for Dataview startup

This section records a probe-driven compatibility step, not a claim that Dataview works.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 813 passed (40 files) | Renderer/bootstrap cases; vault-event expectations updated |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **64 passed / 0 failed** | Existing flows unchanged |
| pinned Linux trusted-renderer corpus | Dataview 0.5.70 reaches STARTUP_ONLY | Manual workflow run 40835840106; no workflows executed |

Added `App.appId`, an empty `internalPlugins.plugins` stub, bounded Vault create/delete/modify
event registration (create/delete derived from entry diffs), MetadataCache `resolve` alongside
`resolved`, `workspace.iterateAllLeaves`, and a minimal CodeMirror 5 `defineMode`/`getMode`
shim. These were the successive first blockers on the pinned Dataview bundle. A simple
`dataview` LIST block still remained raw source in the probe, so metadata/query rendering is
not implemented or verified. Rename is accepted as a subscription but no rename event is
synthesized. The pinned Linux corpus result file was refreshed from the workflow artifact.

## Callout fold state and code copying

This section records session fold persistence and code-block copy controls.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 813 passed (40 files) | Existing suites |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **64 passed / 0 failed** | +1 callout/copy case |

Callout blocks now carry a short source-identity key; user toggles are kept in memory per
vault path and re-applied when Markdown re-renders or the note switches between reading and
live mode. Defaults from `[!type]+` / `[!type]-` still apply when no saved toggle exists.
Every rendered `<pre><code>` receives an accessible Copy control; it uses the clipboard API
with a temporary-textarea fallback and briefly reports Copied/Copy failed. The controls are
re-added after plugin processors finish. Cross-restart fold persistence and plugin-added
code blocks that appear after the processor ready signal are not claimed.

## Reading-mode undo history

This section records keeping the editing surface mounted while the reading view is shown.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 813 passed (40 files) | Existing suites |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **63 passed / 0 failed** | +1 reading/source undo case |

The Markdown editor now stays mounted in a hidden `.editor-host` while reading mode shows
the reading surface; it is configured in source mode so the full document is present. The
same session, undo stack, caret and viewport survive reading/source/live switches. Custom
Canvas/Bases views still take the reading-surface branch and do not mount the Markdown
editor. CodeMirror measures itself when the host becomes visible again; the browser suite
covers the transition.

## Live list markers and nested continuation

This section records bullet/ordered marker rendering and nested-list editing in live mode.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 813 passed (40 files) | +2 list-marker range cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **62 passed / 0 failed** | +1 bullet/ordered/nested continuation case |

Inactive list markers are replaced with a styled bullet or the original ordered marker while
the source text, indentation and selection access remain intact; touching the marker reveals
its source. Task checkboxes keep their existing widget and are not double-rendered. List
continuation and Tab indentation use the existing Markdown keymap, verified for a nested
item. List folding and full nested-list cursor semantics remain open.

## Persisted explicit property types

This section records the vault-level property type registry behind the inline editor.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 811 passed (40 files) | +5 property helper cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **61 passed / 0 failed** | +1 explicit-type/automatic case |

Choosing a type stores it in `VaultState.propertyTypes` (the same local-first state JSON as
settings/bookmarks); choosing Automatic deletes the override and falls back to value
inference. Types are vault-global and keyed by property name, so a Text override keeps a
date-like string as text on every note until reset. Unknown persisted values are ignored.
The initial reset dropdown remains in the editor.

## Inline type-aware properties

This section records replacing the note-body properties `<details>` block and the
right-sidebar properties tab with an inline Obsidian-style editor.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 806 passed (39 files) | View registry adjusted for the removed right slot |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **60 passed / 0 failed** | Inline number/checkbox/date/list editing and source round-trip |

`PropertiesEditor` renders under the note title in live and reading modes; source mode keeps
the raw frontmatter. It infers text/number/checkbox/date/date-time/list from the parsed YAML
value and exposes a type menu that converts the value in place; an explicit choice is
persisted per vault (see the section above) and Automatic removes it. Checkboxes commit
immediately; text, number, date and date-time commit on blur or Enter; lists render removable
chips with a datalist of values seen elsewhere in the vault. Add-property and remove-property
write through `setProperties`, so YAML types and quoting stay valid. Structured values stay
read-only with an "edit in source mode" hint. The right-slot note-properties tab and its
`engine.view.properties` contribution were removed so the inline editor is the single
editing surface; outline/backlinks/outgoing remain in the right slot.

## Opt-in block preview contributions

This section records the `engine.ui` block kind and the built-in Mermaid consumer.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 806 passed (39 files) | Block registry/loader + fence parsing cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **60 passed / 0 failed** | Mermaid preview + existing flows |

`engine.blocks.mermaid` registers a `block` contribution (`language: 'mermaid'`, lazy
preview loader). Live code/diagram blocks resolve the fence language and render the
preview through a local Suspense/ViewBoundary; clicking the block reveals the fenced source.
Removing the contribution falls back to the normal Markdown block rendering. Reading mode
keeps the existing postprocessor lifecycle; raw processors are not executed in live
widgets. This is the opt-in preview/edit path for plugin content.

## Frontmatter decoration and mode-switch undo

This section records keeping the full document in live mode.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 803 passed (39 files) | Existing suites |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **60 passed / 0 failed** | +1 mode-switch undo case |

Live mode hides frontmatter with line decorations instead of removing it from the
CodeMirror document; source/live switching now reconfigures a compartment and preserves the
undo stack. The cursor is clamped below hidden frontmatter so it cannot be edited
invisibly. Raw reading processors are still not run in live widgets (that duplicated processor
lifecycles); explicitly registered `engine.ui` block previews are used instead. Inline
properties now replace the former side-panel editor; see the section above.

## Live Preview editing and inline fixes

This section records the click-to-edit block UX, table editing affordances, internal
scrolling and editor-history fixes.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 803 passed (39 files) | Existing suites |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` | **59 passed / 0 failed** | +8 Live Preview/editor cases |

- Rendered blocks have no "Edit source" button; clicking a block reveals source at the
  clicked line (code/diagram line mapping), with Enter/Space on the focused block as the
  keyboard path.
- Table Tab/Shift+Tab move cells; Tab on the last cell appends a row and focuses its first
  cell; hover affordances add a row/column, selected cells expose move/delete controls,
  and separator alignment is applied.
- Long code and table content scroll inside `.live-block`; the editor content is clamped to
  the viewport width (`cm-content`), so the page no longer scrolls horizontally.
- Theme/font-size/line-number/spellcheck changes reconfigure compartments instead of
  recreating the editor; an e2e case verifies undo survives a theme change.
- Inline bold/italic/highlight/strike/code hide markers per touched span, escaped markers
  stay literal, setext headings render, and inline images/tag pills render (revealing
  source on click). Remaining differences are listed in
  `QA-LIVE-PREVIEW.md`.

## Editor surface view

This section records registering the editor surface through `engine.views/v1`.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 803 passed (39 files) | View registry/list |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| targeted e2e | **5 editor/workspace cases passed** | modes, undo/find, tabs, split, outline jump |

`EditorView` registers as `engine.view.editor` and composes the existing `Editor`
component; `EditorViewProps` carries the note/session/suggest/plugin-extension props and an
`onHandle` callback so App keeps its imperative handle for focus, jump, selection and
find. The lazy `Editor` remains as a fallback when the view registry is unavailable.
Switching to reading unmounts the view and clears the handle. The editor provider contract
(`engine.editor/v1`) and draft/conflict semantics are unchanged; this increment moves the
surface registration, not the editing implementation. Shell layout/tabs/ribbon/status
remain in App.

## Native settings consumer

This section records the first built-in consumer of `engine.ui/v1` settings.

| Check | Result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 803 passed (39 files) | Settings tab validation |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| targeted e2e | settings/themes case passed | Editor controls render from the contribution |

`SettingsContribution` gains `tab` (default `extensions`), and contributed components
receive `{value, onChange}`. `engine.settings.editor` registers `EditorSettings` for the
Editor tab; the inline Editor block is removed, so the tab is rendered entirely from the
native contribution. `createUiRuntime` accepts extra plugins to register UI contributors.
The settings e2e opens the Editor tab and asserts the mode select and line-number control.
Other tabs still render inline and can migrate incrementally.

## Canvas component split

This section records extracting Canvas internals while keeping the view behavior.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 803 passed (39 files) | Existing suites |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| targeted e2e | **6 Canvas cases passed** | Create/edit/persist, embeds, renames |

`Canvas.tsx` now composes `src/views/canvas/Card.tsx` (node renderer + `canvasNodeTypes`),
`FitEmbed.tsx`, `CanvasToolbar.tsx` and `CardEditor.tsx`; parsing, node/edge changes and
persistence stay in the host. Read-only embeds, edge creation, resizing, editing and
malformed-file handling are unchanged. No node-type registry is exposed yet; this is an
internal component split, not a new extension point.

## Bases built-in view extraction

This section records moving the built-in Bases renderers behind a UI registry.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 803 passed (39 files) | +3 Bases registry cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| targeted e2e | Bases filter/edit and renderer custom-view cases passed | Behavior preserved |

`TableBasesView`, `CardsBasesView` and `ListBasesView` now live under `src/views/bases/`
and register in `builtinBasesViews`; `Bases.tsx` resolves the `.base` view type and only
keeps parsing/filtering/CSV/toolbar/footer. The existing table/cards/list markup and
`data-testid="base-table"` are preserved, and plugin Bases views still mount through
`PluginBasesHost`. The registry has register/resolve/revoke tests. Canvas internals remain
a single component; this increment covers Bases only.

## Hover-link transport

This section records hover-source event delivery.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 800 passed (38 files) | Event gating and existing compatibility cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| desktop renderer e2e | **11 passed** | Hover status + existing renderer flows |

Hovering an internal Markdown link calls the App dispatcher with the native event, target
element, link text and source path. For every registered `hoverSource`, the renderer
controller emits `workspace.on('hover-link')` with that source id and a minimal
`hoverParent` (`hoverPopover: null`); the fixture's handler sets the status text to
`Hover ZTarget`. Worker mode still rejects `hover-link` without a UI host. Custom hover
popover rendering is not implemented; plugins can use the target element/event to draw
their own UI.

## Metadata cache events

This section records MetadataCache event delivery.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 800 passed (38 files) | changed/deleted/resolved + rejection cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| targeted e2e | no app regression | Event path is inert without listeners |

`app.metadataCache.on` accepts `changed`, `deleted` and `resolved`; other event names reject.
`resolved` fires once after plugin startup. `sync` emits `changed(file, content, null)` for
new or modified notes and `deleted(file, null)` for notes removed from the snapshot; the
cache argument is null because exact cache positions/shapes remain unsupported.
`getFileCache`, `getCache`, `fileToLinktext`, `resolvedLinks` and `unresolvedLinks` still
reject explicitly. `on` is added to the MetadataCache subset baseline. `tests/compatibility.test.ts`
covers the three events and the rejection boundary.

## Compatibility Bases views

This section records custom `.base` view registration and mounting.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Inventory regenerated for BasesView/QueryController |
| `npm run test` | 799 passed (38 files) | Delegation and cleanup baselines |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| desktop renderer e2e | **10 passed** | Fixture Bases view mounts and unmounts |

`Plugin.registerBasesView(id, factory)` validates and registers cleanup in the renderer
host; `table`, `cards` and `list` are reserved ids. The Bases surface resolves
`views[].type` against registered ids (own-property lookup), mounts the factory with a
minimal `QueryController` (`type`, `config`, `app`), then calls optional `onload()` and
required `render(container)`; startup failures call the optional `onunload()` and clear the
container before rethrowing. Disabling the plugin disposes the view and removes its
registration. Built-in CSV export and the row-count footer are hidden for plugin views.
The fixture's `Test.base` renders "Fixture bases view" and unmounts on disable. Full query
data, grouping, sorting and `BasesConfig` semantics are not implemented; a `.base` view type
without a native or plugin implementation still shows the explicit unsupported-type error.

## Compatibility protocol and hover registration

This section records protocol-handler dispatch and hover-source registration.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | No drift |
| `npm run test` | 799 passed (38 files) | Delegation and cleanup baselines |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| desktop renderer e2e | **9 passed** | Protocol dispatch and existing renderer flows |

`Plugin.registerObsidianProtocolHandler` validates the action/handler pair and registers
cleanup. The application listens for an in-app `engine:protocol` window event with an
`obsidian://action?...` URL and dispatches it to every renderer controller; handlers receive
`{action, ...searchParams}`. The fixture's "Dispatch protocol" command sets the status text
to "Protocol ok". OS-level `obsidian://` registration is not wired.
`Plugin.registerHoverLinkSource` validates `{display, defaultMod}`, records the descriptor
and removes it on unload; hover-link event transport is not wired yet.

## Compatibility editor suggestions

This section records the `EditorSuggest` bridge from renderer plugins to CodeMirror
autocomplete.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Inventory regenerated for EditorSuggest |
| `npm run test` | 801 passed (38 files) | Export baseline, delegation and cleanup |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| desktop renderer e2e | **8 passed** | Popup trigger, Alpha selection, existing renderer flows |
| targeted browser e2e | 2 passed | Reading/editor smoke |

`Plugin.registerEditorSuggest` delegates to the trusted renderer host, which validates the
instance and registers cleanup. The editor's autocomplete source calls each registered
suggest's `onTrigger` with a snapshot editor at the current position, then
`getSuggestions` with an `EditorSuggestContext`; the result is mapped to CodeMirror
completions with `filter: false` so the plugin owns query filtering. Selecting an option
calls `selectSuggestion`, whose `context.editor.replaceRange` runs through the existing
editor mutation host. The fixture types `@Al`, selects `Alpha`, and verifies `@Alpha` in
the document. Custom `renderSuggestion` DOM is not reproduced; labels use
`getSuggestionDisplayText`.

## Compatibility view extensions

This section records `registerExtensions` and the plugin-view host that mounts a
compatibility plugin's custom view in the main document area.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 801 passed (38 files) | Renderer delegation/cleanup for registerExtensions |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| desktop renderer e2e | **7 passed** | Custom `.fixture` view mounts; existing renderer flows |

`Plugin.registerExtensions` delegates to the trusted renderer host, which validates the
single-segment extension list, requires an already-registered view type and notifies the
application. The application registers the extension with `engine.render/v1` and the view
with `engine.workspace/v1`, then renders a `PluginViewHost` when a mapped file opens; the
host calls the controller's `mountView`, which creates a `WorkspaceLeaf`, calls
`setViewState({type,state:{file}})`, and appends the plugin DOM view inside the document
area. Registrations are kept in an ownership stack per extension, so disabling one plugin
restores the latest remaining view rather than deleting another plugin's mapping. `web:`
routes are resolved before extension routing, and embedded views omit the floating-pane
close button. Disabling the plugin removes the format/view registrations and unmounts the
host. The `.fixture` test also covers the existing "Open view" command path, which
continues to render in the floating plugin-view pane.

## Native UI contributions

This section records the native ribbon/status/settings contribution host for in-repo
extensions. It is the first answer to “how can other extensions add UI”: `engine.views/v1`
covers main/panel component loaders, and `engine.ui/v1` covers ribbon buttons, status-bar
text and settings sections.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 802 passed (38 files) | UI registry, settings loader and consumption cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| targeted e2e | settings/Extensions tab passed | Host additions are empty by default |

`UiContributions` validates ids/labels/kinds, replaces by `(kind, id)` with
nearest-active-predecessor revocation, orders by `order`, and notifies subscribers. A
throwing subscriber is isolated and logged, so registration still returns its disposer and
later subscribers still run. The application subscribes and renders ribbon buttons, status
items and Settings → Extensions sections from the service; no built-in extension registers
one yet, so the visible UI is unchanged. External plugin-package UI loading and
compatibility `registerExtensions` for non-renderer hosts remain open.

## Compatibility UI surface resumes

This section records the compatibility re-baseline and the new ribbon hook. The renderer
UI members that were already implemented behind the trusted host are now classified as a
documented subset instead of rejected; Worker mode still rejects them without `host.ui`.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 796 passed (37 files) | Renderer UI baseline + ribbon case |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| targeted e2e | reading/settings smoke | Ribbon container is additive; plugin UI flows unchanged |

`Plugin.addRibbonIcon` now creates a button in the `plugin-ribbon` container, returns the
element, invokes the callback on click and removes the element through the plugin's
lifecycle. The icon is exposed as `data-icon` with a text-glyph fallback (the reference
lucide set is not bundled for plugin-provided names). `member-contracts.json` now lists
`addRibbonIcon`, `addSettingTab`, `addStatusBarItem`, `registerView`,
`registerEditorExtension`, `registerMarkdownPostProcessor` and
`registerMarkdownCodeBlockProcessor` as renderer-only subset members, and the workspace
leaf factories (`getLeaf`, `getRightLeaf`, `getLeavesOfType`, `detachLeavesOfType`,
`revealLeaf`) as renderer-only subset members. Worker-mode rejections remain explicit.

## UI view contributions

This section records source verification for moving built-in view dispatch onto component
loaders. The React views are registered as native view plugins; the application host
resolves them lazily. External plugin-package UI loading and permission gating for views
are not implemented yet.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 807 passed (37 files) | +6 view-loader/lifecycle/boundary cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | **51 passed / 0 failed** | Reading, Canvas, Bases and link-creation flows |

`engine.views/v1` stores opaque loaders, so the kernel and services still import no React
or concrete view. The left-slot files/search/bookmarks/recent/tags panels and right-slot outline/backlinks/outgoing panels use the same registry; their lazy
load needs a local Suspense boundary, which the first e2e run caught (the panel suspended
inside a synchronous click and the boundary showed its fallback). The host also rejects a
panel contribution that is not registered for the `left` slot, and bookmark removal is a
focusable sibling button rather than a nested non-keyboard control. The three built-in view plugins register in their own scopes and are
removed when disabled; `tests/views.test.ts` verifies registration/replacement, scope
revocation, function/default-export interpretation and the view boundary's fallback state and
error logging.
A failed lazy load evicts its cache entry and a view-level error boundary shows a
controlled fallback instead of replacing the whole workspace. The app now renders one generic
`ReadingViewProps` shape instead of hard-coded canvas/base/markdown branches. During
verification the unresolved-link e2e case caught a regression: the generic `onOpen` used
the tab opener instead of Markdown link semantics, so the contract gained a separate
`onOpenLink` callback; the case now passes.

## Stage 7 package validation and permissions

This section records source verification for plugin package validation, declared-permission
enforcement and the empty-configuration check. Stage 7 is checked; the permission check is
a host-operation gate, not a sandbox.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 801 passed (36 files) | +8 package/permission/empty-kernel cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | **51 passed / 0 failed** | Discovery/enable flows unchanged |

`validatePluginPackage` rejects malformed ids, names, versions, engine ranges, entry paths,
unknown/duplicate permissions and malformed service declarations before a package appears
in Settings. The application host checks a declared permission set per vault/storage/editor
operation; a manifest without `permissions` keeps legacy unrestricted access, and a declared
set without `vault:read` receives snapshots with no note content or editor text. An empty
kernel exposes no services and emits no diagnostics. A desktop fixture that used a
non-semver version was updated to `1.0.0`. Command/tab registration is not permission-gated;
the package `entry` check only runs when a caller supplies one, while discovery reads the
fixed `main.js`.

## Stage 6 folder rename/trash and dependency loss

This section records source verification for folder-subtree rename/trash in the
compatibility facade and the facade dependency-loss flow. Stage 6 stays unchecked (hard
delete, binary adapters, `process()` and fuller disable/reload timing remain).

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 793 passed (35 files) | Folder-subtree and facade-dependency cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | **51 passed / 0 failed** | Rename/trash UI flows unchanged |

`Vault.rename` remaps the captured object subtree (folder and descendants) to the new prefix,
retains identity, and reconciles parent children; `Vault.trash` removes the subtree. Root
rename/trash is rejected explicitly. A
facade-style consumer that requires the notes index and the CodeMirror editor capability is
disabled when the index is disabled with a `dependency-disabled` diagnostic and rebound on
enable. These are bounded unit/composition and local checks.

## Stage 6 facade storage completion

This section records source verification for routing the compatibility facade's remaining
Vault operations through native storage/documents. `Vault.rename` and `Vault.trash` now work
for `TFile` (folder operations stay explicitly unsupported), and `getResourcePath` returns
the storage asset data URL. Stage 6 stays unchecked (delete/process, binary adapters and
fuller disable/reload timing remain).

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 790 passed (35 files) | Compatibility rename/trash/resource cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | **51 passed / 0 failed** | Rename/trash UI flows unchanged |

The facade's rename propagates host failures and rejects a destination the host would adjust;
it then keeps the `TFile` object identity at its new path and reconciles the parent's children;
trash removes it from the object map. The application routes rename through
`engine.documents/v1` and trash through `engine.storage/v1` (bridge-backed), with link
rewriting and in-memory remapping retained. The member-contract baseline moved the three
members from rejected to subset. These are bounded results; folder operations, hard delete,
binary adapters and process remain unsupported.

## Page preview and audio recorder (stage 5 continuation)

This section records source verification for migrating hover-preview rules and the audio
recorder lifecycle onto native services. Stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 791 passed (35 files) | +10 page-preview/audio cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | **51 passed / 0 failed** | Reading/hover flows unchanged |

`PagePreview` strips frontmatter and truncates the excerpt and clamps the popover placement
inside the viewport. `AudioRecorder` collects MediaRecorder chunks, stops the stream tracks
and returns bytes with a `.webm`/`.ogg` extension; stream/recorder factories are injected in
tests, including a recorder-construction failure that still stops the stream, a shared
pending start during the permission prompt, disposal that releases a later-resolved stream,
and stop-state capture when a new recording starts before the old onstop fires. These are
unit/composition and local checks; audio hardware is not exercised, and the migration covers
logic/lifecycle rather than the React views.

## Web viewer and slash commands (stage 5 continuation)

This section records source verification for migrating web-viewer address validation and the
slash-command insertion list onto native services. Stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 781 passed (33 files) | +6 web-viewer/slash cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | **51 passed / 0 failed** | Editor and viewer flows unchanged |

`WebViewer` accepts only HTTPS addresses (trimming the input) and rejects other protocols or
unparsable values. `SlashCommands` lists the six built-in insertions with the template entry
as an action, returning copies so callers cannot mutate the list; the editor renders the
completion options from the service. These are unit/composition and local checks, not
packaged-binary acceptance.

## Note composer (stage 5 continuation)

This section records source verification for migrating the merge/extract content rules onto
`engine.note-composer/v1`. The application keeps dialogs, editor selection replacement,
vault-wide link rewriting and the trash write. Stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 775 passed (31 files) | +3 composer cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | **51 passed / 0 failed** | Composer flows unchanged |

`NoteComposer.merge` keeps the target content and appends the source body without its
frontmatter; `extractLink` builds a wikilink without the `.md` suffix. The suite also covers
runtime composition and a consumer plugin. These are unit/composition and local checks, not
packaged-binary acceptance.

## Explorer service (stage 5 continuation)

This section records source verification for migrating file-tree ordering onto
`engine.explorer/v1`, which consumes the storage contract. The application keeps expansion
and interaction state; stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 772 passed (30 files) | +5 explorer cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | **51 passed / 0 failed** | Explorer flows unchanged |

`Explorer` lists storage entries and orders folders first, then by name or modification time;
`children` provides direct children of a folder or the root; equal modification times fall
back to a name comparison for a stable order. The suites cover ordering, the
storage dependency and the bridge runtime exposing the explorer. These are
unit/composition and local checks, not packaged-binary acceptance.

## Slides and format converter (stage 5 continuation)

This section records source verification for migrating the slides view and the bounded
format converter onto native services. Stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 767 passed (29 files) | +7 slides/converter cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | **51 passed / 0 failed** | Platform-adaptive keys; slides case passes |

`SlideDeck` strips frontmatter and splits on `---` rules; `MarkdownConverter` converts
`<mark>` highlights and same-vault `.md` links while leaving external URLs and non-Markdown
targets (including protocol-relative URLs) untouched. Slide parsing normalizes CRLF and
handles an empty frontmatter block. Both suites also cover runtime composition and a
consumer plugin. The
browser suite is fully green on macOS now that the tests use `ControlOrMeta`. These are
unit/composition and local checks, not packaged-binary acceptance.

## Unique note and word count (stage 5 continuation)

This section records source verification for two more core-feature migrations: the unique
note creator (consuming templates) and word count (status bar). Stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 760 passed (27 files) | +10 unique-note/word-count cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline (the known `Control+…` keybinding tests) |

`UniqueNotes` uses a UTC `YYYYMMDDHHmmss` name, applies a template through
`engine.templates/v1` or falls back to a `# <name>` heading, and is rejected/disabled with
its template provider. `WordCounter` counts Unicode letter/number runs and UTF-16 code
units; the status bar now reads words and characters from it. These are unit/composition and
local checks, not packaged-binary acceptance.

## Workspaces service (stage 5 continuation)

This section records source verification for migrating named workspaces onto
`engine.workspaces/v1`. The save/load-workspace commands and the workspaces palette consume
the service; persistence stays application-side and stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 750 passed (25 files) | +7 workspace cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline; the save/restore workspace case passes |

`WorkspaceStore` deep-clones on write and per listener, so a consumer cannot mutate the
stored layouts; records use a prototype-free store so inherited names like `toString` and
`__proto__` assignments are safe. The suite also covers sanitizing the seeded record and the
disable/enable dependency flow with a consumer plugin. These are unit/composition and local checks, not
packaged-binary acceptance.

## Navigation service and facade storage routing (stage 5/6 continuation)

This section records source verification for two changes in one increment: a new
`engine.navigation/v1` (quick switch + random note) consuming the notes index, and routing
the compatibility facade's read/write/plugin-data operations through
`engine.storage/v1`. Stages 5/6 stay unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 743 passed (24 files) | +5 navigation cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline; the quick-switcher case passes |

`NotesNavigation` orders quick-switch paths recent-first (stable otherwise) and returns a
random Markdown path with an injectable random source; the navigation plugin consumes
`engine.index/v1` and is rejected without it. The navigation suite also covers the
disable-with-index dependency flow. The facade's read/create/modify/append/mkdir and
plugin-data operations now call the storage service (bridge-backed in the app) while keeping
the in-memory note reconciliation. These are unit/composition and local checks, not
packaged-binary acceptance.

## Bridge storage into the app + file recovery (stage 2/5 continuation)

This section records source verification for wiring the bridge-backed storage/documents
runtime into the application and migrating file recovery onto `engine.documents/v1`. Note
writes and the rest of persistence still go through the bridge, and stages 5/6 stay
unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 738 passed (23 files) | +5 bridge-storage cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline; the file-recovery case passes |

`BridgeStorage` adapts the desktop/preview bridge to `engine.storage/v1` (normalizing the
required content fingerprint (a bridge read without one is rejected) and delegating
list/read/write/create/append/mkdir/rename/trash/snapshots/restore/pluginData/asset/attach/
plugins/state; a storage-runtime startup failure is reported locally so vault
initialization and the bridge fallback still work), and `createStorageRuntime({bridge})`
exposes it with `engine.documents/v1`. The file-recovery view now reads `documents.history`
and restores through `documents.restore` (falling back to the bridge only if the runtime is
unavailable). These are unit/composition and local checks, not packaged-binary acceptance.

## Command service and native compatibility facade (stage 5/6 continuation)

This section records source verification for two changes in one increment: the application
command palette/hotkeys now consume `engine.commands/v1`, and the Obsidian compatibility
facade can consume native services for link resolution and editor capability reporting.
Stage 5 (remaining core features) and stage 6 (full storage/documents-backed facade) stay
unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 733 passed (22 files) | +6 command/native-facade cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline |
| `npm run test:desktop` (macOS) | 34 passed / 2 failed / 10 skipped | One known `Control+…` editor case and one flaky lifecycle case that passes on rerun |

The command service case covers runtime composition, hotkey mapping, execution and
disposal. The facade cases cover native link resolution in `MetadataCache` and
`Workspace.openLinkText`, snapshot fallback, explicit rejection of CodeMirror-only
extensions with the active provider named, and `editorCompatibility()` reporting. The facade
is created only when a plugin is enabled, so the default product does not depend on it.

## Properties consumer (stage 5 continuation)

This section records source verification for migrating the properties view onto
`engine.index/v1`. The inline property editor reads property values from
`index.properties(path)`, and the "Vault properties" list uses `index.propertyKeys()`
instead of scanning every note's frontmatter; writes still go through `setProperties`.
Other core features remain to be migrated, so stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 727 passed (21 files) | 726 prior plus the property-keys index case |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline; the properties/bookmarks case passes |

The invalid-YAML guard still uses `frontmatter(...).error` so a broken frontmatter block is
reported rather than silently emptied. The browser case that checks typed YAML properties
and bookmarks passes, and the wider suite shows the same six macOS `Control+…` platform
failures.

## Graph consumer (stage 5 continuation)

This section records source verification for migrating the graph view onto
`engine.index/v1`. `Graph` now derives its nodes and edges from `index.outgoing`,
`index.resolve` and `index.note(...).tags` instead of parsing links/tags itself. Other
core features remain to be migrated, so stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 726 passed (21 files) | No new unit cases; index behavior already covered |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline; the graph relationships/filter case passes |

The graph's local-depth traversal, orphan and unresolved-link options, tag-based filter and
node/edge counts are unchanged; only the metadata source moved to the index. The browser
case that builds real note relationships and filters still passes, and the wider suite
shows the same six macOS `Control+…` platform failures. These are composition and local
checks, not packaged-binary acceptance.

## Search consumer (stage 5 continuation)

This section records source verification for migrating the search panel onto
`engine.index/v1`. `App` now derives search results from the index and maps the matching
paths back to notes for the result list and snippet. Other core features remain to be
migrated, so stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 726 passed (21 files) | 725 prior plus the search-operator index case |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline; the search operators case passes |

`index.search` reuses the existing query engine (`path:`, `file:`, `tag:`, `content:`,
boolean and regex operators pass through), and the application filters the returned paths
to Markdown and Canvas notes exactly as before, then sorts by name or modification time.
An index case covers operator pass-through, and the browser search case passes. These are
unit/composition and local checks, not packaged-binary acceptance.

## Index consumer panels (stage 5 continuation)

This section records source verification for migrating the reader panels onto
`engine.index/v1`. The application's tags, backlinks, outgoing-links and outline panels now
consume the index instead of recomputing metadata from note content. Other core features
remain to be migrated, so stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 725 passed (21 files) | 722 prior plus 3 index cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline; the tags/outgoing/outline case passes |

`App` rebuilds one `engine.index/v1` service for the current note set and derives tag
counts (restricted to Markdown paths), incoming/backlinks, outgoing links and headings from
it. Link resolution preserves the original ordered title/alias semantics (including a
string alias substring match) while adding singular-alias support. The browser case that
exercises tags, outgoing links, the outline and unlinked mentions
passes, and the wider suite shows the same six macOS `Control+…` platform failures as the
baseline. These are unit/composition and local checks, not packaged-binary acceptance.

## Notes index dependency (stage 5 continuation)

This section records source verification for `engine.index/v1`, the derived metadata and
search index consumed by the reader panels, search, graph and properties. The contract and
provider are delivered and tested; the remaining core features are not migrated yet, so
stage 5 stays unchecked.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 722 passed (21 files) | 711 prior plus 11 index cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `tests/notes-index.test.ts` | 11 passed | Derivation, resolution, backlinks, tags, search, updates, dependency flow |

The index derives title, aliases, tags, headings, links and properties per note and caches
them; it computes backlinks (once per source), tag counts, link resolution by path/sibling/
title/alias (singular or plural), path deduplication, isolated metadata snapshots, and
full-text search with an optional case-sensitive mode. A consumer plugin
resolves the contract, and disabling the index deactivates that consumer with a
`dependency-disabled` diagnostic until it is re-enabled. These are unit/composition
results, not UI or packaged-binary acceptance.

## Dependency lifecycle and templates/daily notes (stage 5 continuation)

This section records source verification for the dependency-lifecycle work and the
templates + daily-notes migration that follow the first core-feature plugin. The kernel now
has per-plugin `disable`/`enable` with transitive consumer teardown and rebinding,
`engine.templates/v1` and `engine.daily-notes/v1` are migrated together with a tested
dependency edge, and the application consumes them. Stage 5 stays unchecked: the rest of
the core features are not migrated.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 711 passed (20 files) | 693 prior plus 18 new dependency/template cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `tests/dependency-flow.test.ts` | 12 passed | Provider disable/enable, transitive consumers, optional, child scope, rebinding |
| `tests/templates.test.ts` | 6 passed | Template engine, daily notes, dependency edge, disable/rebind |
| `npm run test:e2e` (macOS) | 45 passed / 6 failed | Unchanged baseline; the daily-notes/templates case passes |

Dependency relationships are confirmed at three levels: statically at assembly (versioned
contract graph and diagnostics), at runtime (service subscriptions or declared events) and
through lifecycle `disable`/`enable`/`reload`. The flow tests cover a provider losing a
required consumer chain transitively, an optional consumer staying active, a child scope
being stopped and restarted, a migrated core-feature provider, and scope reload rebinding.
These remain unit/composition and local checks, not packaged-binary acceptance.

## First core-feature plugin: bookmarks (stage 5, in progress)

This section records source verification for the first core-feature migration in
[NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md) stage 5. The
`engine.bookmarks/v1` contract, its default plugin and the application wiring are
delivered; the rest of the core features are not migrated, so stage 5 stays unchecked and
the native-plugin-kernel gate stays open.

| Check | Observed result | Scope |
|---|---|---|
| `npm run inventory:check` | 118 entries, 29 core, 52 bounded checkpoints | Unchanged inventory; no drift |
| `npm run test` | 693 passed (18 files) | 686 prior plus 7 new bookmarks cases |
| `npm run build` | Passed | Strict TypeScript and production bundle |
| `tests/bookmarks.test.ts` | 7 passed | Service behavior, subscription and kernel composition |
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
