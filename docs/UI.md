# UI component foundation

Use registry-generated shadcn/ui widgets for application UI rather than adding another
bespoke button, modal, drawer or input system. Platform compositions still own their
layout and domain behavior. This does not replace the Obsidian-compatible plugin DOM API.

## Current migration

- `components.json` records the New York registry style, `ui` utility prefix and aliases.
- `src/components/ui/button.tsx` and `sheet.tsx` were generated with shadcn CLI 4.23.0.
  Button uses React 18 `forwardRef` for existing ref consumers.
- The shared `IconButton` delegates to Button while retaining existing application classes.
- Android header/navigation use Button, and its tab/Tools overlay uses Sheet (Radix Dialog).
  Plugin contributions live in a stable owned portal container, parked while closed,
  not destroyed each time Radix unmounts the sheet.
- Commands close the sheet before invoking their action, so plugin dialogs can acquire
  focus. Native Back, Escape, focus return and retained plugin host identity have regressions.
- Remaining legacy shared dialogs, settings, forms and navigation are not yet migrated.
  Migrate them in bounded follow-up PRs, not a claim that the whole UI is already shadcn.

## Styling and provenance

`ui.css` maps shadcn semantic colors to shared app tokens, prefixes utilities and omits
Tailwind preflight to avoid resetting editor and plugin DOM. Android composition rules
stay in `src/mobile/shell.css`; desktop does not acquire the native layout.
Registry source retains its MIT license in `src/components/ui/LICENSE`; the notices
generator includes that license in the packaged third-party notices.

Follow the [official Vite installation](https://ui.shadcn.com/docs/installation/vite)
and [Sheet documentation](https://ui.shadcn.com/docs/components/sheet) when adding widgets.
Do not globally restyle compatibility/plugin markup to resemble application widgets.
