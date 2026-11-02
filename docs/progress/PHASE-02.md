# Phase 2 — implementation delivered; live account acceptance pending

Date: 2 November 2026 (IST).

## Delivered

Supabase server-side email/password signup, sign-in, logout, recovery/reset and PKCE callback; getUser validation and session-refresh proxy; protected patient selection and profile routes; synthetic self-onboarding; independent pending clinician/representative review requests; permission management and consent history; invitation creation/redemption/revocation; member revocation; audited, scoped SQL commands with explicit grants and RLS.

Invitation codes are random, stored only as SHA-256 hashes, bound to the invited email and fixed role scopes, expire after 48 hours, and redeem under row lock. A repeated redemption by the same recipient is idempotent. A clinician must already be independently verified; an invitation never grants consent authority. Caregivers cannot self-verify, claim representative authority or read clinical notes. Public signup metadata is not authorization.

Only a synthetic self-profile can be created in the app. Representative requests remain pending for trusted human review; no automatic verification or identity-document upload is implemented. The private recording bucket remains inaccessible to clients; this increment does not enable storage uploads or signed URLs.

## Hosted evidence

Applied to the dedicated Smriti project `yuaodxigakqkfjsmtoat`: `phase2_identity_access`, `phase2_workflows`, `phase3_sessions`, and `access_hardening`. No Cybrion project was modified.

Hosted SQL smoke check (`supabase/hosted-rls-smoke.sql`) passed self-onboarding, cross-patient denial, clinical-note privacy, capture consent, turn deduplication, no-retention, withdrawal and self-verification denial. Synthetic fixtures were rolled back. This exercises PostgreSQL roles/RLS/RPC logic, not an authenticated browser or GoTrue email delivery.

Supabase security advisors returned no findings. Performance advisors reported informational unused indexes on the new empty tables; missing foreign-key indexes were added. Keep these indexes pending real query evidence.

## Automated evidence and open gates

65 tests pass across actual migration/RLS tests, auth boundaries, foundation checks and speech/Gemini adapter contracts. Lint, TypeScript and production build are checked with the Phase 3 handoff.

Still requires local authenticated browser acceptance with synthetic accounts: confirmation/recovery emails, refresh/logout, two-account invite redemption, authenticated direct-URL denial and revocation without token refresh. The application uses the user's own RLS-bound client and no service-role key. Database fixtures do not substitute for these browser checks.

No real patient rollout or professional verification is approved by these checks. See the setup runbook for a concrete test path.
