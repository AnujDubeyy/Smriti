# Smriti web application

See the [repository README](../../README.md) for setup, status and privacy boundaries.

- `npm run dev`: development server.
- `npm run build && npm run preview`: production-build preview (recommended for browser acceptance).
- `npm test`: 37 tests covering database RLS, auth boundaries, locales and service-worker privacy.
- `npm run lint`, `npm run typecheck`: source checks.

`predev` and `prebuild` regenerate the public offline page, its localized script/styles, and content-hashed asset allowlist. Rebuild after changing artwork or fonts.

For repeatable responsive QA, temporarily copy `scripts/qa-harness.html` to `public/__qa.html` before starting a preview. The harness embeds the app at selected widths and can double the root font size. Remove the public copy after QA; the harness is not part of the product. This is text-resize testing, not a claim of real browser zoom or device safe-area testing.

Phase 2 uses server-only `SMRITI_SUPABASE_*` variables from `.env.example`. Never reuse Cybrion credentials. See `docs/architecture/PHASE-2-SETUP.md` at the repository root. Node 22.18+ is required for the test runner.

## Local interactive preview

Use an ignored `.env.local` with `SMRITI_LOCAL_DOCTOR_PREVIEW=1` to explore a fictional doctor and patient without an account. The preview uses browser storage for demo assignments and observations; no live patient records are fetched through the demo pages. The switch at the top changes between Doctor and Patient views. Vercel always disables this preview flag.

When the development runtime cannot read system memory statistics, set `SMRITI_PREVIEW_PRODUCTION=1` in `.env.local`, run `npm run build`, then `npm run dev`. This uses the existing production-preview runner; rebuild and restart after edits. Remove these two flags to restore the normal sign-in flow.

Patient notifications refresh assignments every 15 seconds while the page is visible, and on window focus. In the demo, changes appear immediately. Notification read state lasts for the current page session. Logs offer search, observation entry, conversation sections, and a source-linked summary. If AI is unavailable, the summary is explicitly labelled an evidence-only observation digest.
