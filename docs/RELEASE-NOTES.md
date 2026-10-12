# Crafactory Engine v0.5.0 prerelease

This original MIT increment adds bounded reading-mode Markdown post-processors, named fenced-code processors, MarkdownRenderChild lifecycle and sanitized static MarkdownRenderer methods. Whole-host context includes sourcePath, frontmatter and docId; getSectionInfo deliberately returns null. Async child cleanup, plugin-disable cleanup and late callbacks targeting detached old roots are covered by original fixtures. Live Preview processors, exact section/nested-embed contexts and recursive static post-processing remain unfinished.

The [Feature checklist](https://github.com/crafactory/engine/blob/main/docs/FEATURE-CHECKLIST.md) has 105 stable entries, all 29 core plugins and 40 bounded checkpoints. Worker exposes 27 and trusted renderer 45 bounded runtime symbols, not complete API/member/behavior parity.

Render-child shutdown waits at most one second for startup and one second for unload before owner cleanup can continue. Pending children retain ownership until their old work settles; late registered Component resources clean themselves and canceled startup cannot activate nested children. This is cooperative cleanup, not forced interruption or a sandbox.

The unchanged real-plugin corpus still shows eight bounded Reading Time workflows, Calendar/Advanced Tables startup only, Dataview blocked at App.appId and Templater failing with a generic class load error. Worker rejects all five. See [renderer results](https://github.com/crafactory/engine/blob/main/docs/TRUSTED-RENDERER-PLUGIN-TESTS.md) and [compatibility boundaries](https://github.com/crafactory/engine/blob/main/docs/PLUGIN-COMPATIBILITY.md).

Development and builds use a Pull Request; merge requires completed CodeRabbit review, repaired findings and re-review before subsequent development. Linux release publication is restricted to main. A branch build or candidate document alone is not a published release; publication status and review/CI evidence belong in the PR and release verification update.

Trusted renderer is NOT sandboxed and cannot forcibly stop main-thread code. Only enable trusted code and back up important notes first. No proprietary application/SDK code or community-plugin implementation is incorporated. Dependencies retain their own licenses.

Linux packages remain unsigned. Windows/macOS builds are not native runtime/install acceptance. Full API, installed-reference differential, security/accessibility, large-vault and native-mobile validation remain incomplete. This is not complete 1:1 parity. See the [verification ledger](https://github.com/crafactory/engine/blob/main/docs/VERIFICATION.md).
