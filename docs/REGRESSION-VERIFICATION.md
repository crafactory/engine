# Canvas / Live Edit verification

This is a bounded Engine regression record, not an installed Obsidian differential certification.

## Initial candidate

The first new browser run passed link navigation, widget DOM reuse/callback remapping, conversion rejection and status geometry. Three assertions failed: two assumed a Markdown title/editor mode on a Canvas view, and one inspected a `.cm-cursor` before explicit CodeMirror selection drawing was enabled. The tests were corrected to exercise the actual Canvas mode; selection drawing is now explicit. These were candidate iterations, not a claimed baseline execution against v0.5.

## Current local evidence

- Unit tests for rename normalization and safe inline-link parsing pass.
- Existing 36 browser regressions and the initial seven new regression cases passed together (43 total).
- All nine new browser regression cases subsequently passed, including empty/malformed Canvas and editable active link source.
- Desktop suite passed 34 cases, with ten corpus cases skipped without external inputs. The added native Canvas test checks exact original JSON bytes, original and destination file existence, absence of accidental `.md`, rewritten embed, reading/Live rendering and reopening.
- Full latest-head CI, three-platform builds, pinned-plugin corpus and packaged executable validation must still be recorded after the PR gate. Earlier local passes do not certify later changes.

The corrected follow-up candidate passed 553 unit tests, TypeScript/production build, all 48 browser cases and all 45 Linux desktop cases with both fixed plugin corpus modes enabled (35 regular + ten corpus cases). This supersedes the initial 550/45 local browser totals above; current remote and packaged evidence is still pending until recorded against a commit. Production dependency audit reports zero known advisories, not a security guarantee.

## Baseline and deeper regression

Seven selected browser checks were also run against the actual v0.5.0 merge `eb01c5f7bb31317f675b1bfae5f1dff72f1fd16c` in a detached worktree: all seven failed as expected (Canvas embed, extensionless rename, conversion refusal, inactive Live links, measured table reuse, status geometry, empty/malformed embed). This is a real prior-build comparison, separate from the candidate iteration above.

An additional 100-row bottom-cell test exposed a still-present jump after commit in the initial v0.6 candidate. React reconciliation alone was insufficient: block-backed edits now use minimal source deltas and CodeMirror's mapped scroll snapshot. The focused input and committed cell visibility test passes after this correction. Header blur-to-next-cell behavior is tested as a single click, rather than requiring the second click previously needed after the old root was discarded.

CodeRabbit's first review reported uppercase Canvas/Base view selection, insufficient required context-link geometry, missing direct requirements linkage and 41.18% docstrings. Follow-up changes retain case-insensitive views/icons/search, require actual visible context-link bounds, add dark/light/375px checks and a compact non-overlapping link, directly link requirement issue #4, and document touched functions. These changes still require completed re-review.

## Boundaries

100-row table plus 120 paragraphs is a regression fixture, not large-Vault performance certification. Inline links support bounded destinations; nested parentheses, escaped labels and full inline grammar remain incomplete. Canvas file-card rendering and recursive embedding are not declared equivalent. Native Windows/macOS installation and running, mobile, signed packages, accessibility/security audits and exhaustive Obsidian plugin behavior remain unverified.

`NATIVE-PLUGIN-ARCHITECTURE.md` is a proposal with unchecked migration gates. No all-plugin kernel implementation is claimed.
