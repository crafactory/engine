# Shared-code Android pilot

Status: Android development pilot with bounded native acceptance, not a production release.
[PR #76 artifacts](https://github.com/crafactory/engine/pull/76) are historical baseline
evidence. Use [VERIFICATION.md](VERIFICATION.md) and the current PR's exact-head Android
check, currently [PR #77](https://github.com/crafactory/engine/pull/77), for later changes.
This increment
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

The native bridge uses guarded vault-relative paths, serialized host mutations,
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
CI uses JDK 21 and the Android SDK. The application imposes WebView 111+ for its modern
editor/CSS, stricter than Capacitor's default minimum of 60; `android.minWebViewVersion`
is the documented configuration key ([Capacitor configuration](https://capacitorjs.com/docs/config)).

This pilot does not include iOS, Play publication, release signing, OEM/device-wide
certification, authenticated Git, desktop-only plugins, SAF, or full mobile parity.
The debug APK is a development pilot, not a signed production release. Hosted debug
signing keys need not match between runs, so a later APK may refuse an in-place update.
Export notes first; never uninstall around an update error without a checked external
copy. The release variant is currently unsigned, and stable signing plus upgrade/migration
acceptance remain future work.
Build with `npm ci && npm run build && npx cap sync android`, then
`cd android && bash gradlew assembleDebug` with JDK 21 and the Android SDK installed.
The output is `android/app/build/outputs/apk/debug/app-debug.apk`; install it on a
disposable test device with `adb install -r` or open the native project with
`npx cap open android` from the repository root.

The dedicated Android workflow builds and installs that APK in an API35 Pixel6 emulator.
Its original acceptance script exercises the actual native filesystem and WebView, not
a responsive browser preview. It records tested commit, APK SHA256, API/WebView version,
per-workflow results, screenshots and logcat in the debug/evidence artifact.
[The first nine-group native pass](https://github.com/crafactory/engine/actions/runs/42184825123)
exercised API35 Pixel6/WebView 124.0.6367.219, real Chinese composition, decoded binary
replacement, history, rotation/worker/renderer identity, unchanged Style Settings,
save-failure/root-Back recovery, isolated background/restart/trust, and actual chooser/ZIP
bytes/permissions/release-fixture exclusion. Screenshot review then found two additional
UI defects: normal share cancellation displayed an error, and narrow settings tabs
overlapped. The final accepted #76 source `ab4fbbe` passed the complete strengthened
[nine-group native workflow](https://github.com/crafactory/engine/actions/runs/42188594088),
including both visual guards; the downloaded APK hash matches its report. This is
historical acceptance for that source, not an inherited verdict for later changes.

Debug builds contain an owned, disabled-by-default composition-test IME. The acceptance
runner selects it explicitly with adb and exercises actual Android `InputConnection`
composition/update/commit events, then restores the emulator keyboard. Its control
receiver requires the shell-only DUMP permission. Release source sets exclude the
fixture; CI builds the release variant too and checks its manifest and debuggable flag.
This is not certification of every vendor keyboard or Chinese candidate-selection UI.

System bars use `insetsHandling:'native'` with the same initial `cover` viewport hint as
the HTML entry point. This preserves native padding on older WebViews and env-based
safe areas on newer ones without early CSS-injection warnings; insets are not disabled
([SystemBars configuration](https://capacitorjs.com/docs/apis/system-bars)).

Mobile navigation uses horizontal, non-shrinking settings tabs rather than overlapping
labels. Canceling the OS share sheet is normal; only the exact observed Android
`Share canceled` response is handled as cancellation, while storage/permission and
other native share failures remain visible. System-bar/theme polish, tablet layouts,
font scaling, accessibility and vendor-keyboard/device matrices still need broader acceptance.

Explicit share exports retain cache copies for 24 hours so recipients can read them.
Expired copies are removed before a new export; retained copies are limited to 12 and
256 MiB total. New exports fail with a visible error at the limit rather than silently
deleting a still-valid recipient file. Canceled shares obey the same retention policy.
