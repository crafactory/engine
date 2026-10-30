# Replication Playbook

A theory-driven playbook for rebuilding a complex software product from observed behavior.
It is distilled from the full Crafactory Engine history: the original local-first workspace,
release/packaging iterations, the staged kernel and plugin migration, Live Preview changes,
the compatibility facade, the Dataview/Templater corpus work, and the review findings those
changes produced.

This is not a checklist of everything that was done. It is an attempt to state **why** the
successful moves worked and **where** the failures came from. Project-specific status remains
in [PLUGIN-SUPPORT-MATRIX.md](PLUGIN-SUPPORT-MATRIX.md); this document should not become a
second status page.

## Evidence base

The conclusions below come from repeated patterns across the repository history:

- early releases exposed packaging, checksum and platform-verification gaps;
- the kernel stages exposed ownership, provider binding, lifecycle and version-semantics bugs;
- the storage stages exposed conflict, symlink and provider-parity requirements;
- the compatibility stages exposed the difference between module loading, startup and usable
  workflows;
- Live Preview exposed state-continuity requirements such as widget identity, scroll, undo and
  source preservation;
- the Dataview/Templater work exposed a long chain of “first blockers” and the danger of
  silently accepting a capability that was not actually connected;
- the documentation work exposed how quickly current status drifts when it is copied into
  historical evidence.

The principles are stated generically. The case notes at the end tie them back to concrete
history.

## What replication actually is

Replication is not “write the same feature list.” It is:

> **Maintaining behavioral equivalence for selected workflows while the host, implementation
> and extension model are different.**

That definition implies three layers:

1. **Host primitives** — files, editor transactions, views, events, storage, permissions.
2. **Reference semantics** — the API and lifecycle behavior that plugins/users expect.
3. **Product behavior** — the workflows a user can actually complete.

A replica fails when these layers are conflated. A large API surface with no working workflow is
not compatibility. A workflow that works only because the host hardcodes one plugin is not
extensibility.

The central asymmetry is:

> The reference product is the specification; the host is the implementation. The adapter is
> where one is translated into the other. Do not let the specification become the host
> architecture.

---

## Working laws

The number is not a template. These are invariants that survived the history; a new law should
require new evidence, not a desire for symmetry.

### 1. Equivalence is workflow-level, not API-level

**Observed:** Export inventories, module loading and even successful startup repeatedly failed
to predict whether a plugin could perform a user-visible task. Dataview moved through
`App.appId`, vault events, internal plugins, CodeMirror shims, workspace iteration and metadata
before `LIST` worked. Templater reached `STARTUP_ONLY` while template insertion remained
unverified.

**Consequence:** Acceptance must name a workflow, its input, its persisted effect and its failure
path. “API exists,” “plugin starts” and “test passes” are lower-level observations, not
compatibility.

### 2. A stable contract is a translation boundary

**Observed:** `engine.views/v1`, `engine.ui/v1` and `engine.compat/v1` worked when they exposed
loaders, contributions or host primitives. They became fragile when they leaked concrete
reference objects or implementation-specific operation names. Moving compatibility semantics
into the support plugin kept the shell from changing every time an Obsidian API gap appeared.

**Consequence:** A contract should be narrower than the reference API and broader than one
implementation. If every adapter detail changes the contract, the boundary is wrong.

### 3. Progress is a ratchet over the first blocker

**Observed:** The compatibility work did not advance by adding APIs in bulk. Each iteration
identified the first blocker, removed it, and recorded the next one. Dataview and Templater
both produced long chains of this form. Trying to “finish the API surface” first would have
produced unverified stubs and constant shell churn.

**Consequence:** Keep a blocker ledger. One blocker per increment. A blocker is only closed when
the next observable workflow or the next explicit refusal is verified.

### 4. Lifecycle and ownership are part of semantics

**Observed:** The kernel reviews found stale disposers, duplicate providers, scope races, late
async initialization, child adoption across sessions and cleanup that could mask the original
startup error. Processor lifecycles had the same shape: late callbacks, owned children and
generation-sensitive roots. A Templater on-unload failure once hid the real on-load error.

**Consequence:** Every registration needs an owner. Every async task needs a generation or
cancellation boundary. Cleanup must not replace the original failure. “Stopped” and “forcibly
interrupted” are different states.

### 5. Evidence must be stratified and pinned

