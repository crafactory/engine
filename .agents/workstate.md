# Popular-plugin compatibility increment

## Scope and evidence

User authorized implementation, documentation alignment, PR submission, CodeRabbit feedback fixes, and merge after checks. Base is merged PR #70. Follow AGENTS.md and the replication playbook; do not inspect third-party implementation source or copy it into Engine.

Popularity target: all-time top ten from https://www.obsidianstats.com/most-downloaded, fetched 2026-11-03. Excalidraw, Templater, Dataview, Tasks, Git, Advanced Tables, Calendar, Copilot, Style Settings, Kanban. The provider's cached snapshot is dated 2026-10-09, not a live November count. Reading Time remains an additional regression sentinel, not a top-ten claim.

## Current increment

Expand the SHA-pinned corpus from five to eleven targets. Add original documented keyboard scope, suggestion modal, English UI language, text-file view persistence, CSS-change notifications, and missing Lezer module adapters. Preserve Worker boundaries and explicit trusted-renderer opt-in. No Node filesystem/process broadening.

## Verification and remaining work

Use Node 22 at `/tmp/engine-node/node_modules/node/bin`; the sandbox default Node 18 is too old for existing Vite/Vitest dependencies. Corpus lives outside the checkout at `/tmp/engine-plugin-corpus`.

Baseline from PR #70: Dataview, Reading Time, Templater, Advanced Tables, and Calendar all have bounded workflows. Templater includes declarative/dangerous-confirmation settings, startup templates, user scripts, insertion/create-note and disable/re-enable; Advanced Tables verifies live formatting; Calendar verifies today's daily note. These existing results must not be downgraded to startup-only. Copilot has startup-only evidence; all six new targets now have observed startup outcomes. Additional runtime gaps must be reported, not hidden or called full compatibility. The full top-ten compatibility goal remains unfinished until actual workflows pass.

Prior application increments included persisted property types, inline properties, live list markers, reading-mode undo, callout folds, code copy, `engine.compat/v1`, native support plugin and bounded metadata. Recent reviews fixed active-note save, case-insensitive available paths, save ordering, storage fallback, exact-path reusable leaves and App local storage. Preserve these contracts.

Before commit: run build, unit/browser/desktop suites, both corpus modes; regenerate reports and inventory; align support/member docs. Submit PR, wait for CodeRabbit, address actionable comments, rerun checks, then merge only when clean.

## Verified increment outcome

The native suite passed 70/70 including both eleven-input corpus modes. Unit tests passed 834/834. Browser run passed 63/64; the sole failure was an existing fake-clock pause target only one second after installation, which became past during a cold reload. Its target now has a five-minute margin, and the isolated corrected daily-note test passed. Final CI must run the complete browser suite on the final commit.

Renderer evidence: six bounded workflow passes including Reading Time (five top-ten targets), two clean startup-only targets (Excalidraw and Style Settings), two startup refusals (Git and Kanban), one startup with background errors (Copilot). Tasks preserves its recoverable property-type warning. Worker refuses all eleven inputs without making compatibility claims.

Late hardening awaiting final targeted rerun: icon ID acronym round trips, accessible icon-button tooltip, idempotent native close and property-type close flush. The early-close handshake already fixed the formerly hanging unsafe-eval restart teardown.
