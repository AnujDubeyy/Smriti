# Smriti web application

See the [repository README](../../README.md) for setup, status and privacy boundaries.

- `npm run dev`: development server.
- `npm run build && npm run preview`: production-build preview (recommended for browser acceptance).
- `npm test`: eight locale, capability and service-worker privacy regression tests.
- `npm run lint`, `npm run typecheck`: source checks.

`predev` and `prebuild` regenerate the public offline page, its localized script/styles, and content-hashed asset allowlist. Rebuild after changing artwork or fonts.

For repeatable responsive QA, temporarily copy `scripts/qa-harness.html` to `public/__qa.html` before starting a preview. The harness embeds the app at selected widths and can double the root font size. Remove the public copy after QA; the harness is not part of the product. This is text-resize testing, not a claim of real browser zoom or device safe-area testing.
