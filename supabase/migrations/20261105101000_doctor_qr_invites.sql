-- Smriti fictional-prototype doctor-first QR onboarding.
-- QR secret is SHA-256 hashed at rest, expires after 48 hours and can be claimed once.
-- QR grants no permanent access by itself; session + caretaker authority checks remain mandatory.
begin;

alter table public.patient_authorities drop constraint if exists patient_authorities_basis_check;
alter table public.patient_authorities add constraint patient_authorities_basis_check
 check (basis in ('self','verified_representative','prototype_qr_claim'));
alter table public.consent_grants drop constraint if exists consent_grants_authorization_basis_check;
alter table public.consent_grants add constraint consent_grants_authorization_basis_check
 check (authorization_basis in ('self','verified_representative','prototype_qr_claim'));

create table if not exists smriti_private.doctor_qr_invites(
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null unique references public.patients(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 caretaker_name text not null check(length(caretaker_name) between 2 and 120),
 token_hash text unique not null check(token_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '48 hours'),
 claimed_by uuid references auth.users(id) on delete set null,
 claimed_at timestamptz,
 revoked_at timestamptz,
 constraint doctor_qr_claim_pair check((claimed_at is null)=(claimed_by is null))
);
alter table smriti_private.doctor_qr_invites enable row level security;
revoke all on smriti_private.doctor_qr_invites from public,anon,authenticated;

create or replace function smriti_private.qr_claimed_user(target uuid)
returns boolean language sql stable security definer set search_path='' as $f$
 select target=auth.uid() and exists (
  select 1 from auth.users a
   join public.app_users u on u.id=a.id
   join public.patient_memberships m on m.user_id=a.id
   join public.patients p on p.id=m.patient_id
   join public.patient_authorities pa on pa.patient_id=p.id and pa.user_id=a.id
  where a.id=target and a.is_anonymous and u.onboarding_role='caregiver'
   and p.synthetic=true and p.linked_user_id=target
   and m.role='caregiver' and m.status='active' and m.revoked_at is null
   and (m.valid_until is null or m.valid_until>now())
   and pa.basis='prototype_qr_claim' and pa.revoked_at is null
 )
$f$;
revoke all on function smriti_private.qr_claimed_user(uuid) from public,anon,authenticated;

create or replace function public.smriti_issue_doctor_qr(input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare u uuid:=auth.uid(); p uuid; n int; birth date; name text; caretaker text; rel text; lang text;
begin
 if u is null or not exists (
  select 1 from auth.users a join public.app_users au on au.id=a.id
   where a.id=u and not coalesce(a.is_anonymous,false)
    and a.email_confirmed_at is not null and au.onboarding_role='doctor'
 ) then raise exception 'doctor_only' using errcode='42501'; end if;
 if input->>'token_hash' !~ '^[a-f0-9]{64}$' then raise exception 'invalid_request';end if;
 name:=trim(coalesce(input->>'patient_name',''));
 caretaker:=trim(coalesce(input->>'caretaker_name',''));
 rel:=trim(coalesce(input->>'relationship',''));
 lang:=coalesce(input->>'locale','en-IN');
 if length(name) not between 2 and 120 or length(caretaker) not between 2 and 120
    or length(rel) not between 2 and 100 or lang not in ('en-IN','hi-IN','mr-IN')
    or input->>'sex' not in ('female','male','intersex','prefer_not_to_say')
    or length(coalesce(input->>'support_notes',''))>2000
 then raise exception 'invalid_request';end if;
 if (input->>'family_count')::int not between 0 and 50 then raise exception 'invalid_request';end if;
 birth:=(input->>'date_of_birth')::date;
 if birth is null or birth>current_date or birth<current_date-interval '120 years'
 then raise exception 'invalid_birth_date';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select count(*) into n from smriti_private.doctor_qr_invites where created_by=u and claimed_at is null and revoked_at is null;
 if n>=20 then raise exception 'patient_limit';end if;
 insert into public.patients(preferred_name,locale,synthetic,care_details)
 values(name,lang,true,jsonb_build_object(
  'date_of_birth',birth,'age',extract(year from age(current_date,birth))::int,
  'sex',input->>'sex','family_count',(input->>'family_count')::int,
  'caregiver_name',caretaker,'relationship',rel,'support_notes',trim(coalesce(input->>'support_notes',''))
 )) returning id into p;
 -- Clinician membership starts without sharing consent. has_scope() denies patient
 -- records until the connected caretaker explicitly authorizes clinician_sharing.
 insert into public.patient_memberships(patient_id,user_id,role,scopes,status,accepted_at,granted_by)
 values(p,u,'clinician',array['records:read','consent:read','clinical_notes:read','clinical_notes:write','logs:analyze'],
  'active',now(),u);
 insert into smriti_private.doctor_qr_invites(patient_id,created_by,caretaker_name,token_hash)
 values(p,u,caretaker,input->>'token_hash');
 return jsonb_build_object('patient_id',p,'patient_name',name,'caretaker_name',caretaker,
  'expires_in_hours',48);
end;$f$;

create or replace function public.smriti_claim_caretaker_qr(input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare u uuid:=auth.uid(); inv smriti_private.doctor_qr_invites; p public.patients;
begin
 if u is null or not exists(select 1 from auth.users a where a.id=u and a.is_anonymous)
 then raise exception 'qr_requires_guest' using errcode='42501';end if;
 if input->>'token_hash' !~ '^[a-f0-9]{64}$' or input->>'authorized' <> 'true'
 then raise exception 'invalid_request';end if;
 select * into inv from smriti_private.doctor_qr_invites
 where token_hash=input->>'token_hash' for update;
 if inv.id is null or inv.revoked_at is not null or inv.expires_at<=now()
    or inv.claimed_at is not null
 then raise exception 'qr_expired_or_used' using errcode='42501';end if;
 select * into p from public.patients where id=inv.patient_id for update;
 if p.id is null or not p.synthetic or p.linked_user_id is not null
 then raise exception 'qr_expired_or_used' using errcode='42501';end if;
 if exists(select 1 from public.patient_memberships where user_id=u)
 then raise exception 'qr_account_already_joined' using errcode='42501';end if;
 update public.app_users set onboarding_role='caregiver',display_name=inv.caretaker_name,
  preferred_locale=p.locale where id=u;
 update public.patients set linked_user_id=u,updated_at=now()
  where id=p.id;
 insert into public.patient_memberships(patient_id,user_id,role,scopes,status,accepted_at,granted_by)
 values(p.id,u,'caregiver',
  array['records:read','consent:read','consent:manage','members:manage','voice:use','observations:write','audit:read'],
  'active',now(),inv.created_by);
 insert into public.patient_authorities(patient_id,user_id,basis,verified_at)
 values(p.id,u,'prototype_qr_claim',now());
 insert into public.consent_grants(patient_id,purpose,actor_id,authorization_basis,expires_at)
 values(p.id,'care_relationship',u,'prototype_qr_claim',now()+interval '90 days');
 update smriti_private.doctor_qr_invites set claimed_by=u,claimed_at=now() where id=inv.id;
 return jsonb_build_object('ok',true,'patient_id',p.id);
end;$f$;

create or replace function public.smriti_doctor_qr_roster()
returns jsonb language sql stable security definer set search_path='' as $f$
 select coalesce(jsonb_agg(jsonb_build_object(
  'patient_id',i.patient_id,'patient_name',p.preferred_name,
  'caretaker_name',i.caretaker_name,'created_at',i.created_at,
  'status',case when i.claimed_at is not null then 'joined'
   when i.revoked_at is not null or i.expires_at<=now() then 'expired'
   else 'pending' end,
  'sharing_enabled',exists(
   select 1 from public.consent_grants c where c.patient_id=i.patient_id
    and c.purpose='clinician_sharing' and c.revoked_at is null
    and (c.expires_at is null or c.expires_at>now()))
 ) order by i.created_at desc),'[]'::jsonb)
 from smriti_private.doctor_qr_invites i join public.patients p on p.id=i.patient_id
 where i.created_by=auth.uid() and exists(select 1 from public.app_users au where au.id=auth.uid() and au.onboarding_role='doctor');
$f$;

create or replace function public.smriti_qr_session_ok()
returns boolean language sql stable security definer set search_path='' as $f$
 select smriti_private.qr_claimed_user(auth.uid());
$f$;

create or replace function public.smriti_update_caretaker_profile(input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare u uuid:=auth.uid();p public.patients;birth date;count_family int;
begin
 select pt.* into p from public.patients pt
 join public.patient_authorities a on a.patient_id=pt.id and a.user_id=u and a.revoked_at is null
 join public.patient_memberships m on m.patient_id=pt.id and m.user_id=u
 where pt.id=(input->>'patient_id')::uuid and pt.synthetic=true and m.role='caregiver'
  and m.status='active' and m.revoked_at is null for update of pt;
 if p.id is null then raise exception 'forbidden' using errcode='42501';end if;
 if length(trim(coalesce(input->>'patient_name',''))) not between 2 and 120
  or length(trim(coalesce(input->>'caretaker_name',''))) not between 2 and 120
  or length(coalesce(input->>'support_notes',''))>2000
  or length(trim(coalesce(input->>'relationship',''))) not between 2 and 100
  or input->>'sex' not in ('female','male','intersex','prefer_not_to_say')
 then raise exception 'invalid_request';end if;
 count_family:=(input->>'family_count')::int;
 if count_family not between 0 and 50 then raise exception 'invalid_request';end if;
 birth:=(input->>'date_of_birth')::date;
 if birth is null or birth>current_date or birth<current_date-interval '120 years'
 then raise exception 'invalid_birth_date';end if;
 update public.patients set
  preferred_name=trim(input->>'patient_name'),
  care_details=jsonb_build_object(
   'date_of_birth',birth,'age',extract(year from age(current_date,birth))::int,
   'sex',input->>'sex','family_count',count_family,
   'caregiver_name',trim(input->>'caretaker_name'),
   'relationship',trim(input->>'relationship'),
   'support_notes',trim(coalesce(input->>'support_notes',''))
  ),updated_at=now()
 where id=p.id;
 update public.app_users set display_name=trim(input->>'caretaker_name') where id=u;
 return jsonb_build_object('ok',true);
end;$f$;

revoke all on function public.smriti_issue_doctor_qr(jsonb),
 public.smriti_claim_caretaker_qr(jsonb),
 public.smriti_doctor_qr_roster(),
 public.smriti_qr_session_ok(),
 public.smriti_update_caretaker_profile(jsonb)
 from public,anon;
grant execute on function public.smriti_issue_doctor_qr(jsonb),
 public.smriti_claim_caretaker_qr(jsonb),
 public.smriti_doctor_qr_roster(),
 public.smriti_qr_session_ok(),
 public.smriti_update_caretaker_profile(jsonb)
 to authenticated;

-- Anonymous access is restricted to a QR-claimed caretaker of a fictional patient.
-- Other anonymous users remain unable to open any protected patient records.
do $rewrite$
declare fn_name text; def text; rewritten text;
begin
 foreach fn_name in array array['has_scope','command','assessment_command','monitoring_command','life_book_command'] loop
  select pg_get_functiondef(p.oid) into def from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='smriti_private' and p.proname=fn_name;
  if def is null then
   if fn_name in ('has_scope','command') then raise exception 'missing function %',fn_name;end if;
   continue; -- Optional modules may be absent in a minimal local test schema.
  end if;
  if fn_name='has_scope' then
   if position('a.email_confirmed_at is not null and not coalesce(a.is_anonymous,false)' in def)=0 then raise exception 'unexpected has_scope';end if;
   rewritten:=replace(def,
    'a.email_confirmed_at is not null and not coalesce(a.is_anonymous,false)',
    '((a.email_confirmed_at is not null and not coalesce(a.is_anonymous,false)) or smriti_private.qr_claimed_user(auth.uid()))');
  else
   if position('email_confirmed_at is not null and not coalesce(is_anonymous,false)' in def)=0 then raise exception 'unexpected function %',fn_name;end if;
   rewritten:=replace(def,
    'email_confirmed_at is not null and not coalesce(is_anonymous,false)',
    '(email_confirmed_at is not null and not coalesce(is_anonymous,false) or smriti_private.qr_claimed_user(auth.uid()))');
  end if;
  -- pg_get_functiondef() returns the complete CREATE OR REPLACE statement.
  execute rewritten;
 end loop;
end;$rewrite$;

commit;