# Replication Playbook

A reusable playbook for rebuilding a complex software product from public behavior, growing it
through plugin boundaries, and shipping each increment with evidence. It is distilled from the
Crafactory Engine work; project-specific status lives in
[PLUGIN-SUPPORT-MATRIX.md](PLUGIN-SUPPORT-MATRIX.md), not here.

## Core loop

```text
observe real behavior
  -> map capabilities, not feature names
  -> build a walking skeleton
  -> extract a stable host contract
  -> implement reference semantics in an adapter
  -> verify with real workflows
  -> record evidence and boundaries
  -> harden security and UX
  -> merge, reset, choose the next blocker
```

The default unit of progress is **one blocker advanced to a proven state**, not one API added.

## State model

Use explicit states instead of “done / not done”:

| State | Meaning |
|---|---|
| Unsupported | The boundary is explicit and fails safely |
| Loads | Code parses/module loads, but startup is not complete |
| Starts | Startup hooks complete and the plugin is enabled |
| Bounded workflow | Named real workflows pass with persisted effects |
| Broader workflow | Multiple related workflows pass |
| Parity | All required workflows and boundaries verified (rarely claimable) |

Only the state actually demonstrated may be claimed. A parent capability stays incomplete while
any required workflow or boundary remains open.

## Evidence ladder

Use the lowest layer that can prove the claim, but do not use a lower layer to replace a higher
one:

1. contract/unit test — local semantics
2. browser integration test — rendering and interaction
3. desktop/native test — real host, filesystem, lifecycle
4. pinned external corpus — real third-party inputs
5. packaged/real-vault run — release readiness

Every retained claim should identify: input, environment, command, observed result and date.

---

## 1. Replication process

**R1. Replicate behavior, not source.**  
Use public documentation, public behavior and black-box release artifacts. Never copy reference
application code, SDK declarations or sample implementations.

**R2. Map capabilities at three layers.**  
Host primitives, reference API surface, and user workflows. Feature names are not enough.

**R3. Start with a walking skeleton.**  
Open → render → interact → persist → recover. Make one end-to-end path real before widening.

**R4. Prefer vertical slices.**  
One observable workflow at a time beats a broad set of disconnected API stubs.

**R5. Prove the failure path too.**  
A clear refusal or bounded error is evidence; silent no-op is not.

**R6. Advance the first blocker.**  
Do not fan out to ten blockers. Move the first one, record the next one, repeat.

**R7. Pin external inputs.**  
Version, hash, platform and mode are part of the evidence. Unpinned artifacts are not a corpus.

**R8. Separate “starts” from “works.”**  
Startup-only plugins get a startup-only claim.

**R9. Keep parent capabilities unchecked.**  
A finite subset can sign off a bounded checkpoint, never the whole parent.

**R10. Replicate the semantics users depend on, not the internal object graph.**  
Exact implementation shape is usually less important than observable behavior and lifecycle.

---

## 2. Capability and contract architecture

**A1. The kernel knows no product features.**  
No Markdown parser, Canvas, Bases, React, DOM or concrete editor in the kernel.

**A2. Contracts expose host primitives, not reference-software objects.**  
An adapter may speak `App`/`Vault`/`Workspace`; the host contract should not.

**A3. Keep semantics inside the adapter.**  
Reference-API behavior belongs in the compatibility plugin, so filling gaps does not churn the
host.

**A4. Version contracts additively.**  
Prefer optional capabilities and feature detection over breaking existing providers.

**A5. Make dependencies explicit.**  
Declare provides/consumes, activation order, rollback and disposal ownership.

**A6. UI enters through host callbacks.**  
Core services stay UI-agnostic; views, panels, settings and menus are contributions.

**A7. Core features are plugins too.**  
The application shell is a composition root: resolve contracts, inject host capabilities, render.

**A8. Wrap before replacing.**  
Extract behind a contract while preserving behavior; migrate consumers; then delete the old path.

**A9. Test every provider against the same contract.**  
Memory/local, worker/renderer, and alternate editor implementations need the same acceptance suite.

**A10. Reject unsupported capabilities explicitly.**  
No silent stub, empty implementation or false success.

---

## 3. Verification and evidence

**V1. Layer tests by what they prove.**  
Unit, browser, desktop, corpus and packaged checks are complementary.

**V2. Assert real user behavior.**  
Real clicks, real input, real writes, real restart. Mocks prove wiring, not product behavior.

**V3. Use a pinned black-box corpus for external compatibility.**  
Record outcome, first blocker and exact workflows, not only pass/fail.

