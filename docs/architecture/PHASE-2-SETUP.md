# Dedicated Smriti setup — pending project selection

Choose a Supabase organization explicitly before project creation or quoting cost. For full organizational/billing separation from Cybrion, use a separate organization. A second project inside the Cybrion organization would isolate databases but still share organization administration and billing.

1. Create or identify a dedicated non-production Smriti project. Do not apply this migration to cybrion-training.
2. Inspect the empty project's schemas and settings, then apply the checked-in migration and run Supabase security/performance advisors. The migration has been exercised locally but not applied to hosted Supabase.
3. Populate apps/web/.env.local from .env.example: exact project URL, modern publishable key, matching project reference and exact app origin. These variables are server-only. No service-role key is needed by the web app.
4. Keep email confirmation enabled and anonymous signups disabled. Allowlist only the chosen app origin and /auth/callback redirect; test PKCE confirmation with synthetic accounts. HTTPS is required for secure production cookies.
5. Provision synthetic care relationships through a trusted administrative process. Never use signup metadata for membership, verification, scopes or representative authority. No default patient access is created on signup.
6. Exercise end-to-end authentication and refresh, cross-patient direct-URL denial, suspension/revocation without token refresh, consent withdrawal, and private storage denial. Verify no private HTML/cookies appear in any CDN cache or service-worker cache.

Live configuration is deliberately pending. No invitation emails, access grants or cloud resources were created in this increment.
