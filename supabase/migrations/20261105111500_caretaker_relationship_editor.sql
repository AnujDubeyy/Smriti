begin;
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
  or input->>'relationship' not in ('daughter','son','wife','husband','father','mother','uncle','aunt','brother','sister','no_blood_relation','other')
  or length(coalesce(input->>'relationship_other',''))>100
  or (input->>'relationship'='other' and length(trim(coalesce(input->>'relationship_other','')))<2)
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
   'relationship_other',trim(coalesce(input->>'relationship_other','')),
   'support_notes',trim(coalesce(input->>'support_notes',''))
  ),updated_at=now()
 where id=p.id;
 update public.app_users set display_name=trim(input->>'caretaker_name') where id=u;
 return jsonb_build_object('ok',true);
end;$function$;
commit;