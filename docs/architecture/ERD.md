# Identity and care access model — Phase 2 increment 1

| Table | Relationship and purpose | Client writes |
|---|---|---|
| app_users | One per auth.users identity; preferences and trusted clinician status | Own display name and locale only |
| patients | Care record, optionally linked to an identity | None yet |
| patient_memberships | Unique patient/user relationship; role, scopes, expiry and revocation | None yet |
| patient_authorities | Reviewed self/representative consent authority | None |
| consent_grants | Patient, purpose, actor, recipient, basis, expiry and withdrawal | Withdrawal by reviewed authority only |
| account_invitations | Patient-specific future invitation; hashed token and expiry | None; workflow pending |
| clinical_notes | Patient and verified author | Own new note with scoped access and sharing consent |
| audit_events | Mutation metadata, without note/patient text | None; database trigger only |

All tables have RLS. Internal security-definer lookups live in non-exposed smriti_private, bind the caller to auth.uid(), and have explicit execution grants. No client may change verification, roles, scopes or audit history. Members see their own membership records for relationship status; patient content requires current authorization.

Membership revocation/expiry, clinician suspension and sharing-consent withdrawal are checked against database rows on every read. The model does not depend on stale JWT authorization claims. Invitation/authority provisioning and retention/deletion workflows remain unfinished and must be designed before real-data use.