**Observed:** Unit tests, browser tests, desktop tests, packaged builds and external corpus
runs each caught different classes of failure. A local build was not release verification; a
skipped optional corpus was not a pass; macOS-only keybinding assumptions were not
cross-platform behavior; line-ending and path handling needed explicit tests. Manual visual
inspection was useful for layout but could not certify mobile, accessibility or functional
semantics. Some tests themselves asserted the wrong DOM contract.

**Consequence:** Match the evidence layer to the claim. Record inputs, versions, hashes,
platform, command and observed result. Do not use a lower layer to certify a higher-layer claim.
State whether evidence is functional, visual, exploratory or negative.

### 6. Security capability is a separate axis

**Observed:** The trusted renderer was never a sandbox. CSP blocked WebAssembly and `eval`;
supporting real plugins required a deliberate desktop-only `unsafe-eval` entry with warning,
native confirmation, restart and path-gating. Widening the global default would have been the
cheap but wrong fix.

**Consequence:** Default to the least capability. Scope relaxation to an entry/mode/process.
Authorize at the protected boundary. Test both the strict refusal and the opt-in success.

### 7. Data integrity and interaction continuity are compatibility

**Observed:** Create-only writes, conflict fingerprints, snapshots, symlink/traversal checks and
exact-byte round-tripping were not optional “storage polish.” Live Preview required widget
identity, measured DOM reuse, scroll anchors, source preservation and undo across mode changes.
Reading mode lost undo until the editor stayed mounted.

**Consequence:** Reversibility, conflict handling, focus/scroll/undo continuity and exact bytes
are part of the behavior being replicated. They cannot be deferred as UI details.

### 8. Documentation is part of the system state

**Observed:** Current plugin status was duplicated across compatibility reports, verification
logs and release notes, then drifted. Historical release notes contained claims that were true
at the time but false later. A single current tracker plus historical evidence labels was the
only stable structure.

**Consequence:** One current source of truth. Historical evidence stays historical. Links replace
copies. Prune duplicated current claims, not evidence.

### 9. Release is a distinct verification layer

**Observed:** Early packaging work exposed checksum naming, download verification, CRLF
inventory drift and platform-specific test assumptions. Build success never implied that the
published artifact or another platform worked.

**Consequence:** Verify the artifact users receive, on the platforms you claim. Separate release
eligibility from functional verification, and state unsigned/untested boundaries explicitly.

---

### 10. Negative evidence and failed candidates are data

**Observed:** Compatibility candidates failed before they passed. A detached worktree run
against the previous release confirmed seven expected failures; candidate iterations exposed
CodeMirror/DOM assertion mistakes, task-ownership bugs and bottom-cell viewport jumps. Some
optional corpus cases were skipped, and skipped is not passed. Reviewers also retained
architectural/security concerns even when CI was green.

**Consequence:** Preserve failed runs, negative outcomes and skipped states as evidence. Do not
erase a failed candidate or turn a later pass into “never failed.” A green check is not an
architecture approval, and an expected failure against a prior baseline is still a result.

## Strategy patterns

Patterns are choices, not laws. Use the one that matches the uncertainty.

### Walking skeleton

Build one end-to-end path first: open, render, interact, persist, recover. It exposes integration
mistakes earlier than a perfect subsystem.

**Use when:** the product surface is new or the boundary is unclear.

### Wrapper-first / strangler

Put the new contract around the old implementation; switch consumers incrementally; delete the
old path only when it is no longer needed.

**Use when:** migrating working behavior without changing it.

### Contract extraction

Separate host primitives from reference semantics, then move the adapter behind the contract.
The contract should survive changes inside the adapter.

**Use when:** more than one consumer, runtime or provider will share the capability.

### Provider parity

Run the same contract suite against every provider: memory/local, worker/renderer, alternate
editors. Provider-specific behavior is a bug unless explicitly bounded.

**Use when:** the same contract has multiple implementations.

### Data-safe provider swap

When replacing storage or an editor provider, freeze new writes, drain accepted work, preserve
unsaved drafts, and verify text, selection, document identity and viewport after the switch.
A failed switch keeps the old provider or an exportable draft; it never clears content and
calls the swap successful.

**Use when:** changing the storage, editor or persistence provider under live user data.

### Corpus ratchet

Pin external artifacts, record the first blocker, verify one workflow, then repeat. Preserve the
old result as history.

**Use when:** compatibility is driven by third-party behavior rather than a fixed internal spec.

### Baseline and candidate discipline

Run the same fixture against the previous build, then against the candidate. Record expected
failures, failed candidate runs and the corrected pass separately. Verify the assertion itself
against the contract/DOM before changing implementation.

