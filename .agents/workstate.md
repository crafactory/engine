# Git source control, diff and history

## Current increment

Owner requested continuing after #83. Main baseline is f55bcfc; branch
`fix/git-diff-workflow`, draft PR https://github.com/crafactory/engine/pull/84.
First reproduction commit 73dbdac is pushed. No agents or upstream implementation
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
Do not claim final acceptance yet. Pinned plugin root-commit
history diff errors on nonexistent parent `HEAD^`; record as an explicit limitation,
not a host fix or full history certification.

## Next checks

- Commit/push, ready draft, bounded CodeRabbit review/fix. Freeze final head and run
  full check/browser/source Electron with all eleven corpus inputs, all platform
  builds/Android gates and downloaded Linux package replay. Merge that exact head.
- Earlier Android CI stopped with adb uiautomator status137/Killed. Final-head native
  run must pass; do not waive the gate or confuse old-head/partial passes with it.
- Preserve accepted evidence/corpus; free disk currently about 2.3 GiB. No overlapping
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