**V4. A negative result is still a result.**  
“Rejected as unsupported” is valid evidence; “did nothing” is not.

**V5. Do not use test count as a coverage claim.**  
Volume is not parity.

**V6. Reproduce flakes before blaming the branch.**  
Run the failing case on clean main; fix harness/environment if the failure is pre-existing.

**V7. Add a regression assertion for every retained review finding.**  
Root cause first; the test prevents recurrence.

**V8. Record environment with evidence.**  
OS, runtime, pinned version/hash, command and timestamp.

**V9. Keep historical evidence but label it.**  
Current status and historical verification are different artifacts.

**V10. Make every important claim falsifiable.**  
State what the evidence does *not* prove.

---

## 4. Security and trust boundaries

**S1. Default to least capability.**  
Do not grant network, filesystem, Node or eval by default.

**S2. Make risky capability visible and revocable.**  
Explicit switch, warning, confirmation, restart and a documented risk.

**S3. Prefer scoped relaxation over global relaxation.**  
A separate entry/mode/process is better than weakening the default for everyone.

**S4. Put authorization at the protected boundary.**  
Renderer requests are not authorization; the host/main process confirms privileged changes.

**S5. Validate at every boundary.**  
Paths, arguments, types and permissions are checked where they are consumed.

**S6. “Trusted” does not mean “sandboxed.”**  
Document arbitrary-code execution honestly.

**S7. Keep default CSP/security strict.**  
Any relaxation is an explicit engineering decision with a threat-model note.

**S8. Separate compatibility from security policy.**  
A plugin needing a capability does not automatically justify granting it.

**S9. Review security changes separately.**  
Do not hide CSP, permissions or eval changes inside UI refactors.

**S10. Test the escape hatch.**  
Verify that the strict default rejects the capability and that the opt-in actually enables it,
including restart and path-gating behavior.

---

## 5. Migration and refactoring

**M1. Wrap first, rewrite later.**  
A behavior-preserving wrapper is the safest migration unit.

**M2. Strangle the old path.**  
New contract lives beside old implementation; consumers switch incrementally; old path is deleted.

**M3. Migrate one surface per PR.**  
One settings section, one panel, one editor surface, one compatibility service.

**M4. Establish behavior baselines before moving code.**  
Without a baseline, refactors masquerade as fixes.

**M5. Keep the composition root thin.**  
When the shell starts knowing plugin internals, the boundary is wrong.

**M6. Make side effects owned and reversible.**  
Registration, listeners, timers, views and child components need cleanup owners.

**M7. Do not leave permanent fallbacks.**  
A fallback can aid migration; it must not become a hidden missing feature.

**M8. Migration is done when the old path can be deleted.**  
New code running alongside old code is not completion.

**M9. Stabilize the contract before filling capabilities.**  
Otherwise every new API gap mutates the shell.

**M10. Preserve public behavior while changing internal structure.**  
Separate no-behavior refactors from behavior changes whenever possible.

---

## 6. UX and data integrity

**U1. User data operations must be reversible.**  
Undo, conflict detection, recovery and explicit overwrite confirmation are baseline.

**U2. One capability, one primary surface.**  
Duplicate editors create drift and user confusion.

**U3. Reduce mode switching.**  
Click-to-edit, inline editing and smooth preview/source transitions beat “open another pane.”

**U4. Preserve history.**  
Mode changes, appearance changes and reading mode should not silently discard undo.

**U5. Keep scroll and focus stable.**  
Re-rendering tables, code blocks and long documents must not jump the caret or viewport.

**U6. Make failure visible.**  
Plugin failures, parse errors and conflicts need actionable feedback.

**U7. Progressive disclosure.**  
Simple default surface; advanced behavior through commands, settings or explicit modes.

**U8. Local-first by default.**  
Plain files, portable formats, backup and recovery.

**U9. Performance is part of UX.**  
Bound long content and use internal scrolling instead of page-level blowups.

**U10. Keyboard and accessibility are design inputs.**  
Focus, shortcuts, hit targets and status announcements belong in the first implementation.

---

## 7. Documentation and knowledge management

**D1. One current source of truth.**  
Status/parity lives in one tracker; other docs link instead of copying.

**D2. Separate current, historical and normative documents.**  
Current tracker, evidence log, API spec and release history have different jobs.

**D3. Keep history, label it.**  
Old releases and verification logs are evidence; add a historical banner, not silent edits.

**D4. Maintain one fact in one place.**  
Duplication drifts; links survive.

**D5. Remap references on moves and renames.**  
Document links are dependencies.

**D6. Remove only when a replacement is clear.**  
Do not prune published/reference/historical material without explicit instruction.

