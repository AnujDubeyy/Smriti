# 0001 — Retain the existing web stack

Use the existing Next.js App Router, strict TypeScript and Tailwind setup. Keep all care services disconnected during Phase 1. Use self-hosted variable fonts and explicit locale dictionaries, avoiding runtime font and translation service dependencies. Experimental cacheComponents and partialPrefetching settings were removed because this foundation does not need them.

The managed development preview did not hydrate its controls reliably; the built production app was used for interaction acceptance and passed role/language navigation checks. This development-preview limitation remains documented, not represented as a successful development-mode test.
