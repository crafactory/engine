# Canvas / Live Edit verification

This is a bounded Engine regression record, not an installed Obsidian differential certification.

## Initial candidate

The first new browser run passed link navigation, widget DOM reuse/callback remapping, conversion rejection and status geometry. Three assertions failed: two assumed a Markdown title/editor mode on a Canvas view, and one inspected a `.cm-cursor` before explicit CodeMirror selection drawing was enabled. The tests were corrected to exercise the actual Canvas mode; selection drawing is now explicit. These were candidate iterations, not a claimed baseline execution against v0.5.

## Current local evidence

- Unit tests for rename normalization and safe inline-link parsing pass.
- Existing 36 browser regressions and the initial seven new regression cases passed together (43 total).
- All nine new browser regression cases subsequently passed, including empty/malformed Canvas and editable active link source.
- Desktop suite passed 34 cases, with ten corpus cases skipped without external inputs. The added native Canvas test checks exact original JSON bytes, original and destination file existence, absence of accidental `.md`, rewritten embed, reading/Live rendering and reopening.
- Full latest-head CI, three-platform builds, pinned-plugin corpus and packaged executable validation must still be recorded after the PR gate. Earlier local passes do not certify later changes.

## Boundaries

100-row table plus 120 paragraphs is a regression fixture, not large-Vault performance certification. Inline links support bounded destinations; nested parentheses, escaped labels and full inline grammar remain incomplete. Canvas file-card rendering and recursive embedding are not declared equivalent. Native Windows/macOS installation and running, mobile, signed packages, accessibility/security audits and exhaustive Obsidian plugin behavior remain unverified.

`NATIVE-PLUGIN-ARCHITECTURE.md` is a proposal with unchecked migration gates. No all-plugin kernel implementation is claimed.
