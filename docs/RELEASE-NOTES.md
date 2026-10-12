# Crafactory Engine v0.4.0 prerelease

This independently implemented MIT release adds explicit trusted-renderer plugin settings, Modal, status dock, dedicated custom views and host CodeMirror extensions. Default Worker remains the default; no plugin automatically runs or switches mode.

The Feature checklist now has 98 stable entries, including all 29 core plugins and 33 bounded checkpoints. Worker exposes 27 and trusted renderer 43 bounded runtime symbols; neither is full public-API parity. See [compatibility report](https://github.com/crafactory/engine/blob/main/docs/PLUGIN-COMPATIBILITY.md) and [checklist](https://github.com/crafactory/engine/blob/main/docs/FEATURE-CHECKLIST.md).

Pinned unchanged Reading Time passes eight bounded Linux workflows in trusted renderer. Calendar and Advanced Tables reach startup only, while Dataview and Templater still fail. Default Worker still fails all five. See [real renderer tests](https://github.com/crafactory/engine/blob/main/docs/TRUSTED-RENDERER-PLUGIN-TESTS.md); these results are not comprehensive plugin certification.

Trusted renderer is NOT sandboxed: it accesses the UI/vault bridge and metadata, can freeze the application and cannot be forcibly stopped. Only enable code you trust, and back up important notes first. No proprietary application code, SDK package/declarations or third-party plugin implementation is incorporated into Engine.

Linux AppImage and Debian packages remain unsigned; verify SHA256SUMS.txt against actual filenames. Windows/macOS build success is not native runtime/install verification. Full API/member/event/module, reference differential, security/accessibility, large-vault and native mobile acceptance remain unfinished. This is not complete 1:1 parity.

See [verification ledger](https://github.com/crafactory/engine/blob/main/docs/VERIFICATION.md) for executed tests and outstanding gates.

[Normal verification](https://github.com/crafactory/engine/actions/runs/38205278539) passed 527 units, 36 browser regressions and 23 regular desktop cases (ten optional corpus cases skipped). [Packaged Linux verification and publication](https://github.com/crafactory/engine/actions/runs/38205283089) passed all 33 desktop cases, including both real-plugin modes, before upload. [Three-platform builds](https://github.com/crafactory/engine/actions/runs/38205278999) passed. These results remain bounded Engine validation, not comprehensive Obsidian equivalence.
