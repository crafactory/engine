# Crafactory Engine v0.5.0 prerelease

This original MIT increment adds bounded reading-mode Markdown post-processors, named fenced-code processors, MarkdownRenderChild lifecycle and sanitized static MarkdownRenderer methods. Whole-host context includes sourcePath, frontmatter and docId; getSectionInfo deliberately returns null. Async child cleanup, plugin-disable cleanup and late callbacks targeting detached old roots are covered by original fixtures. Live Preview processors, exact section/nested-embed contexts and recursive static post-processing remain unfinished.

The [Feature checklist](https://github.com/crafactory/engine/blob/main/docs/FEATURE-CHECKLIST.md) has 109 stable entries, all 29 core plugins and 44 bounded checkpoints. Worker exposes 27 and trusted renderer 45 bounded runtime symbols, not complete API/member/behavior parity.

Render-child shutdown waits at most one second for startup and one second for unload before owner cleanup can continue. Pending children retain ownership until their old work settles; late registered Component resources clean themselves and canceled startup cannot activate nested children. This is cooperative cleanup, not forced interruption or a sandbox.

Same-object Component reload waits for prior startup settlement. Revoked contexts cannot unload a child belonging to a successor session. These ownership invariants have original unit/native tests; they do not guarantee isolation from arbitrary trusted code.

Reload also waits for full prior unload. Registered resource cleanup starts without waiting for user unload hooks or other cleanup promises, so a pending hook cannot retain managed global handlers. Hook/child/callback invocation order remains defined; asynchronous completion may overlap. All completion promises are awaited cooperatively, not forcibly interrupted.

The unchanged real-plugin corpus still shows eight bounded Reading Time workflows, Calendar/Advanced Tables startup only, Dataview blocked at App.appId and Templater failing with a generic class load error. Worker rejects all five. See [renderer results](https://github.com/crafactory/engine/blob/main/docs/TRUSTED-RENDERER-PLUGIN-TESTS.md) and [compatibility boundaries](https://github.com/crafactory/engine/blob/main/docs/PLUGIN-COMPATIBILITY.md).

Repeated public lifecycle calls remain idempotent inside their matching hooks, while private host tracking preserves actual completion waits. Stop revokes managed processors even during pending plugin startup and rejects later registrations; arbitrary startup may still block complete shutdown. Cross-note testing explicitly settles a canceled Test.md callback after switching to Next.md. Daily-note deferred focus no longer steals the template palette input, and changing palette kind resets its query and selection.

Synchronous and asynchronous code-handler failure restores the original code block before owner error reporting, independently of any subsequent host rerender.

Development and builds use a Pull Request; merge requires completed CodeRabbit review, repaired findings and re-review before subsequent development. Linux release publication is restricted to main. A branch build or candidate document alone is not a published release; publication status and review/CI evidence belong in the PR and release verification update.

Trusted renderer is NOT sandboxed and cannot forcibly stop main-thread code. Only enable trusted code and back up important notes first. No proprietary application/SDK code or community-plugin implementation is incorporated. Dependencies retain their own licenses.

Linux packages remain unsigned. Windows/macOS builds are not native runtime/install acceptance. Full API, installed-reference differential, security/accessibility, large-vault and native-mobile validation remain incomplete. This is not complete 1:1 parity. See the [verification ledger](https://github.com/crafactory/engine/blob/main/docs/VERIFICATION.md).
