-- Smriti prototype: no nonexistent clinician approval queue for fictional patients.
-- Real patient records still require clinician_verification_status='verified'.
-- All clinician access requires an invitation, active role/scopes and sharing consent.
begin;
CREATE OR REPLACE FUNCTION smriti_private.has_scope(target uuid, required_scope text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists (
  select 1 from public.patient_memberships m join public.app_users u on u.id=m.user_id
  join auth.users a on a.id=m.user_id
  where m.patient_id=target and m.user_id=auth.uid() and m.status='active'
   and a.email_confirmed_at is not null and not coalesce(a.is_anonymous,false)
   and m.revoked_at is null and (m.valid_until is null or m.valid_until>now())
   and required_scope=any(m.scopes)
   and (m.role<>'clinician' or ((u.clinician_verification_status='verified' or (u.onboarding_role='doctor' and exists (select 1 from public.patients pat where pat.id=target and pat.synthetic=true))) and exists (
    select 1 from public.consent_grants c where c.patient_id=target and c.purpose='clinician_sharing'
     and c.revoked_at is null and c.granted_at<=now() and (c.expires_at is null or c.expires_at>now())
     and (c.recipient_id is null or c.recipient_id=auth.uid())
   )))
   and (required_scope not in ('clinical_notes:read','clinical_notes:write','care_plan:write','assessment:finalize')
        or (m.role='clinician' and (u.clinician_verification_status='verified' or (u.onboarding_role='doctor' and exists (select 1 from public.patients pat where pat.id=target and pat.synthetic=true)))))
 );
$function$;

CREATE OR REPLACE FUNCTION smriti_private.command(operation text, input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();p uuid;v_id uuid;inv public.account_invitations;basis_value text;role_value text;scope_values text[];email_value text;result jsonb;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then raise exception 'unauthorized' using errcode='42501';end if;
 perform smriti_private.quota('management',30);
 if operation='create_patient' then
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  if (select count(*) from public.patients where linked_user_id=u)>=3 then raise exception 'patient_limit';end if;
  if length(trim(input->>'name')) not between 1 and 120 then raise exception 'invalid_name';end if;
  insert into public.patients(linked_user_id,preferred_name,locale,synthetic) values(u,trim(input->>'name'),coalesce(input->>'locale','en-IN'),true) returning id into p;
  insert into public.patient_memberships(patient_id,user_id,role,scopes,status,accepted_at,granted_by)
  values(p,u,'patient',array['records:read','consent:read','consent:manage','members:manage','voice:use','observations:write','audit:read'],'active',now(),u);
  insert into public.patient_authorities(patient_id,user_id,basis,verified_at) values(p,u,'self',now());
  return jsonb_build_object('patient_id',p);
 elsif operation='verification_request' then
  if input->>'kind' not in ('clinician','representative') then raise exception 'invalid_kind';end if;
  if not exists(select 1 from public.verification_requests where user_id=u and kind=input->>'kind' and status='pending') then
   insert into public.verification_requests(user_id,kind) values(u,input->>'kind');
  end if;
  if input->>'kind'='clinician' then update public.app_users set clinician_verification_status='pending' where id=u and clinician_verification_status in ('unverified','rejected');end if;
  return jsonb_build_object('status','pending');
 elsif operation='accept_invite' then
  if (input->>'hash') !~ '^[a-f0-9]{64}$' then raise exception 'invalid_invite';end if;
  select * into inv from public.account_invitations where token_hash=input->>'hash' for update;
  select lower(email) into email_value from auth.users where id=u;
  if inv.id is null or inv.revoked_at is not null or inv.expires_at<=now() or lower(inv.recipient_email)<>email_value then raise exception 'forbidden' using errcode='42501';end if;
  if inv.accepted_at is not null then
   if inv.accepted_by=u then return jsonb_build_object('patient_id',inv.patient_id);end if;
   raise exception 'forbidden' using errcode='42501';
  end if;
  if not exists(select 1 from public.patient_authorities a join public.patient_memberships m on m.patient_id=a.patient_id and m.user_id=a.user_id
   where a.patient_id=inv.patient_id and a.user_id=inv.invited_by and a.revoked_at is null and m.status='active' and m.revoked_at is null and (m.valid_until is null or m.valid_until>now()) and 'members:manage'=any(m.scopes)) then raise exception 'forbidden' using errcode='42501';end if;
  if inv.role='clinician' and not exists(select 1 from public.app_users au join public.patients pat on pat.id=inv.patient_id where au.id=u and (au.clinician_verification_status='verified' or (au.onboarding_role='doctor' and pat.synthetic=true))) then raise exception 'clinician_not_verified' using errcode='42501';end if;
  -- Never silently reactivate a revoked relationship through an old invitation.
  if exists(select 1 from public.patient_memberships where patient_id=inv.patient_id and user_id=u) then raise exception 'relationship_exists';end if;
  insert into public.patient_memberships(patient_id,user_id,role,scopes,status,accepted_at,granted_by) values(inv.patient_id,u,inv.role,inv.scopes,'active',now(),inv.invited_by);
  update public.account_invitations set accepted_at=now(),accepted_by=u where id=inv.id;
  return jsonb_build_object('patient_id',inv.patient_id);
 end if;
 p:=(input->>'patient_id')::uuid;
 if not smriti_private.has_scope(p,'records:read') then raise exception 'forbidden' using errcode='42501';end if;
 if operation='workspace' then
  return jsonb_build_object('patient',(select to_jsonb(x) from (select id,preferred_name,locale,synthetic from public.patients where id=p)x),
   'membership',(select to_jsonb(x) from (select role,scopes,status from public.patient_memberships where patient_id=p and user_id=u)x),
   'can_manage',smriti_private.can_revoke_consent(p),
   'consents',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,purpose,granted_at,expires_at,revoked_at,recipient_id,(revoked_at is null and (expires_at is null or expires_at>now())) as active from public.consent_grants where patient_id=p order by granted_at desc)x),'[]'::jsonb),
   'members',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,user_id,role,status,valid_until from public.patient_memberships where patient_id=p and (user_id=u or smriti_private.can_revoke_consent(p)))x),'[]'::jsonb),
   'invitations',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,role,expires_at,accepted_at,revoked_at from public.account_invitations where patient_id=p and invited_by=u)x),'[]'::jsonb));
 elsif operation='leave' then
  if exists(select 1 from public.patient_authorities where patient_id=p and user_id=u and revoked_at is null) then raise exception 'authority_cannot_leave';end if;
  update public.patient_memberships set status='revoked',revoked_at=now() where patient_id=p and user_id=u;
  return '{"ok":true}';
 end if;
 if not smriti_private.can_revoke_consent(p) then raise exception 'forbidden' using errcode='42501';end if;
 select basis into basis_value from public.patient_authorities where patient_id=p and user_id=u and revoked_at is null;
 if operation='consent' then
  if input->>'purpose' not in ('care_relationship','life_book','personalization','audio_capture','transcript_retention','clinician_sharing','notifications','research_export') then raise exception 'unsupported_purpose';end if;
  -- Audio retention is deliberately unavailable: no recording storage pipeline exists.
  perform pg_advisory_xact_lock(hashtextextended(p::text,0));
  update public.consent_grants set revoked_at=greatest(now(),granted_at) where patient_id=p and purpose=input->>'purpose' and revoked_at is null;
  if (input->>'enabled')::boolean then
   insert into public.consent_grants(patient_id,purpose,actor_id,authorization_basis,expires_at)
    values(p,input->>'purpose',u,basis_value,now()+interval '90 days');
  end if;
  return '{"ok":true}';
 elsif operation='invite' then
  if not smriti_private.has_scope(p,'members:manage') then raise exception 'forbidden' using errcode='42501';end if;
  role_value:=input->>'role';
  if role_value not in ('caregiver','clinician') or (input->>'hash') !~ '^[a-f0-9]{64}$' or length(input->>'email')>254 or position('@' in input->>'email')<2 then raise exception 'invalid_invite';end if;
  scope_values:=case when role_value='caregiver' then array['records:read','consent:read','observations:write'] else array['records:read','consent:read','clinical_notes:read','clinical_notes:write','logs:analyze'] end;
  insert into public.account_invitations(patient_id,invited_by,recipient_email,role,scopes,token_hash,expires_at)
   values(p,u,lower(input->>'email'),role_value,scope_values,input->>'hash',now()+interval '48 hours') returning id into v_id;
  return jsonb_build_object('id',v_id);
 elsif operation='revoke_invite' then
  update public.account_invitations set revoked_at=now() where id=(input->>'id')::uuid and patient_id=p and accepted_at is null;
  return '{"ok":true}';
 elsif operation='revoke_member' then
  update public.patient_memberships set status='revoked',revoked_at=now() where id=(input->>'id')::uuid and patient_id=p and user_id<>u;
  return '{"ok":true}';
 end if;
 raise exception 'invalid_operation';
end;$function$;

revoke all on function smriti_private.has_scope(uuid,text) from public,anon;
revoke all on function smriti_private.command(text,jsonb) from public,anon;
grant execute on function smriti_private.has_scope(uuid,text) to authenticated;
grant execute on function smriti_private.command(text,jsonb) to authenticated;
commit;
