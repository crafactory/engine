# Development and review workflow

New development and build changes go through a feature branch and Pull Request. Do not push development directly to main.

Before merging, wait for CodeRabbit to finish reviewing the latest revision, address every reported issue, request another review after fixes, and verify that no review issues remain unresolved. Passing tests alone does not replace the completed review. If review is unavailable or blocked, leave the PR open and report the blocker; do not bypass review or merge with unresolved findings.

PRs run regular verification and three-platform package builds. Formal Linux publication is restricted to main, after the reviewed PR has merged. Continue later development only after this review/repair/merge cycle is complete.

Compatibility remains a clean-room, original MIT implementation based on public behavior. Keep all incomplete parent features unchecked. Test real upstream plugin bytes only in disposable vaults, without rewriting, incorporating or distributing those implementations.
