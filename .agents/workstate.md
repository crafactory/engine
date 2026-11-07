# Oxc tooling and shared UI migration

Owner requests oxlint/oxfmt, single-file/structure limits and shadcn instead of bespoke
UI controls, while continuing Android/partial parity work. No agents or issues.

## Current increment

PR #78 merged as `7274925` after effective CodeRabbit review and five repaired/resolved
threads. Exact reviewed head `4c68a7b` passes all cloud gates and 11 native groups.
Downloaded artifact 13580085306, verified testedHead and APK SHA256
`cc688bb983076463b508247f9222726af3c2fd405525deb3a1de07269e1005e6`;
inspected portrait, tabs and landscape screenshots. Native report has expected missing
file probes, share cancellation and an injected save-failure diagnostic, not zero console
messages. Browser 83/83, isolated desktop/corpus 105/105, packaged Linux 24/24 pass on
identical production source. A previous native attempt hung; bounded actions/process
were added and fresh native acceptance passed. See PR #78 for review exception/evidence.

Branch `chore/oxc-source-policy` now introduces exact-pinned oxlint 1.92.0 / oxfmt 0.77.0,
check wiring, explicit 500-line defaults/legacy ceilings and source placement guard.
PR #79 opened draft early. Full 233-file conversion exceeded CodeRabbit's 100-file
limit, so no effective initial review occurred and no merge exception applies.
Resize #79 to 95 changed files; 139 existing paths temporarily excluded from formatting,
never new files or whole source directories. Full snapshot is local branch
`backup/oxc-full-2c34e97`; deferred path data is `/tmp/engine-formatter-adoption-remaining.json`.
The snapshot is read-only comparison evidence, never a source for overwriting current
files. Remove exact exclusions and format current contents, preserving later edits.
216 executable files in the original full conversion
match compiled ASTs after documented syntactic/JSX-text normalization.
Intentional lint cleanup is separate. Inventory and CSP extraction tolerate formatter
whitespace without relaxing capability assertions. Format/lint/structure/inventory,
942 units and build pass locally; negative format/lint probes fail as expected.
There are 8 explicit oversized legacy ceilings in the resized increment. JSX now has
explicit structure/length regressions. Effective CodeRabbit review and
full exact-head cloud/native gates remain; do not merge until they pass.

Head `5def3cb` passes both Verify runs, three OS package builds and independent corpus;
local browser 83/83 and desktop 83 with 22 expected no-corpus skips pass. Full local
corpus replay is running with `/tmp/engine-plugin-corpus`. Native run 42387137440 failed
when creation focused the new editor and reopened the real IME, hiding the bottom nav
before the harness clicked Tabs. Failure screenshot/DOM/input diagnostics confirm that
expected keyboard state, not an app layout regression. Uncommitted harness repair now
explicitly clicks the new editor, verifies real/reported IME visibility, presses native
Back and verifies dismissal before Tabs. The script joins the first formatting batch;
its 1068-line post-format ceiling replaces the former compact 554-line ceiling.
Effective CodeRabbit review 5813357111 on `5def3cb` posted four valid findings:
snapshot restoration guidance, parser boundary, parser comments and lone CR counting.
Parser now uses the existing TypeScript AST without executing source; tests cover both
comment findings and fail-closed dynamic elements. CR/mixed-ending boundaries are tested.
The review disclosed three large diffs unavailable to it; manually audited their focused
lint cleanup separately from the existing compiled-AST formatting proof.
One included review/hour is exhausted. Finish this SAME tooling increment by formatting
current remaining files in a separate mechanical commit, not by restoring a snapshot.
Remove all temporary adoption exclusions and document the reviewed semantic phase,
mechanical proof, repairs, service limits and exact-head gates without claiming full
file-by-file review. Use the owner's bounded post-effective-review exception only with
all findings repaired and no known blockers. Do not create unreviewed follow-up merges.

## Next work

Finish this tooling PR's review/repair/merge before shared UI migration. Migrate shared
dialogs, palette/settings/forms using registry shadcn primitives and focused extraction;
existing legacy file ceilings are debt, not permission to grow monoliths. Keep Android
chrome separate, shared editor/storage/plugins, stable plugin DOM lifetimes and native Back.
Then continue concrete partial workflows; full plugin certification remains incomplete.
Deliver private Chinese results with matching APK/evidence, then empty final.

## Constraints

- No upstream plugin implementation inspection/copying or bundle modification.
- Verify author AND committer before every commit/merge; never inspect credentials.
- Follow CONTRIBUTING.md: early PR, bounded effective CodeRabbit rounds, no known blockers.
- Node 22 path: `/tmp/engine-node/node_modules/node/bin`; don't overlap dist builds/E2E.
- Canonical attribution: Created with [Perplexity](https://www.perplexity.ai/computer/tasks/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe).
