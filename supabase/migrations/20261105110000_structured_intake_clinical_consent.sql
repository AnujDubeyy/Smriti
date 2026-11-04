begin;
CREATE OR REPLACE FUNCTION public.smriti_issue_doctor_qr(input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if input->>'relationship' not in ('daughter','son','wife','husband','father','mother','uncle','aunt','brother','sister','no_blood_relation','other')
  or (input->>'relationship'='other' and length(trim(coalesce(input->>'relationship_other','')))<2)
  or length(coalesce(input->>'relationship_other',''))>100
  or input->>'blood_group' not in ('unknown','A+','A-','B+','B-','AB+','AB-','O+','O-')
  or input->>'diagnosis_status' not in ('confirmed_by_clinician','under_evaluation','unknown')
  or input->>'dementia_stage' not in ('not_assessed','mild','moderate','severe')
  or input->>'daily_support' not in ('independent','occasional','daily','full','unknown')
  or length(coalesce(input->>'other_condition',''))>150
 then raise exception 'invalid_request';end if;
 if jsonb_typeof(input->'diagnoses')<>'array' or jsonb_typeof(input->'communication_support')<>'array'
 then raise exception 'invalid_request';end if;
 if jsonb_array_length(input->'diagnoses') not between 1 and 5
  or jsonb_array_length(input->'communication_support')>6
 then raise exception 'invalid_request';end if;
 if exists(select 1 from jsonb_array_elements_text(input->'diagnoses') d(x)
  where d.x not in ('alzheimers','parkinsons','parkinsons_dementia','lewy_body_dementia',
   'vascular_dementia','frontotemporal_dementia','mci','other','under_evaluation'))
  or exists(select 1 from jsonb_array_elements_text(input->'communication_support') c(x)
  where c.x not in ('short_sentences','slower_pace','repeat_gently','hearing_support','movement_support','calm_topics'))
  or (input->'diagnoses' ? 'other' and length(trim(coalesce(input->>'other_condition','')))<2)
  or (input->'diagnoses' ? 'under_evaluation' and jsonb_array_length(input->'diagnoses')>1)
 then raise exception 'invalid_request';end if;
 if input->>'dementia_stage'<>'not_assessed'
   and (input->>'diagnosis_status'<>'confirmed_by_clinician'
    or not exists(select 1 from jsonb_array_elements_text(input->'diagnoses') d(x)
     where d.x in ('alzheimers','parkinsons_dementia','lewy_body_dementia','vascular_dementia','frontotemporal_dementia')))
 then raise exception 'invalid_request';end if;
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
  'caregiver_name',caretaker,'relationship',rel,
  'relationship_other',coalesce(input->>'relationship_other',''),
  'support_notes','',
  'clinical_intake',jsonb_build_object(
   'blood_group',input->>'blood_group',
   'diagnoses',input->'diagnoses',
   'diagnosis_status',input->>'diagnosis_status',
   'dementia_stage',input->>'dementia_stage',
   'daily_support',input->>'daily_support',
   'communication_support',input->'communication_support',
   'other_condition',coalesce(input->>'other_condition','')
  )
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
end;$function$;

CREATE OR REPLACE FUNCTION public.smriti_doctor_qr_roster()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_agg(jsonb_build_object(
  'patient_id',i.patient_id,'patient_name',p.preferred_name,
  'caretaker_name',i.caretaker_name,'created_at',i.created_at,
  'status',case when i.claimed_at is not null then 'joined'
   when i.revoked_at is not null or i.expires_at<=now() then 'expired'
   else 'pending' end,
  'sharing_enabled',smriti_private.has_scope(i.patient_id,'records:read')
 ) order by i.created_at desc),'[]'::jsonb)
 from smriti_private.doctor_qr_invites i join public.patients p on p.id=i.patient_id
 where i.created_by=auth.uid() and exists(select 1 from public.app_users au where au.id=auth.uid() and au.onboarding_role='doctor');
$function$;

CREATE OR REPLACE FUNCTION public.smriti_update_caretaker_profile(input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  care_details=coalesce(p.care_details,'{}'::jsonb)||jsonb_build_object(
   'date_of_birth',birth,'age',extract(year from age(current_date,birth))::int,
   'sex',input->>'sex','family_count',count_family,
   'caregiver_name',trim(input->>'caretaker_name'),
   'relationship',trim(input->>'relationship'),
   'support_notes',trim(coalesce(input->>'support_notes',''))
  ),updated_at=now()
 where id=p.id;
 update public.app_users set display_name=trim(input->>'caretaker_name') where id=u;
 return jsonb_build_object('ok',true);
end;$function$;

-- Only the authorized caretaker with explicit personalization consent may send
-- structured communication guidance to external LLMs. Blood group is never sent.
create or replace function public.smriti_conversation_support(target uuid)
returns jsonb language sql stable security definer set search_path='' as $f$
 select case when p.synthetic=true
   and smriti_private.has_scope(target,'voice:use')
   and smriti_private.consent_active(target,'personalization')
 then jsonb_build_object(
  'relationship',coalesce(p.care_details->>'relationship',''),
  'diagnoses',coalesce(p.care_details->'clinical_intake'->'diagnoses','[]'::jsonb),
  'diagnosis_status',coalesce(p.care_details->'clinical_intake'->>'diagnosis_status','unknown'),
  'dementia_stage',coalesce(p.care_details->'clinical_intake'->>'dementia_stage','not_assessed'),
  'daily_support',coalesce(p.care_details->'clinical_intake'->>'daily_support','unknown'),
  'communication_support',coalesce(p.care_details->'clinical_intake'->'communication_support','[]'::jsonb))
 else '{}'::jsonb end from public.patients p where p.id=target;
$f$;
revoke all on function public.smriti_conversation_support(uuid) from public,anon;
grant execute on function public.smriti_conversation_support(uuid) to authenticated;

commit;
