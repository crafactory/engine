# Git source control, diff and history

## Current increment

Owner requested continuing after #83. Main baseline is f55bcfc; branch
`fix/git-diff-workflow`, ready PR https://github.com/crafactory/engine/pull/84.
Candidate 847037d received one effective CodeRabbit review; its valid findings
and both test nits were fixed in 6ecc8ce and both threads resolved. No agents or upstream implementation
inspection. Opaque pinned Git 2.42.0 runs only in a disposable native-trust desktop
profile with synthetic identity and local bare remote, never personal credentials.

## Reproduced gaps and implementation

Baseline command staging/commit worked, but Source Control failed on DOM getAttr
and workspace getRoot. Original negative contracts failed as expected.
Implemented HTML/SVG getAttr, stable same-document root/container identities,
desktop real-disk adapter.exists and controlled adapter.read/write.
The existence query is permission/path checked; missing returns false, other
errors propagate. Android/browser hosts without the capability reject explicitly.
Menu/MenuItem and shared failure/native adapter capabilities are focused
extractions, not raised source ceilings.

Interactive black-box probing subsequently exercised working-tree diff, real
index stage/unstage and normal child-commit history diff. It exposed host toolbar
layout and stale reused-view headers, fixed with scoped workspace CSS and header
refresh. Six focused Electron cases passed, including real diff typing/save,
index stage/unstage, staged-only commit preserving an unstaged sentinel, local
push/pull and child history excluding later work edits. Five of the six cases are
owned contracts. Interactive dark/light and resized narrow/short desktop were
inspected; narrow desktop navigation must close to expose overlay plugin panes.
New adapter reread, unseen-write conflict and native draft
isolation contracts pass with the strengthened opaque Git workflow. Per-plugin
observed versions are separate from native editor save versions. Staged diff now
uses different working bytes, and staged-only commit preserves an unstaged
tracked modification plus an untracked file. Do not claim final acceptance yet.
Pinned plugin root-commit
history diff errors on nonexistent parent `HEAD^`; record as an explicit limitation,
not a host fix or full history certification.

## Next checks

- Commit/push the clock setup fix; review threads are already handled. Included CodeRabbit quota is
  exhausted after one effective round; do not churn requests. Freeze final head and run
  full check/browser/source Electron with all eleven corpus inputs, all platform
  builds/Android gates and downloaded Linux package replay. Merge that exact head.
- Candidate6ecc8ce local 972-unit/121-browser/116-source gates, three-platform
  builds and Android passed, but both CI Verify runs failed a new clock setup
  race ("Cannot fast-forward to the past"). Fixed-epoch future-pause setup
  passed five repeats of both contracts (10/10) before a new frozen head. Its package run was interrupted,
  not accepted. Do not reuse old-head results as final acceptance.
- Android candidate6ecc8ce passed; final-head native run must pass too.
  Do not waive the gate or confuse old-head/partial passes with it.
- Preserve accepted evidence/corpus; free disk currently about 1.9 GiB. No overlapping
  local builds/Electron tests or watched source/docs writes during replays.

## Communication and attribution

Current request already has one private Chinese acknowledgment. Send one private
results email with cc=[] when complete, then an empty final. No extra acknowledgment.
Verify configured author AND committer before every commit/merge; never inspect
credentials or override configured repository identity.
Commits end with `Co-authored-by: Perplexity <noreply@perplexity.ai>` exactly once.
PR bodies/GitHub comments only, on their own final line:
`<sub>Created with [Perplexity](https://www.perplexity.ai/computer/tasks/6cd27721-c736-5d46-b8cf-1f89aa2c3cbe)</sub>`.
Do not put that footer in user replies or emails.
