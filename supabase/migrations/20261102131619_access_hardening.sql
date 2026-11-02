begin;
-- Explicit deny policies document intentional server-command-only tables.
create policy invitations_no_direct_access on public.account_invitations for all to anon,authenticated using(false) with check(false);
create policy quota_no_direct_access on smriti_private.usage_windows for all to anon,authenticated using(false) with check(false);
create index invitations_patient on public.account_invitations(patient_id);
create index invitations_inviter on public.account_invitations(invited_by);
create index invitations_accepted on public.account_invitations(accepted_by);
create index context_patient on public.approved_context(patient_id);
create index context_approver on public.approved_context(approved_by);
create index logs_author on public.care_logs(author_id);
create index notes_author on public.clinical_notes(author_id);
create index consents_actor on public.consent_grants(actor_id);
create index consents_recipient on public.consent_grants(recipient_id);
create index authority_user on public.patient_authorities(user_id);
create index authority_verifier on public.patient_authorities(verified_by);
create index memberships_granter on public.patient_memberships(granted_by);
create index patients_linked_user on public.patients(linked_user_id);
create index verification_patient on public.verification_requests(patient_id);
create index verification_user on public.verification_requests(user_id);
create index sessions_initiator on public.voice_sessions(initiated_by);
create index turns_patient on public.voice_turns(patient_id,created_at);
-- Client-level context reads also enforce approval and purpose-specific consent.
grant execute on function smriti_private.consent_active(uuid,text) to authenticated;
alter policy approved_context_access on public.approved_context to authenticated using(state='approved' and smriti_private.has_scope(patient_id,'records:read') and smriti_private.consent_active(patient_id,'life_book') and smriti_private.consent_active(patient_id,'personalization'));
commit;
