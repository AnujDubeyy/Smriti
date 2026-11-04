begin;
alter table public.patients add column care_details jsonb;
create function smriti_private.setup_workspace(input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p uuid; result jsonb; purpose text; enabled boolean;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then raise exception 'unauthorized' using errcode='42501'; end if;
 if coalesce(length(trim(input->>'name')),0) not between 1 and 120 or coalesce(length(trim(input->>'doctor_name')),0) not between 1 and 120 or coalesce(length(trim(input->>'caregiver_name')),0) not between 1 and 120 or length(input->>'memories')>1000 or input->>'authorized' is distinct from 'true' then raise exception 'invalid_request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select id into p from public.patients where linked_user_id=u order by created_at limit 1;
 if p is null then result:=smriti_private.command('create_patient',input); p:=(result->>'patient_id')::uuid; end if;
 if not smriti_private.can_revoke_consent(p) then raise exception 'forbidden' using errcode='42501'; end if;
 update public.patients set preferred_name=trim(input->>'name'),locale=input->>'locale',synthetic=false,care_details=input-'authorized'-'audio_capture'-'transcript_retention'-'personalization',updated_at=now() where id=p;
 if not smriti_private.consent_active(p,'care_relationship') then perform smriti_private.command('consent',jsonb_build_object('patient_id',p,'purpose','care_relationship','enabled',true)); end if;
 foreach purpose in array array['audio_capture','transcript_retention','personalization','life_book'] loop
 enabled:=coalesce((input->>case when purpose='life_book' then 'personalization' else purpose end)::boolean,false);
 if enabled is distinct from smriti_private.consent_active(p,purpose) then perform smriti_private.command('consent',jsonb_build_object('patient_id',p,'purpose',purpose,'enabled',enabled)); end if;
 end loop;
 update public.approved_context set state='restricted' where patient_id=p and approved_by=u;
 if length(trim(input->>'memories'))>0 then insert into public.approved_context(patient_id,text,approved_by,state) values(p,input->>'memories',u,'approved'); end if;
 return jsonb_build_object('patient_id',p);
end;$$;
revoke all on function smriti_private.setup_workspace(jsonb) from public,anon,authenticated;
grant execute on function smriti_private.setup_workspace(jsonb) to authenticated;
create function public.smriti_setup(input jsonb) returns jsonb language sql security invoker set search_path='' as $$select smriti_private.setup_workspace(input);$$;
revoke all on function public.smriti_setup(jsonb) from public,anon,authenticated;
grant execute on function public.smriti_setup(jsonb) to authenticated;
-- Keep membership, consent, rate limits and session checks; remove the obsolete test-data gate.
do $$declare definition text;begin
 select pg_get_functiondef('smriti_private.voice_command(text,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'if not (select synthetic from public.patients where id=p) then raise exception ''synthetic_only'' using errcode=''42501'';end if;','');
 execute definition;
end;$$;
commit;
