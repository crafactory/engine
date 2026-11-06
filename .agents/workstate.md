# Functional-parity completion: Footnotes view

## Current request and baseline

Owner asks to continue completing partial/missing workflows after seeing new PRs merge,
and reports not receiving messages. A private Chinese acknowledgment was queued;
delivery is not confirmed. Continue real implementation, not a plan-only answer. No agents.

PR #74 is merged at `afe83d439f7b58b42b3182d456614f039316222c`.
Do not restart it or present its historical test counts as new evidence.
PR #75 is merged at `191e8529c8ba52774eb87c1f3db984bbfa4ee16d`.
PR #76 merged at `fffc30e`; final accepted source `ab4fbbe`, all exact-head cloud gates green,
nine-group native run `42188594088`, matching APK/report emailed privately. Its production
runtime freeze passes 915/56 units, 70 browser, 104 Electron including all 22 pinned corpus
cases/no skips, and 23 actual Linux-package vault cases. Those are historical results.
Current branch: `feat/footnotes-core-view`.

## Active increment

Implement the missing core Footnotes view from public behavior: current-note list, click
to edit, per-reference navigation. Native lazy view uses AST positions and original inline
scanning, with no plugin body reading. Editing delegates to the actual source editor,
retaining normal undo/save/conflict behavior; mobile closes its covering drawer first.
PR #77 is open and has completed effective CodeRabbit review (four minor findings).
Repairs preserve raw source labels, index literal ranges, parse in a dedicated Worker,
clean pending jumps when notes change and distinguish historical Android evidence.
Cold-cache four-case browser replay, check/build and native footnotes disk/restart pass.
The earlier 773cfb8 full regression is historical, not evidence for the Worker runtime.
Android attempts failed on launcher ANR/device offline, not a pass. Native screenshot and
window dump justify a bounded, evidence-preserving exact Pixel Launcher recovery only.
Cloud corpus exposed late Excalidraw release notes; an exact-dialog close-button handler
replaces fixed-delay dismissal. Neither change weakens original acceptance assertions.
Frozen e31b3f7 runtime passes 929/57 units, 74 browser and 105 Electron/all 22 corpus/no skips.
Three new launcher-recovery parser cases plus static driver checks pass.
8faf65b passes both cloud Verify runs, three-platform packaging and independent corpus.
Native replay passes four groups then exposes real startup Back ownership: subscriptions
were gated on loading even though shell drawers are interactive. Register them for the
mounted shell; a gated-discovery browser regression fails before and passes after.
This new production repair needs its own full replay and all exact-head gates.
The old parity ledger incorrectly retained Mobile "Not implemented" after #76 passed;
align it with the actual nine-group pilot, without upgrading production/device claims.
`docs/FOOTNOTES.md` defines contracts, not a passing verdict.

## Next increments

- Commit driver/documentation follow-up and rerun all exact-final-head cloud gates.
  The initial effective review's four repaired threads are resolved.
- Require all final-head Verify, three-platform packaging, ten-group Android and independent
  pinned corpus gates; inspect artifacts/screenshots and fix findings before merge.
- Keep `docs/PLUGIN-SUPPORT-MATRIX.md` the single external-plugin verdict tracker.
  Bookmark grouping, advanced search, core Canvas, Copilot secure secrets/inference,
  authenticated/conflicted Git and SAF/shared vaults remain separate unfinished workflows.
- Email concrete merged results privately in Chinese; distinguish queued from delivered mail,
  and completed bounded workflows from full installed-reference equivalence.

Never overlap dist rebuilds with E2E or reuse concurrent Playwright output directories.
Native artifacts from failed runs are diagnostic inputs, not final accepted APKs.
Critical: `bridge.ts` snapshots window.engine at module initialization; bootstrap installs
the Android bridge BEFORE dynamically importing App, not statically importing App first.

## Constraints

No agents or issue creation. Never inspect/copy upstream plugin implementations or change
pinned bundles/styles. Public declarations/docs and runtime black-box observations only.
Use feature branches/early PRs, verified author/committer before every commit, effective
initial CodeRabbit review and no known blocker/failing exact-head checks at merge. After
one or two effective review/fix rounds, optional review quota limits do not block delivery.
The narrow binary check/rename race remains explicitly accepted, not fixed.

## References

Project: `CONTRIBUTING.md`, `docs/REPLICATION-PLAYBOOK.md`; log `.agents/worklog/2026-11-06.md`.
Corpus `/tmp/engine-plugin-corpus`; Node 22 `/tmp/engine-node/node_modules/node/bin`.
Prior request history: read-only `~/.perplexity/sessions/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe/`.
