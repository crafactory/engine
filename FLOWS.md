# Main flows

## Shared editing and navigation
- Open a vault, open and create notes, edit in Source/Live editing, switch to Reading view.
- Expect exact persisted Markdown after reload, local assets decoded, and visible save errors rather than lost drafts.
- Search, quick switcher, command palette, bookmarks, note context/footnotes, settings and plugin contributions remain reachable.
- Desktop keeps its ribbon, draggable tabs, breadcrumbs, status and split/workspace behavior.

## Android content-first shell
- Start at phone size or rotate to landscape/tablet size.
- Expect one document, a top-left Files entry, top-right reading/actions controls and one six-button bottom pill.
- No desktop ribbon, tab strip, breadcrumbs, status strip, drag tabs or restored split.
- Open Tools for settings, commands, editing modes, bookmarks, note context and plugin actions.
- Open tabs from the bottom count, switch and close actual tabs, then return to editing.
- Back dismisses the current sheet/drawer/modal before changing note history; keyboard Back hides the keyboard first.
- Imported desktop layouts do not reopen drawers/splits. Mobile layout saves do not overwrite the desktop layout.
- Reload retains mobile tabs/mode/active note, but transient drawers/sheets stay closed.
- Sheet controls use shadcn/Radix. Dismiss/reopen preserves plugin DOM identity; invoking
  plugin actions releases sheet focus/inert state before the plugin modal opens.
- Test 390px portrait, 844px landscape, large native viewport and unchanged 1440px desktop.

## Native acceptance
- Build and install the exact-head APK; run native filesystem/IME/Back/restart/rotation/export/plugin/footnotes gates.
- Preserve the existing disk-byte, composition, plugin-isolation and export assertions while adapting entry points.
- Inspect native screenshots, touch targets and console/errors; browser fixtures are not native certification.

## Shared control migration
- New note/rename selects the initial text; Enter submits; Escape, Cancel and outside
  click cancel without mutations. Tab remains within a modal prompt and focus returns.
- Quick switcher and command palette keep host fuzzy ranking, 60-result cap, arrow
  navigation, Enter/click selection, empty-query behavior and creation from no results.
- Selecting a command releases palette focus before opening a prompt or plugin modal.
- Settings keeps appearance/editor/files/hotkeys/core/community/extensions/about and
  plugin contribution panels. Changes still save, permission warnings remain explicit,
  failed native requests do not grant UI trust, and desktop-only controls stay disabled
  on Android. Existing plugin DOM containers and callbacks retain their identity.
- Check all settings navigation entries in short landscape and 375px portrait,
  dark/light themes, long labels and keyboard-open native states.
- Use registry primitives with the existing prefixed, no-preflight shared theme.
  Retest native Back ownership and real IME, not only simulated browser events.
