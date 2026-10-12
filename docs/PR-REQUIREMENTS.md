# Canvas / Live Edit fixes and native-plugin architecture RFC

This increment implements the repository owner's next development request. The separate original all-plugin-kernel migration is not claimed complete here.

## Required bug fixes

- Render Canvas embeds as actual read-only Canvas geometry in note pages, not JSON Markdown. Verify reading/Live modes, invalid/empty sources, container resize, original bytes and open-original behavior.
- Keep editing positioned at the actual caret/cell in long documents containing tables. Verify measured widget reuse, current-position edit callbacks, typing after a tall table, and focused bottom-cell editing/commit.
- Restore Live link presentation and navigation for bounded wiki aliases and Markdown links, keeping active source editable and rejecting unsafe schemes/code.
- Preserve Canvas format through rename; extensionless names retain `.canvas`, explicit known-format conversion is rejected, case-preserved extensions select the correct view, and exact native source bytes survive.
- Address layout issue #2: plugin status uses reserved normal-flow space; the local graph entry remains visible and non-overlapping in dark/light desktop and 375px layouts; actual plugin unload releases its strip.

## Required planning deliverable

Research DeepSeek Harness/Cordis first-party architecture and its Claude Code Mods bridge. Propose a native assembly/service/effects kernel where all product capabilities, including editor, are providers; Obsidian API is only an optional adapter. Define scopes, dependencies, data-safe replacement, permissions, lifecycle, migration stages and test gates. Document which stages remain unimplemented.

## Delivery and review

Keep original code under MIT without copying Obsidian implementation, SDK/type declarations or samples. Update stable Feature checklist entries without checking incomplete parent areas. Include version/release notes and bounded test evidence.

All implementation stays on the PR branch. Wait for CodeRabbit's completed latest-head review, repair every retained finding including pre-merge warnings, re-review, resolve threads and pass current CI/build/pinned-corpus checks before merging. Packaged Linux validation precedes prerelease publication. No later development increment starts before this PR is merged.