**Use when:** claims involve regression, compatibility or a previously failing behavior.

### Scoped capability escalation

Keep the default strict. Add a separate mode/entry/process with explicit consent and a visible
risk boundary.

**Use when:** a real workflow requires a capability that the default policy forbids.

### Ownership and generation

Give every asynchronous or registered resource an owner, a generation and a cleanup path.
Do not let a stale callback act on a successor.

**Use when:** lifecycle, subscriptions, children, views, editors or plugin runtimes are involved.

### Single-source knowledge

One current tracker; one API boundary document; per-run evidence logs; historical documents
clearly labeled. Link instead of copying.

**Use when:** status changes faster than the documentation set.

---

## Operating loop

1. **Observe a real failure.** Prefer a pinned external input or a reproducible user workflow.
2. **Classify the boundary.** Is this a host primitive, adapter semantics, policy, or product
   behavior?
3. **Choose the smallest move.** Probe, wrapper, contract change, adapter fix, security opt-in,
   or product change.
4. **Verify at the right layer.** Unit, browser, desktop, corpus or packaged artifact.
5. **Record the state.** What now works, what remains, what is explicitly not claimed.
6. **Merge and resync.** Do not stack the next change on an old base.
7. **Choose the next blocker.** Let evidence, not the original plan, set priority.

The loop is intentionally shorter than the rule list. A playbook that cannot be applied in a
few decisions is not a playbook.

---

## Decision guide

| Situation | Default move | Required evidence |
|---|---|---|
| Behavior is unclear | Probe or corpus before architecture | A recorded observation and a bounded failure |
| One workflow is missing | Vertical slice | Real input → visible result → persisted effect |
| Multiple consumers need the same capability | Extract a primitive contract | Contract tests and provider parity |
| Existing behavior must move | Wrapper-first | Before/after behavior equivalence |
| A reference API gap appears | Fix the adapter, not the shell | Adapter test and workflow evidence |
| A capability is forbidden by policy | Scoped opt-in | Strict refusal + opt-in success + risk note |
| A file write can conflict | Conflict-checked operation | Concurrent/conflict regression test |
| UI state is lost | Preserve ownership/session | Undo/scroll/focus continuity test |
| Status is duplicated in docs | Collapse to one current source | Link check and historical labels |
| A test fails unexpectedly | Validate the assertion against the contract/DOM first | Exact-source, exact-byte or contract check |
| A regression is claimed | Run the same fixture against the prior build | Expected-fail baseline + candidate pass |
| Only manual visual inspection exists | Scope the claim to layout/theme/viewport | Screenshots and explicit non-claims |
| CI is green but review finds a concern | Treat review as an independent gate | Resolved thread + regression test |
| An editor/provider is replaced | Freeze writes, migrate draft/selection/viewport, verify | Data-preservation and provider-parity tests |
| Release is being claimed | Verify the published artifact | Platform/build/download/checksum evidence |

---

## Failure patterns

These are the recurring ways the work went wrong; they are more useful than generic “best
practices.”

- **API-count compatibility.** Export coverage was mistaken for behavior.
- **Startup-as-support.** A checked enable switch was treated as plugin compatibility.
- **Silent stub.** A menu/suggestion/API surface was accepted but never connected.
- **Global relaxation.** A real plugin need was used to justify weakening the default CSP.
- **Contract leakage.** Reference types (`App`, `Vault`, `Workspace`) leaked into the host
  boundary, forcing shell changes for adapter details.
- **Cleanup masking.** An unload failure replaced the original startup error.
- **Stale disposer.** An old registration removed a newer one.
- **Late adoption.** A stale async callback attached to a successor session.
- **Skipped-as-pass.** Optional corpus tests were treated as green without inputs.
- **Local-build release claim.** Build output was confused with verified packaged behavior.
- **Duplicated status.** Current claims were copied into historical documents and drifted.
- **Rewrite-before-wrap.** Behavior was replaced before equivalence was captured.
- **Candidate amnesia.** A failed candidate run was omitted once a later run passed.
- **Assertion-as-truth.** A test/DOM assumption was treated as the contract instead of checked.
- **Visual overclaim.** Manual layout inspection was generalized to mobile/accessibility.
- **Green-CI-as-approval.** Passing checks were treated as clearing an architectural/security concern.
- **Unpinned baseline.** A regression claim lacked a prior-build comparison.
- **Smoke-as-scale.** A representative fixture was presented as large-vault performance evidence.

---

## Case notes from this project

