# Smriti

Smriti is a synthetic-data care-app prototype with Assessment → Companionship → Monitoring navigation. Phase 2 identity/consent workflows and Phase 3 speech/AI plumbing are implemented. Live provider and device acceptance checks remain open; this is not a clinical release.

This repository is independent of Cybrion Consulting. Its database is the dedicated Smriti project `yuaodxigakqkfjsmtoat`. Cybrion resources and credentials are not used.

## Run locally

```sh
cd apps/web
npm ci
# Keep your existing .env.local. Use .env.example only to check variable names.
npm run dev
```

Open http://localhost:3000. Existing users should pull this revision first. Never commit `.env.local` or paste API keys into chat. Node >=22.18 is required.

- `/voice`: public deterministic mock demo; no API keys, account or microphone required for the synthetic sample.
- `/signup` → confirm email → `/patients/select` → `/onboarding`: create a fictional self-profile.
- Open the profile permissions page and separately enable **Care relationship** and **Process microphone audio**. Then choose **Talk to Smriti**.
- With both `GNANI_API_KEY_ID` and `GEMINI_API_KEY` configured server-side, `VOICE_PROVIDER=auto` selects real Gnani Prisma STT → Gemini → Timbre TTS. Otherwise it clearly labels mock providers. Restart Next after environment changes.
- Record up to 29 seconds, finish, review/edit the transcript, confirm, then play the response. Stop clears local conversation state and releases the microphone.
- **Logs and summaries** accepts fictional human-confirmed observations and generates evidence-linked drafts. It does not analyze clinical notes, diagnose, score, or fetch medical information from the web.

Free Gemini requests are restricted to synthetic profiles because its free service may use submitted content for product improvement. Do not enter real patient data. No paid endpoint or production deployment has been created. Provider credits/quotas still apply; the app has limits and does not automatically retry failed calls.

## Checks and status

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

See [Phase 2 evidence](docs/progress/PHASE-02.md), [Phase 3 evidence](docs/progress/PHASE-03.md), [local setup](docs/architecture/PHASE-2-SETUP.md), [Gemini context contract](docs/voice/GEMINI_CONTEXT.md) and [speech contract](docs/voice/GNANI_ADAPTER.md).

The later Life Book authoring, full emotional-companionship controller, clinical assessment, monitoring trends and clinician review phases remain outside this increment. The Assessment pillar remains a foundation preview. Existing English/Hindi/Marathi shell dictionaries are preserved; the new account/voice workflow instructions are primarily English and require translation/native review.

## Privacy and assets

Authenticated pages/APIs use no-store. The service worker caches only a fixed public shell/artwork/font list, never private HTML, conversations or audio. Audio stays in memory for processing and is never retained. Reviewed transcript storage requires separate current consent; withdrawing that consent clears stored turn text. Human care logs are separate explicit records, not automatic transcript retention.

`DESIGN.md` defines visuals; `prompt.md` defines scope. Supplied artwork is preserved in `assets/`; fonts carry their licenses. The mock voice fixture has its Flite license beside it under `apps/web/public/voice/`.
