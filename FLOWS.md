# Main flows

## Live table composition continuity
- Open a cell in Live editing at 1440px and 390px. Start Chinese composition:
  candidate Enter, Tab and Escape must not save, navigate, cancel or replace
  the focused input. Retain measured columns and the following block's position.
- After composition ends, keep the final draft until an ordinary Enter or blur
  saves it; an ordinary Escape cancels. A composing blur must defer saving until
  compositionend and use the final DOM value, not the earlier React draft.
- Preserve native isComposing and legacy keyCode 229 guards, last-cell Tab row
  insertion, Shift+Tab navigation, source delimiters and unrelated block identity.
- Desktop source and actual package must persist exact Markdown across restart.
  Android must use a held real InputConnection composition, native key events,
  keyboard Back, rotation and restart, not a CDP-only composition fixture.

## Standard property editing
- Use registry controls for inline values, actions and the type menu, without
  legacy appearance overrides. Preserve Neutral themes and plugin DOM isolation.
- Keyboard opens/navigates/selects a type and returns focus; Escape/outside dismiss.
- IME confirmation must not commit partial text/list composition; Escape cancels
  a local draft without changing committed values.
- Empty explicit number/date/datetime values stay empty rather than becoming zero;
  invalid/non-finite numbers cannot overwrite the previous saved value.
- Add/remove/edit properties, switch notes/modes and restart; verify YAML values
  and persisted vault-wide explicit types.
- Inspect desktop dark/light, 375px phone and short landscape, menu containment
  and native targets of at least 44px. Run the exact-head native gate.

## Standard shadcn appearance
- The owner requires standard New York/Neutral visuals, not registry primitives
  recolored with the old green visual system. Inspect desktop and native shells,
  Settings, palette, prompts and Android Tools in both saved themes.
- Compare rendered controls with registry defaults: neutral semantic colors,
  visible solid borders, standard radii, padding and selected/hover states.
- Scoped resets may restore registry preflight assumptions only on owned slots;
  do not globally reset CodeMirror, Markdown or imperative plugin DOM.
- Preserve separate desktop/native compositions, mobile pill/navigation, 44px
  native targets, modal ownership, keyboard/IME and plugin DOM identity.
- Check 1440px desktop, 375px phone and 844x390 short landscape; inspect real
  screenshots, long labels, focus/hover/selected states and the actual native APK.
- Remaining unmigrated forms/menus are still partial, not certified by a theme change.

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
- Replacing an open prompt reselects its initial input, or focuses Cancel for a
  confirmation, while preserving the original return-focus target.
- Quick switcher and command palette keep host fuzzy ranking, 60-result cap, arrow
  navigation, Enter/click selection, empty-query behavior and creation from no results.
- Whitespace-significant file IDs remain distinct; composition Enter neither opens
  an existing selected result nor creates a missing note.
- Selecting a command releases palette focus before opening a prompt or plugin modal.
- Settings keeps appearance/editor/files/hotkeys/core/community/extensions/about and
  plugin contribution panels. Changes still save, permission warnings remain explicit,
  failed native requests do not grant UI trust, and desktop-only controls stay disabled
  on Android. Existing plugin DOM containers and callbacks retain their identity.
- Check all settings navigation entries in short landscape and 375px portrait,
  dark/light themes, long labels and keyboard-open native states.
- Use registry primitives with the existing prefixed, no-preflight shared theme.
  Retest native Back ownership and real IME, not only simulated browser events.
- Settings native selects reserve space for their chevron in the actual CSS cascade.
- An asynchronous render child may attach after sibling mutations; only a subsequent
  removal retires it. Never-attached children still drain when their session closes.
