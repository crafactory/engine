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
Open draft early, then apply separately reviewable mechanical formatting and intentional
lint repairs. Inventory export parser now tolerates formatting and has regressions.
Do not merge until an effective review, repairs and all exact-head gates pass.

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
