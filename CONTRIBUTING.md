# Development and review workflow

New development and build changes go through a feature branch and Pull Request. Do not push development directly to main.

Open PRs early and push frequent, reviewable commits. Request CodeRabbit review early and normally use one or two effective review-and-fix rounds; do not repeatedly chase optional feedback or bot approval at the expense of feature delivery. Fix known blocking correctness/security issues and add regressions. Resolve repaired threads and explicitly record any accepted risks or deferred non-blocking suggestions.

Required checks must pass on the exact merge head. If CodeRabbit is rate-limited or otherwise unavailable after effective review-and-fix rounds, a maintainer-authorized merge may proceed when no known blocking issue remains. Record the completed review revision, subsequent repairs, verification and review-service limitation in the PR. This exception does not permit an unreviewed PR, failing required checks, or an unfixed blocking finding. Passing tests alone does not replace the initial effective review.

PRs run regular verification and three-platform package builds. Formal Linux publication is restricted to main, after the reviewed PR has merged. Continue later development after the review/repair/merge cycle, including an explicitly documented review-service exception when applicable.

Compatibility remains a clean-room, original MIT implementation based on public behavior. Keep all incomplete parent features unchecked. Test real upstream plugin bytes only in disposable vaults, without rewriting, incorporating or distributing those implementations.