**D7. Prune duplicated current claims, not evidence.**  
Subtraction targets overgrowth and stale guidance.

**D8. Put scope and status at the top.**  
A reader or agent should know in seconds what the document is and is not.

**D9. Update docs in the same PR as the behavior change.**  
Tracking after merge is usually stale tracking.

**D10. State boundaries with every supported claim.**  
“Supported” without a boundary is marketing, not engineering.

---

## 8. Scope and prioritization

**P1. Drive the roadmap by blockers, not wishes.**  
Resolve the real first blocker; record the next.

**P2. Walking skeleton before breadth.**  
One complete path first.

**P3. Score by unblock surface × reuse.**  
Prefer work that unlocks multiple plugins/workflows.

**P4. Keep parent capabilities incomplete.**  
Bounded checkpoints are the unit of sign-off.

**P5. Ship observable progress.**  
“The workflow now works” beats “the internal refactor completed.”

**P6. Defer edge APIs until a real input triggers them.**  
Compatibility is demand-driven, not checklist-driven.

**P7. Do not delay the first useful version for architectural perfection.**  
Stabilize the contract; fill capabilities later.

**P8. Schedule security decisions.**  
Do not discover at the end that a workflow needs a relaxed boundary.

**P9. Make goals falsifiable.**  
Every phase states what it does not prove.

**P10. Let evidence override the plan.**  
Corpus results should reorder the roadmap.

---

## 9. PR, review and release workflow

**W1. One vertical slice per PR.**  
Code, tests, docs, evidence and boundaries together.

**W2. Use a stable PR body.**  
What/why, evidence table, boundaries, security notes, review gates.

**W3. CI green is the merge gate.**  
Local success is supporting evidence, not a substitute.

**W4. Review the latest head once, completely.**  
Fix retained findings, reply with the commit, resolve threads; avoid review churn.

**W5. Fix root causes and add regression tests.**  
A comment-local patch is not a fix.

**W6. Record review-rate-limit/skip states.**  
A skipped review is not an approval.

**W7. Treat flakes as operational defects.**  
Attribution first, then harness or implementation fix.

**W8. Keep security and behavior changes separable.**  
Easier review, easier rollback.

**W9. After merge, immediately resync main.**  
Never stack new work on an old base.

**W10. Close the loop.**  
Update the tracker/worklog, record the next blocker, then start the next slice.

---

## Anti-patterns

- Counting exports as compatibility.
- Treating plugin startup as plugin support.
- Silent no-op stubs for unconnected capabilities.
- Global security relaxation for one consumer.
- Leaking reference-application types into host contracts.
- Duplicating current status across multiple documents.
- Fixing review comments without regression tests.
- Rewriting before wrapping.
- Keeping permanent migration fallbacks.
- Claiming parity from bounded tests.

## Increment checklist

Before starting:

- [ ] Is the user-visible workflow identified?
- [ ] Is the evidence layer chosen?
- [ ] Is the current blocker recorded?
- [ ] Is the contract/boundary clear?

Before merge:

- [ ] Real workflow passes at the claimed state.
- [ ] Failure/refusal path is explicit.
- [ ] Tests include a regression for new findings.
- [ ] Docs/tracker updated; history labeled.
- [ ] Security boundary documented.
- [ ] CI green on the latest head.

After merge:

- [ ] Main reset/synced.
- [ ] Tracker/worklog updated.
- [ ] Next first blocker identified.

## Applying this playbook in Crafactory Engine

| Concern | Current reference |
|---|---|
| Plugin/capability status | [PLUGIN-SUPPORT-MATRIX.md](PLUGIN-SUPPORT-MATRIX.md) |
| API boundaries | [PLUGIN-COMPATIBILITY.md](PLUGIN-COMPATIBILITY.md) |
| Export inventory | [API-COVERAGE.md](API-COVERAGE.md) |
| Per-run plugin evidence | [TRUSTED-RENDERER-PLUGIN-TESTS.md](TRUSTED-RENDERER-PLUGIN-TESTS.md) |
| Chronological verification | [VERIFICATION.md](VERIFICATION.md) |
| Kernel/service contracts | [KERNEL-SPEC.md](KERNEL-SPEC.md), [SERVICES-SPEC.md](SERVICES-SPEC.md) |
| Architecture roadmap | [NATIVE-PLUGIN-ARCHITECTURE.md](NATIVE-PLUGIN-ARCHITECTURE.md) |

The playbook is intentionally generic. Do not copy current plugin outcomes into it; link to the
tracker so there is still one source of truth.
