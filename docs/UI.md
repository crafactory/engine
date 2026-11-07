# UI component foundation

Use registry-generated shadcn/ui widgets for application UI rather than adding another
bespoke button, modal, drawer or input system. Platform compositions still own their
layout and domain behavior. This does not replace the Obsidian-compatible plugin DOM API.

## Current migration

- `components.json` records the New York registry style, `ui` utility prefix and aliases.
- Button, Sheet, Dialog, Command, Input, Textarea, Switch and NativeSelect come from
  shadcn CLI 4.23.0. Ref-consuming primitives use React 18 `forwardRef`.
- The shared `IconButton` delegates to Button while retaining existing application classes.
- Android header/navigation use Button, and its tab/Tools overlay uses Sheet (Radix Dialog).
  Plugin contributions live in a stable owned portal container, parked while closed,
  not destroyed each time Radix unmounts the sheet.
- Commands close the sheet before invoking their action, so plugin dialogs can acquire
  focus. Native Back, Escape, focus return and retained plugin host identity have regressions.
- Shared prompts, palette and settings now compose registry controls. Palette retains
  host fuzzy ranking and a 60-result cap; cmdk owns keyboard selection, not filtering.
  Close the palette/prompt synchronously before running actions that open another overlay.
- Community settings is a separate module; Settings now fits the default 500-line budget.
- Settings intentionally uses a non-modal Radix Dialog and a presentational pointer scrim:
  imperative plugin modals portal to body and must retain focus and settings DOM identity.
  It does not advertise `aria-modal` or trap background keyboard focus. Plugin-modal
  interactions must not dismiss settings; only the owned scrim dismisses on outside
  interaction. Host shortcuts respect consumed keyboard events, so plugin-menu Escape
  cannot also close underlying settings. A future unified portal owner may strengthen
  background isolation without changing or remounting third-party plugin DOM.
- Remaining legacy forms, contextual menus and navigation are not yet migrated.
  Migrate them in bounded follow-up PRs, not a claim that the whole UI is already shadcn.

## Styling and provenance

`ui.css` maps shadcn semantic colors to shared app tokens, prefixes utilities and omits
Tailwind preflight to avoid resetting editor and plugin DOM. Android composition rules
stay in `src/mobile/shell.css`; desktop does not acquire the native layout.
Registry source retains its MIT license in `src/components/ui/LICENSE`; the notices
generator includes that license in the packaged third-party notices.
Every build regenerates the dependency notices, then emits `LICENSE` and
`THIRD_PARTY_NOTICES.md` into the web assets, including Android's packaged assets.
Android CI compares both native asset copies byte-for-byte before building the APK.

Follow the [official Vite installation](https://ui.shadcn.com/docs/installation/vite)
and [Sheet documentation](https://ui.shadcn.com/docs/components/sheet) when adding widgets.
Do not globally restyle compatibility/plugin markup to resemble application widgets.
