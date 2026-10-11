# Contributing

Use Node.js 22.12+. Run `npm ci`, `npm run check`, and `npm run test:e2e` before submitting changes. New behavior should have a fixture/unit test and an end-to-end test where applicable.

Do not import, decompile, translate, or adapt proprietary application code or assets. Public behavior documentation and open format specifications can inform an independently written implementation. State the provenance and license of every introduced resource.

Update `docs/PARITY.md` with actual boundaries. A UI affordance is not evidence of completed functionality. Do not label a feature complete without comparison tests. Unsupported file syntax must produce a visible error rather than silently dropping data.

Regenerate `THIRD_PARTY_NOTICES.md` after dependency updates. Keep original code MIT licensed and preserve all third-party license and notice requirements.
