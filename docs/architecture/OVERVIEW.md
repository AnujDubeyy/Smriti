# Phase 1 architecture

`app/layout.tsx` supplies a shared in-memory Preferences provider and AppShell. PillarNav owns the exact three-link ordering. The home page and three pillar routes render localized role previews from `lib/messages.json`. No role can retrieve data because there is no backend connection.

`public/sw.js` uses the generated static allowlist in `sw-assets.js`. Only public static assets enter the cache. Navigation remains network-first without runtime storage; failures receive offline.html. API, cross-origin, authorization-header and non-GET requests bypass interception. Cache cleanup is limited to old `smriti-shell-*` versions.

`lib/capabilities.json` is the explicit capability record. UI translation does not enable STT, TTS, conversational AI or assessments. Those capabilities are off in every locale.

Phase 2 must add authenticated relationships and server-enforced authorization before introducing patient data. Preview role selection must never become an authorization source.
