# Trusted renderer QA inventory

This inventory covers this increment, not full Obsidian parity. Public behavioral references: [Plugin settings](https://docs.obsidian.md/Reference/TypeScript+API/PluginSettingTab), [Setting controls](https://docs.obsidian.md/Reference/TypeScript+API/Setting), [Modal](https://docs.obsidian.md/Reference/TypeScript+API/Modal), [CodeMirror registration](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/registerEditorExtension), and [ItemView](https://docs.obsidian.md/Reference/TypeScript+API/ItemView).

| Claim or control | Functional check | Visual state / evidence |
|---|---|---|
| Worker remains default; renderer opt-in | Runtime selector defaults Worker; cancel trust prompt leaves disabled and no status item | Community settings and warning at desktop and narrow width |
| Real text/textarea/dropdown/toggle/slider/button controls | Input events save JSON; reopening restores text; button opens modal | Plugin settings after edits, light and dark |
| Modal open/close and focus | Button/command opens, Tab stays inside, Escape restores focus and removes dialog | Open modal, narrow viewport |
| Dedicated custom pane | Command opens original ItemView; close removes; disable cleans remaining views | Open view and post-disable state |
| Actual CodeMirror integration | StateField and updateListener use host packages; typing changes visible status; mutate extension array and updateOptions replaces behavior | Source editor and status after typing |
| Mode and unload cycle | Source/reading/source and live retain extension; disable removes status, tabs, modal, view and editor listener | Enabled and disabled workspace |
| Real Reading Time workflows | Pinned unchanged bundle: document time, settings persistence, editor-change, selection modal, re-enable and unload | Reading and selected-text modal |
| Failure cleanup | Unsupported Node module fails visibly without remaining UI; startup exception removes prior status item | Error banner and disabled switch |
| Corpus honesty | Worker failures retained; separate renderer startup outcomes and functional workflows | Public per-mode report, no inferred compatibility |

Exploratory checks include cancellation after selecting renderer, source/live/reading transitions, repeated enable/disable, modal focus cycling, narrow settings controls, and startup failure after allocating a status item. Automated Electron tests exercise normal UI inputs and real vault files. Interactive visual inspection is separate from functional assertions; responsive width is not native mobile acceptance.

## Interactive visual inspection

The original renderer fixture was inspected in an actual Linux Electron window at 1440 × 900 in dark and light themes, including text/control layout and post-input settings. At 375 × 812, settings remain within viewport bounds with vertical content scrolling and horizontal navigation scrolling; the Modal input, title and close affordance fit inside the viewport. Normal input opened/closed the Modal, cycled focus and restored the settings control. View and CodeMirror status inspections also use the real fixture, not imported plugin UI code. Screenshots are test evidence, not mobile certification or complete accessibility review.
