# Smriti

Smriti's Phase 1 foundation: an accessible, multilingual care-app preview. The three spaces are **Assessment → Companionship → Monitoring**, with clearly labelled patient, caregiver and clinician previews.

This repository is independent of Cybrion Consulting. No Cybrion repository, deployment, domain, database or credentials are used.

## Run

```sh
cd apps/web
npm ci
npm run dev
```

For a production-build preview:

```sh
npm run build
npm run preview -- --hostname 0.0.0.0 --port 3000
```

Checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Current status

- Next.js App Router, strict TypeScript and Tailwind; responsive three-tab navigation.
- Supplied Smriti artwork, self-hosted Nunito, Baloo 2 and Noto Sans Devanagari.
- Complete English, Hindi and Marathi interface dictionaries. Hindi/Marathi remain beta pending native-speaker review.
- Role preview and language selection survive client-side navigation; refresh resets them. A role selection grants no permissions.
- Loading, retry/error, not-found and offline states; skip link, keyboard controls, route focus and reduced-motion support.
- PWA metadata, install-event handling and a deliberately limited public offline shell.

**No patient records, authentication, clinical assessment, microphone, AI or speech service is connected.** Phase 2 implements actual authentication and patient-specific authorization. All clinical and voice capabilities remain disabled.

## Privacy and offline behavior

The service worker precaches a fixed list of public artwork, fonts and offline-shell files, using requests without credentials. It never saves navigation responses, API responses, audio, conversations, patient data or React Server Component payloads. Failed navigations receive the public offline page. No browser storage contains role, locale or patient information.

Installability and real offline reload require a secure context (HTTPS or an eligible localhost origin). The HTTP managed preview cannot establish the device-install acceptance gate. See [Phase 1 evidence and remaining acceptance checks](docs/progress/PHASE-01.md).

## Sources and licenses

`DESIGN.md` is the canonical design contract; `prompt.md` defines the phase scope. User-supplied originals are preserved under `assets/`; optimized display copies are in `apps/web/public/brand/`. No third-party rights are asserted for supplied branding. Font OFL licenses are included beside each font. See [asset provenance](docs/qa/ASSETS.md).

No production deployment is performed by this phase.
