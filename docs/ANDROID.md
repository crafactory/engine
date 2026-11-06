# Shared-code Android pilot

Status: implementation in progress, not yet an accepted Android build. This increment
follows the merged [Live Editing repairs](https://github.com/crafactory/engine/pull/75).
The current plugin verdicts remain in [PLUGIN-SUPPORT-MATRIX.md](PLUGIN-SUPPORT-MATRIX.md);
host-wide gaps remain in [PARITY.md](PARITY.md).

## Framework decision

Use Capacitor for Android only, keeping the existing React DOM, CodeMirror editor,
Markdown renderer and DOM-based compatibility layer. Capacitor is designed to host web
applications in native containers ([official introduction](https://capacitorjs.com/docs)).
React Native instead creates native platform views, so reusing this DOM-centric editor
would require a substantial rewrite or another WebView layer; this is an architectural
assessment, not a benchmark ([React Native components](https://reactnative.dev/docs/intro-react-native-components)).
Tauri is another shared-web-UI option, but adds Rust, Android NDK and Rust-target setup
to this repository's TypeScript/Java bridge stack ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)).

Obsidian's public documentation confirms a mobile WebView and the absence of Node/Electron
APIs on mobile. It does not establish that Obsidian uses Capacitor, and this project makes
no such claim ([Obsidian mobile development](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development)).

## Acceptance scope

- Build an actual Android debug APK, then run it in an Android emulator, not a browser
  viewport masquerading as an app.
- Install a native persistent bridge before importing the shared App. Do not silently
  fall back to the temporary browser vault if native initialization fails.
- Keep notes, assets, state, history and plugin data in app-private storage. Shared
  folders/Storage Access Framework and multi-vault selection are not part of this pilot.
- Preserve drafts on backgrounding without permanently unloading plugins. Handle the
  keyboard, Android Back, note navigation and save failure before root-back minimization.
- Reuse shared actions with mobile touch navigation, safe-area layout and touch targets.
- Verify real note bytes, overwrite, restart, decoded assets, keyboard/back, composition
  and bounded unchanged-plugin settings controls in the native WebView.
- Keep Node/Electron unavailable. Refuse `isDesktopOnly` manifests on Android, rather
  than advertising native desktop capabilities.

## Storage and trust boundaries

Capacitor `Directory.Data` is the application's private files directory on Android, and
uninstalling deletes those files. Users need an explicit export before uninstalling;
app-private storage is not shared-folder interoperability or a complete backup strategy
([Filesystem API](https://capacitorjs.com/docs/apis/filesystem)).
The public Filesystem contract does not promise rename-overwrite or crash durability.
Acceptance must observe normal native overwrite/restart; do not claim power-loss safety
from those tests ([Filesystem API](https://capacitorjs.com/docs/apis/filesystem)).

The planned native bridge uses guarded vault-relative paths, serialized host mutations,
optimistic versions and staged publication. This is not a per-plugin sandbox or an
atomic cross-process lock. Trusted renderer plugins share the app's JavaScript/native
Capacitor capabilities and app-UID access, not desktop OS-user Node access.

Keep HTTPS localhost, no development server URL, no mixed content and no navigation
allowlist expansion. External navigation normally opens outside the WebView; Capacitor
documents `allowNavigation` and cleartext as unsuitable production relaxations
([Capacitor configuration](https://capacitorjs.com/docs/config)).
An Android-only CSP must be installed before plugin startup without weakening the
desktop's separately confirmed unsafe-eval policy.

## Build requirements

Capacitor 8 requires Node 22+ and Android Studio 2025.2.1+; Studio supplies a suitable JDK
([environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)).
CI will use JDK 21 and the Android SDK. The application imposes WebView 111+ for its modern
editor/CSS, stricter than Capacitor's default minimum of 60; `android.minWebViewVersion`
is the documented configuration key ([Capacitor configuration](https://capacitorjs.com/docs/config)).

This pilot does not include iOS, Play publication, release signing, OEM/device-wide
certification, authenticated Git, desktop-only plugins, SAF, or full mobile parity.
Build/runtime commands and exact acceptance evidence will replace this in-progress
status after verification.
