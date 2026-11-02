# Phase 2 HTTP contract — initial increment

All account/patient endpoints are private and no-store. Inputs never accept preview roles. Mutation endpoints require a matching Origin header. Provider errors are mapped to generic responses without user records or tokens.

| Endpoint | Behavior |
|---|---|
| POST /api/auth/login | JSON email/password; establishes server-managed cookies; generic 401 on failure |
| POST /api/auth/signup | Strict email/password only; confirmation flow; no care access or clinician grant |
| POST /api/auth/logout | Local session signout; no patient data in response |
| GET /auth/callback | PKCE code exchange; fixed local redirect; no arbitrary next URL |
| GET /api/v1/patients | Verified account, RLS-authorized list, maximum 100 rows |
| GET /api/v1/patients/:id | Verified account and UUID; 403 for missing or unauthorized ID |

Unconfigured auth returns 503/not_configured. Missing/unconfirmed identity returns 401. Invalid UUID/JSON returns 400. Service failures return generic 503. Auth form payloads are stream-limited to 4096 bytes before JSON parsing; upstream request-size/rate limits remain a deployment requirement. All write endpoints use the authenticated session; no service-role bypass exists.

Pending: invitation, consent, membership-management and profile mutation APIs; pagination; durable abuse protection; full OpenAPI generation after these contracts are finalized. Current 403 handling is source-reviewed and RLS-tested, not yet live authenticated-HTTP tested.
