# Dedicated Smriti local acceptance checklist

The four checked-in migration names `phase2_identity_access`, `phase2_workflows`, `phase3_sessions` and `access_hardening` have already been applied to Smriti project `yuaodxigakqkfjsmtoat`. Do not rerun them manually or point the app at Cybrion. Hosted migration history uses server-generated timestamps; names and SQL are the correspondence. Local tests apply the checked-in files to disposable PostgreSQL fixtures.

## Local configuration

Keep `apps/web/.env.local` with the existing variables from `.env.example`. No service-role/secret Supabase key is needed by the web app. Both `GEMINI_API_KEY` and `GNANI_API_KEY_ID` are read by the server. `VOICE_PROVIDER=auto` uses live providers only when both exist; `VOICE_PROVIDER=mock` forces no external AI/speech calls. Default model is `gemini-2.5-flash`. Restart the dev server after changes.

Supabase email sign-in and email confirmation should stay enabled; anonymous sign-in disabled. Site URL: `http://localhost:3000`. Redirect allowlist must cover `http://localhost:3000/auth/callback` and recovery callback `http://localhost:3000/auth/callback?flow=recovery`. Verify the exact callback with your project's settings; no email-delivery test was performed here.

## Test with fictional information

1. Pull the repository, run `npm ci` then `npm run dev` from `apps/web`.
2. Try `/voice`: check consent, use the synthetic sample, review transcript, confirm, play and stop. This public route always stays mock.
3. Sign up/confirm a test email, sign in and open **Your care account**. Create a synthetic self-profile from onboarding. This creates only your own patient relationship.
4. In permissions enable **Care relationship** and **Process microphone audio** separately. Leave transcript retention off for the initial test. Open **Talk to Smriti** from that profile; verify the live/mock label.
5. On localhost, explicitly start the mic. Say a fictional harmless sentence, finish, correct the transcript if needed, confirm and play. Check the terminal for only generic failures if credentials/quotas fail; do not share keys or sensitive logs.
6. Stop while recording/responding/playing; navigate away or background the tab. Confirm microphone indicator clears. Withdraw capture consent in another tab; session should stop within the polling interval and subsequent server operations must fail.
7. Add two clearly fictional observations in **Logs and summaries**. Request a summary and inspect every quote/source link. It must not invent a diagnosis, clinical score or personal history. Empty/invalid output must fail safely.
8. Use two test accounts to check email-bound caregiver invitations, revocation and cross-patient direct URLs. Clinicians require a separately reviewed verification state. Caregiver access never grants consent authority or clinical-note access.
9. Test recovery email, refresh, logout and blocked private routes. No authenticated browser results are claimed until these pass.

## Trusted review boundary

The app records clinician/representative review requests as pending; it never auto-approves them. A human operator must independently check professional identity or representative authority under the project's governance process before privileged database provisioning. Do not approve a real representative or clinician just to bypass a test. No review-document storage, automated license check, representative activation UI or production governance process is delivered in this increment.

The hosted SQL smoke test is transactional and rolls back all synthetic fixtures; it is not a seed-account tool and sends no emails. No paid compute, Hugging Face endpoint or production deployment is required for these local tests.
