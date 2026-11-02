# Repository audit — 2026-11-02

Starting point: existing Next.js foundation in AnujDubeyy/Smriti at d94ba58ba637a8008226cd79dca71bcec1c00dbf. The three routes and basic in-memory preferences existed; branding, complete localization, offline behavior and validation remained incomplete.

Canonical inputs: root DESIGN.md and prompt.md; supplied Smriti design package with SVGs and mascot references. Existing layout and framework were extended. No Supabase, Gnani or Vercel credentials were accessed; no production project was connected. No Cybrion resources were changed.

Dependencies are locked in apps/web/package-lock.json. Fonts are self-hosted with their OFL license texts. A vulnerability scan or license/legal audit is not claimed by this phase.

Known risks and release gates: actual PWA installation and offline reload on HTTPS; native Hindi/Marathi review; hardware safe-area, screen-reader and real browser zoom checks; service authorization/RLS in Phase 2; clinical instrument and voice validation in subsequent phases. Current UI never claims those capabilities are connected.
