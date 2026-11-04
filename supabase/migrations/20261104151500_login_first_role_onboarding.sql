-- Role preference is navigation state, never a medical authorization grant.
-- Only the dedicated Smriti Supabase project may run this migration.
begin;

alter table public.app_users
 add column if not exists onboarding_role text
   check (onboarding_role in ('doctor','caregiver')),
 add column if not exists professional_profile jsonb not null default '{}'::jsonb;

grant update(onboarding_role,professional_profile) on public.app_users to authenticated;

-- The shared Patient & Caregiver account owns a fictional test profile.
-- No personal story is auto-approved or sent to the AI at signup.
create or replace function smriti_private.setup_workspace(input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid();
 p uuid;
 result jsonb;
 purpose text;
 enabled boolean;
 birth_date date;
 calculated_age int;
 profile jsonb;
 choice text;
begin
 if u is null or not exists(
  select 1 from auth.users where id=u and email_confirmed_at is not null
   and not coalesce(is_anonymous,false)
 ) then raise exception 'unauthorized' using errcode='42501'; end if;

 if not exists(select 1 from public.app_users
    where id=u and onboarding_role='caregiver')
 then raise exception 'caregiver_role_required' using errcode='42501'; end if;

 if length(trim(coalesce(input->>'patient_name',''))) not between 1 and 120
    or length(trim(coalesce(input->>'caregiver_name',''))) not between 1 and 120
    or length(trim(coalesce(input->>'relationship',''))) not between 1 and 100
    or input->>'locale' not in ('en-IN','hi-IN','mr-IN')
    or input->>'sex' not in ('female','male','intersex','prefer_not_to_say')
    or input->>'authorized' is distinct from 'true'
    or length(coalesce(input->>'support_notes',''))>2000
 then raise exception 'invalid_request'; end if;

 birth_date:=(input->>'date_of_birth')::date;
 if birth_date is null or birth_date>current_date
    or birth_date<current_date-interval '120 years'
 then raise exception 'invalid_birth_date'; end if;
 calculated_age:=extract(year from age(current_date,birth_date))::integer;
 if (input->>'family_count')::int not between 0 and 50
 then raise exception 'invalid_family_count'; end if;

 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select id into p from public.patients
 where linked_user_id=u order by created_at limit 1;

 if p is null then
  result:=smriti_private.command('create_patient',jsonb_build_object(
   'name',trim(input->>'patient_name'),
   'locale',input->>'locale'));
  p:=(result->>'patient_id')::uuid;
 end if;

 if not smriti_private.can_revoke_consent(p)
 then raise exception 'forbidden' using errcode='42501'; end if;

 profile:=jsonb_build_object(
  'date_of_birth',birth_date,
  'age',calculated_age,
  'sex',input->>'sex',
  'family_count',(input->>'family_count')::int,
  'caregiver_name',trim(input->>'caregiver_name'),
  'relationship',trim(input->>'relationship'),
  'support_notes',trim(coalesce(input->>'support_notes',''))
 );

 update public.patients
 set preferred_name=trim(input->>'patient_name'),locale=input->>'locale',
     synthetic=true,care_details=profile,updated_at=now()
 where id=p;

 -- A combined Patient & Caregiver login is not a clinician account.
 update public.patient_memberships
 set role='caregiver'
 where patient_id=p and user_id=u and role='patient';

 foreach purpose in array array[
  'care_relationship','audio_capture','transcript_retention','personalization','life_book'
 ] loop
  enabled:=case purpose
    when 'care_relationship' then true
    when 'life_book' then coalesce((input->>'personalization')::boolean,false)
    else coalesce((input->>purpose)::boolean,false)
  end;
  if enabled is distinct from smriti_private.consent_active(p,purpose) then
   perform smriti_private.command('consent',jsonb_build_object(
     'patient_id',p,'purpose',purpose,'enabled',enabled));
  end if;
 end loop;

 return jsonb_build_object('patient_id',p,'role','caregiver');
end;
$$;

revoke all on function smriti_private.setup_workspace(jsonb) from public,anon,authenticated;
grant execute on function smriti_private.setup_workspace(jsonb) to authenticated;

commit;
