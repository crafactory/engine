# Crafactory Engine v0.6.0 prerelease

> **Historical v0.6.0 prerelease note.** Current compatibility status is in
> [PLUGIN-SUPPORT-MATRIX.md](PLUGIN-SUPPORT-MATRIX.md).

Independent original MIT implementation. This is a bounded bug-fix increment and architecture proposal, not complete non-subscription Obsidian parity.

## Fixes

- Canvas embeds display actual read-only Canvas nodes and edges in reading and Live modes instead of rendering JSON as Markdown.
- Canvas rendering rejects malformed node/edge fields without crashing the note; empty optional arrays remain valid. Palette/hex colors use contrasting text in both themes. This is not complete JSON Canvas behavior certification.
- New-note/Canvas/Base creation uses the create-only storage operation rather than an overwrite-capable write, including when the visible file listing is stale.
- Renaming an extensionless Canvas name preserves `.canvas`; known file-type changes are rejected rather than silently pretending to convert content. Native regression checks exact JSON bytes and updated Markdown embeds.
- Live wiki aliases and bounded Markdown links have actual anchor navigation; active source stays editable. Unsafe schemes, escaped links, images and code spans do not become active links.
- Unchanged live block widgets reuse their measured DOM after source-position changes, with callbacks rebound to current coordinates. Block edits use minimal source changes and CodeMirror scroll snapshots; editing and committing a bottom table cell retains the edited region. Typing in the current note no longer triggers an additional full dependency refresh. CodeMirror selection drawing is explicit; a 100-row table / 120-paragraph regression checks caret visibility.
- Plugin status occupies a reserved normal-flow strip instead of overlaying the right-hand context footer. A compact local-graph entry remains available when the narrow layout hides the right sidebar.
- Editable tasks are bound to parser source offsets and captured DOM identities, not descendant checkbox ordinals. Embedded Canvas/Markdown and static-render task controls remain disabled and cannot join the host document's write mapping.

## Tracking and architecture

The Feature checklist contains 118 stable entries, including all 29 core plugins, 52 bounded acceptance checkpoints and an unchecked native-plugin-kernel gate. Parent parity areas remain incomplete.

`NATIVE-PLUGIN-ARCHITECTURE.md` proposes an assembly/service/lifecycle kernel with all product features, including editors, implemented as native providers; the Obsidian facade becomes an optional adapter. The migration has not been implemented in this release.

## Validation and limitations

See `REGRESSION-VERIFICATION.md`, `VERIFICATION.md` and the PR's latest-head CI for dated evidence. Release publication is gated on CodeRabbit review/fixes/re-review, latest CI and actual packaged Linux desktop tests.

Community-plugin scope is unchanged: Reading Time has eight bounded trusted-renderer flows; Calendar/Advanced Tables have startup-only evidence; Dataview and Templater remain blocked. Default Worker startup for all five fixed corpus samples remains unsupported. Trusted renderer is explicitly authorized, not sandboxed.

Full Live Preview grammar/cursor parity, recursive embeds, Canvas/Bases full behavior, native Windows/macOS running/install validation, mobile, large Vaults, signing and security/accessibility audits remain outstanding. Linux packages are unsigned; independently back up important notes before testing. SHA256SUMS.txt applies to the published asset filenames.
