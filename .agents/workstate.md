# Oxc tooling and shared UI migration

Owner requests oxlint/oxfmt, single-file/structure limits and shadcn instead of bespoke
application controls, continuing Android/partial parity. No agents or issue creation.

## Current increment

PR #78 merged as `7274925` after effective CodeRabbit review and five repaired threads.
Accepted head `4c68a7b`: native run 42385402604 passes 11 groups; artifact 13580085306,
APK SHA256 `cc688bb983076463b508247f9222726af3c2fd405525deb3a1de07269e1005e6`.
Downloaded APK/report and inspected portrait, tabs, landscape. Report includes expected
missing-file/share-cancel/injected-save-failure messages, not zero console errors.

PR #79 branch `chore/oxc-source-policy`: exact oxlint 1.92.0 / oxfmt 0.77.0, CI check
wiring, 500-line defaults, 17 exact post-format legacy ceilings and source placement
guard including JSX. New flat/unknown-domain/deep source files fail. Never regenerate
or increase ceilings merely to pass a functional change.

Original 233-file review exceeded CodeRabbit's 100-file limit. Resized semantic/tooling
phase to 94 files and received effective initial review 5813357111 on `5def3cb`.
All four findings repaired in `0af1727`: snapshot restoration risk, export-array boundary,
comment parsing, lone-CR counting. Export extraction uses existing TypeScript AST,
never execution; regressions cover comments, dynamic elements and mixed line endings.
Three large diffs were unavailable to the bot (App, compat-core, renderer suite);
manually audited their narrow lint cleanup separately from mechanical formatting.

That review exhausted one-included-review/hour allowance. Finish the SAME tooling
increment with remaining pure formatting in a separate commit rather than new unreviewed
follow-up merges. All temporary exact-path exclusions are now removed. Formatted current
139 files directly, preserving native harness repairs: 137 executable JS/TS files have
matching compiled ASTs after parentheses/property-quote/regex-flag/adjacent-literal-React-
children normalization. Evidence `/tmp/engine-format-remaining-ast.json`; old snapshot
`backup/oxc-full-2c34e97` is read-only comparison evidence, never restoration guidance.

Reviewed head passes both Verify runs, all OS builds, independent corpus, local browser
83/83 and full real-plugin desktop 105/105 (no skips). Its native run 42387137440 failed
because new-note focus reopened the real IME before the harness used hidden navigation.
Screenshot/DOM/native diagnostics confirm expected IME state. `0af1727` adds explicit
editor click, native/reported IME show assertion, Android Back and hide assertion before
Tabs. No forced click or app behavior change. Repair check passes 944 units/build.
Final whole-format head's check, cloud/native gates and thread resolution remain pending.
Do not merge with a failing gate or known blocker; document bounded-review exception,
repairs and exact evidence without claiming file-by-file review of the final diff.

## Next work

After this tooling increment merges, migrate shared dialogs, palette, settings/forms
to registry shadcn primitives with focused extraction. Existing legacy ceilings are
debt, not permission to grow monoliths. Preserve plugin DOM lifetimes, native Back,
editor/storage and separate Android chrome. Continue concrete partial workflows later;
full plugin certification remains incomplete. Deliver private Chinese results with a
matching accepted APK/evidence, then empty final.

UI baseline captured through js_repl in `/tmp/engine-ui-baseline-*.png`. Managed sandbox
browser_start failed; diagnostic recorded. Persistent `engineUiBrowser`, `engineUiPage`
available in js_repl. Vite command 89044 serves 5173. Default Welcome is reading mode,
so its mounted editor is hidden. Baseline prompt and palette/Settings captured.

## Constraints

- No upstream plugin implementation inspection/copying or bundle modification.
- Verify author AND committer before every commit/merge; never inspect credentials.
- Follow CONTRIBUTING: early PR, effective initial review, bounded repairs, exact-head gates.
- Node 22: `/tmp/engine-node/node_modules/node/bin`; don't overlap builds and E2E.
- Attribution: Created with [Perplexity](https://www.perplexity.ai/computer/tasks/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe).
