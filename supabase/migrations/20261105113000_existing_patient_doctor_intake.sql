begin;
-- Update only doctor-authored intake on a fictional patient created by this doctor.
-- This does NOT grant access to private records, logs or conversations.
create or replace function public.smriti_update_doctor_intake(input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare
 u uuid:=auth.uid();
 pid uuid; profile jsonb; p public.patients;
begin
 if u is null or not exists(
  select 1 from public.app_users au join auth.users a on a.id=au.id
  where au.id=u and au.onboarding_role='doctor'
   and not coalesce(a.is_anonymous,false) and a.email_confirmed_at is not null
 ) then raise exception 'doctor_only' using errcode='42501';end if;
 pid:=(input->>'patient_id')::uuid;
 select pt.* into p from public.patients pt
 join smriti_private.doctor_qr_invites i on i.patient_id=pt.id
 join public.patient_memberships m on m.patient_id=pt.id and m.user_id=u
 where pt.id=pid and pt.synthetic=true and i.created_by=u
  and m.role='clinician' and m.status='active' and m.revoked_at is null
  and (m.valid_until is null or m.valid_until>now())
 for update of pt;
 if p.id is null then raise exception 'forbidden' using errcode='42501';end if;
 profile:=input->'clinical_intake';
 if jsonb_typeof(profile)<>'object' or jsonb_typeof(profile->'diagnoses')<>'array'
  or jsonb_typeof(profile->'communication_support')<>'array'
 then raise exception 'invalid_request';end if;
 if jsonb_array_length(profile->'diagnoses') not between 1 and 5
  or jsonb_array_length(profile->'communication_support')>6
  or profile->>'blood_group' not in ('unknown','A+','A-','B+','B-','AB+','AB-','O+','O-')
  or profile->>'diagnosis_status' not in ('confirmed_by_clinician','under_evaluation','unknown')
  or profile->>'dementia_stage' not in ('not_assessed','mild','moderate','severe')
  or profile->>'daily_support' not in ('independent','occasional','daily','full','unknown')
  or length(coalesce(profile->>'other_condition',''))>150
 then raise exception 'invalid_request';end if;
 if exists(select 1 from jsonb_array_elements_text(profile->'diagnoses') d(x)
  where d.x not in ('alzheimers','parkinsons','parkinsons_dementia','lewy_body_dementia',
   'vascular_dementia','frontotemporal_dementia','mci','other','under_evaluation'))
  or exists(select 1 from jsonb_array_elements_text(profile->'communication_support') c(x)
  where c.x not in ('short_sentences','slower_pace','repeat_gently','hearing_support','movement_support','calm_topics'))
  or (profile->'diagnoses' ? 'other' and length(trim(coalesce(profile->>'other_condition','')))<2)
  or (profile->'diagnoses' ? 'under_evaluation' and jsonb_array_length(profile->'diagnoses')>1)
 then raise exception 'invalid_request';end if;
 if profile->>'dementia_stage'<>'not_assessed'
  and (profile->>'diagnosis_status'<>'confirmed_by_clinician'
   or not exists(select 1 from jsonb_array_elements_text(profile->'diagnoses') d(x)
    where d.x in ('alzheimers','parkinsons_dementia','lewy_body_dementia','vascular_dementia','frontotemporal_dementia')))
 then raise exception 'invalid_request';end if;
 update public.patients set
  care_details=coalesce(p.care_details,'{}'::jsonb)||jsonb_build_object('clinical_intake',profile),
  updated_at=now() where id=pid;
 return '{"ok":true}'::jsonb;
end;$f$;

create or replace function public.smriti_doctor_qr_roster()
returns jsonb language sql stable security definer set search_path='' as $f$
 select coalesce(jsonb_agg(jsonb_build_object(
  'patient_id',i.patient_id,'patient_name',p.preferred_name,
  'caretaker_name',i.caretaker_name,
  'clinical_intake',coalesce(p.care_details->'clinical_intake','{}'::jsonb),
  'created_at',i.created_at,
  'status',case when i.claimed_at is not null then 'joined'
   when i.revoked_at is not null or i.expires_at<=now() then 'expired'
   else 'pending' end,
  'sharing_enabled',smriti_private.has_scope(i.patient_id,'records:read')
 ) order by i.created_at desc),'[]'::jsonb)
 from smriti_private.doctor_qr_invites i join public.patients p on p.id=i.patient_id
 where i.created_by=auth.uid()
  and exists(select 1 from public.app_users au where au.id=auth.uid() and au.onboarding_role='doctor');
$f$;

revoke all on function public.smriti_update_doctor_intake(jsonb) from public,anon;
grant execute on function public.smriti_update_doctor_intake(jsonb) to authenticated;
commit;