### Dataview: the blocker chain

`App.appId` → vault lifecycle events → `internalPlugins` → CodeMirror 5 shim → workspace
iteration → MetadataCache → root-path/file resolution → `LIST` → `TABLE/TASK/FROM/WHERE` →
`SORT/LIMIT/GROUP BY/FLATTEN` → inline query → DataviewJS → `dv.view`.

The lesson is not “add these APIs.” It is that a long-lived compatibility target advances by
turning an opaque first blocker into a precise capability, verifying one workflow, and updating
the ledger. DataviewJS and `dv.view` then required a separate security decision, not more API
stubs.

### Templater: startup is not the finish line

Templater moved from a generic class-load error to `STARTUP_ONLY` only after several distinct
surfaces existed: CodeMirror compatibility, adapter identity, command metadata, menu events,
suggestions and settings components. The on-unload failure initially hid the real on-load
failure; fixing error preservation was part of making the compatibility layer diagnosable.

The remaining gap is functional templates, not another export. This is the difference between
“starts” and “works.”

### Kernel and storage: invariants found by review

The kernel/storage stages produced durable invariants: registration ownership, provider binding
at activation, serialized start/stop, descendant-first shutdown, late-runtime cleanup, version
semantics and identical contract suites for memory/local providers. These were not invented
upfront; they were discovered by reviews and regressions, then encoded as rules.

### Live Preview: state continuity

The Live Preview work showed that rendering is only half the feature. Widget identity, measured
DOM reuse, source preservation, table scroll, caret visibility and undo across mode changes are
all part of the user-visible contract. A renderer that redraws correctly but loses the caret or
undo stack is not equivalent.

### QA and release: evidence has texture

The Canvas/Live Edit work compared candidate behavior against the actual v0.5 merge in a
detached worktree: seven checks failed as expected, then passed after the correction. A later
100-row bottom-cell test still exposed a viewport jump, so “the suite passes” was not the end.
An assertion about CodeMirror line text was itself wrong because adjacent line divs have no
newline; the test was strengthened to join visible lines and compare exact source. Task
ownership had to move from checkbox ordinals to parser-owned source offsets.

Release evidence had the same texture: ten optional desktop corpus cases were skipped in normal
CI and therefore not counted as passes; packaged Linux verification ran before publication;
Windows/macOS builds were not native runtime acceptance; unsigned packages stayed explicit.

### Documentation: current vs historical

The support matrix, compatibility report, verification log and release notes originally
overlapped. The stable structure was: one current tracker, one API boundary document, per-run
evidence, and historical documents with banners. Pruning removed duplicated current claims; it
did not erase history.

---

## Applying the playbook

Before starting:

- [ ] Can I name the user-visible workflow and its evidence layer?
- [ ] Is the current first blocker recorded?
- [ ] Is this a host primitive, adapter semantic, policy, or product behavior?
- [ ] Is the smallest move a probe, wrapper, contract change, or adapter fix?

Before merge:

- [ ] The claimed state is demonstrated at the right evidence layer.
- [ ] The refusal/failure path is explicit.
- [ ] New review findings have regression tests.
- [ ] Security changes are scoped, documented and tested both ways.
- [ ] Current/historical docs are aligned.
- [ ] CI is green on the latest head.

After merge:

- [ ] Main is reset/synced.
- [ ] Tracker/worklog is updated.
- [ ] The next first blocker is identified.

## Current project references

| Concern | Reference |
|---|---|
| Concrete commands and checklists | [REPLICATION-RUNBOOK.md](REPLICATION-RUNBOOK.md) |
| Plugin/capability status | [PLUGIN-SUPPORT-MATRIX.md](PLUGIN-SUPPORT-MATRIX.md) |
| API boundaries | [PLUGIN-COMPATIBILITY.md](PLUGIN-COMPATIBILITY.md) |
| Export inventory | [API-COVERAGE.md](API-COVERAGE.md) |
| Per-run plugin evidence | [TRUSTED-RENDERER-PLUGIN-TESTS.md](TRUSTED-RENDERER-PLUGIN-TESTS.md) |
| Chronological verification | [VERIFICATION.md](VERIFICATION.md) |
| Kernel/service contracts | [KERNEL-SPEC.md](KERNEL-SPEC.md), [SERVICES-SPEC.md](SERVICES-SPEC.md) |
| Architecture roadmap | [NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md) |

The playbook is a theory of how to replicate, not a second changelog. If a rule stops explaining
observed behavior, revise the rule rather than forcing history to fit it.
