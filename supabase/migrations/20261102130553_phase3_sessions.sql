begin;
create table public.voice_sessions(id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.patients(id),initiated_by uuid not null references auth.users(id),locale text not null check(locale in ('en-IN','hi-IN','mr-IN')),status text not null default 'active' check(status in ('active','stopped')),created_at timestamptz not null default now(),stopped_at timestamptz);
create table public.voice_turns(id uuid primary key,session_id uuid not null references public.voice_sessions(id),patient_id uuid not null references public.patients(id),status text not null check(status in ('processing','responding','complete','failed','cancelled')),input_hash text not null,transcript text,result jsonb,provider_metadata jsonb not null default '{}',created_at timestamptz not null default now());
create index voice_sessions_patient on public.voice_sessions(patient_id,created_at desc);
create index voice_turns_session on public.voice_turns(session_id,created_at);
create table public.care_logs(id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.patients(id),author_id uuid not null references auth.users(id),text text not null check(length(text) between 1 and 2000),source text not null default 'human_observation' check(source='human_observation'),created_at timestamptz not null default now());
create index care_logs_patient on public.care_logs(patient_id,created_at desc);
create table public.approved_context(id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.patients(id),text text not null check(length(text)<=1000),approved_by uuid not null references auth.users(id),state text not null check(state in ('approved','restricted')),created_at timestamptz not null default now());
-- Context authorship/verification UI belongs to Phase 4. No direct client writes.
do $$declare t text;begin foreach t in array array['voice_sessions','voice_turns','care_logs','approved_context'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create trigger smriti_audit after insert or update or delete on public.%I for each row execute function smriti_private.audit_change()',t);
 end loop;end$$;
create policy session_access on public.voice_sessions for select to authenticated using(smriti_private.has_scope(patient_id,'records:read'));
create policy turns_access on public.voice_turns for select to authenticated using(smriti_private.has_scope(patient_id,'records:read'));
create policy log_access on public.care_logs for select to authenticated using(smriti_private.has_scope(patient_id,'records:read'));
create policy approved_context_access on public.approved_context for select to authenticated using(smriti_private.has_scope(patient_id,'records:read'));
create function smriti_private.consent_active(p uuid,purpose_name text) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.consent_grants where patient_id=p and purpose=purpose_name and revoked_at is null and granted_at<=now() and (expires_at is null or expires_at>now()) and (recipient_id is null or recipient_id=auth.uid()));$$;
revoke all on function smriti_private.consent_active(uuid,text) from public,anon,authenticated;

create function smriti_private.voice_command(operation text,input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p uuid;s public.voice_sessions;v public.voice_turns;sid uuid;retained boolean;
begin
 if u is null then raise exception 'unauthorized' using errcode='42501';end if;
 if operation='start' then
  p:=(input->>'patient_id')::uuid;
  if not smriti_private.has_scope(p,'voice:use') or not smriti_private.consent_active(p,'audio_capture') or not smriti_private.consent_active(p,'care_relationship') then raise exception 'consent_required' using errcode='42501';end if;
  if not (select synthetic from public.patients where id=p) then raise exception 'synthetic_only' using errcode='42501';end if;
  perform smriti_private.quota('sessions',5);
  insert into public.voice_sessions(patient_id,initiated_by,locale) values(p,u,input->>'locale') returning id into sid;
  return jsonb_build_object('id',sid);
 elsif operation in ('logs','add_log','context') then
  p:=(input->>'patient_id')::uuid;
  if not smriti_private.has_scope(p,'records:read') then raise exception 'forbidden' using errcode='42501';end if;
  if operation='add_log' then
   if not smriti_private.has_scope(p,'observations:write') then raise exception 'forbidden' using errcode='42501';end if;
   perform smriti_private.quota('logs',10);
   insert into public.care_logs(patient_id,author_id,text) values(p,u,input->>'text');return '{"ok":true}';
  elsif operation='context' then
   if not smriti_private.has_scope(p,'voice:use') then raise exception 'forbidden' using errcode='42501';end if;
   return jsonb_build_object('items',case when smriti_private.consent_active(p,'personalization') and smriti_private.consent_active(p,'life_book') then
    coalesce((select jsonb_agg(to_jsonb(x)) from (select id,text from public.approved_context where patient_id=p and state='approved' order by created_at desc limit 5)x),'[]'::jsonb) else '[]'::jsonb end);
  end if;
  return jsonb_build_object('synthetic',(select synthetic from public.patients where id=p),'logs',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,text,source,author_id,created_at from public.care_logs where patient_id=p order by created_at desc limit 20)x),'[]'::jsonb),'sessions',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,status,locale,created_at from public.voice_sessions where patient_id=p order by created_at desc limit 20)x),'[]'::jsonb));
 end if;
 select * into s from public.voice_sessions where id=(input->>'session_id')::uuid for update;
 if s.id is null or s.initiated_by<>u or not smriti_private.has_scope(s.patient_id,'voice:use') then raise exception 'forbidden' using errcode='42501';end if;
 if operation='stop' then
  update public.voice_sessions set status='stopped',stopped_at=now() where id=s.id;
  update public.voice_turns set status='cancelled',transcript=null,result=null where session_id=s.id and status in ('processing','responding');return '{"ok":true}';
 end if;
 if s.status<>'active' or s.created_at<now()-interval '30 minutes' or not smriti_private.consent_active(s.patient_id,'audio_capture') or not smriti_private.consent_active(s.patient_id,'care_relationship') then raise exception 'session_inactive' using errcode='42501';end if;
 if operation='claim' then
  select * into v from public.voice_turns where id=(input->>'turn_id')::uuid;
  if v.id is not null then
   if v.session_id<>s.id or v.input_hash<>input->>'hash' then raise exception 'idempotency_conflict';end if;
   return jsonb_build_object('duplicate',true,'status',v.status);
  end if;
  perform smriti_private.quota('voice_turns',6);
  if (select count(*) from public.voice_turns where patient_id=s.patient_id and created_at>now()-interval '24 hours')>=100 then raise exception 'daily_limit';end if;
  insert into public.voice_turns(id,session_id,patient_id,status,input_hash) values((input->>'turn_id')::uuid,s.id,s.patient_id,'processing',input->>'hash');
  return jsonb_build_object('duplicate',false,'patient_id',s.patient_id,'locale',s.locale);
 elsif operation='reserve_response' then
  update public.voice_turns set status='responding' where id=(input->>'turn_id')::uuid and session_id=s.id and status='processing';
  if not found then raise exception 'duplicate_turn';end if;return '{"ok":true}';
 elsif operation='finish' then
  retained:=smriti_private.consent_active(s.patient_id,'transcript_retention');
  update public.voice_turns set status='complete',transcript=case when retained then input->>'transcript' end,result=case when retained then input->'result' end,provider_metadata=input->'metadata'
   where id=(input->>'turn_id')::uuid and session_id=s.id and status='responding';
  if not found then raise exception 'turn_inactive';end if;
  return jsonb_build_object('retained',retained);
 elsif operation='check' then
  return jsonb_build_object('patient_id',s.patient_id,'locale',s.locale);
 elsif operation='fail' then
  update public.voice_turns set status='failed' where id=(input->>'turn_id')::uuid and session_id=s.id and status in ('processing','responding');return '{"ok":true}';
 end if;
 raise exception 'invalid_operation';
end;$$;
revoke all on function smriti_private.voice_command(text,jsonb) from public,anon,authenticated;
grant execute on function smriti_private.voice_command(text,jsonb) to authenticated;
create function public.smriti_voice(operation text,input jsonb) returns jsonb language sql security invoker set search_path='' as $$select smriti_private.voice_command(operation,input);$$;
revoke all on function public.smriti_voice(text,jsonb) from public,anon,authenticated;
grant execute on function public.smriti_voice(text,jsonb) to authenticated;
create function smriti_private.withdraw_voice() returns trigger language plpgsql security definer set search_path='' as $$begin
 if old.revoked_at is null and new.revoked_at is not null then
  if new.purpose in ('care_relationship','audio_capture','personalization','life_book') then
   update public.voice_sessions set status='stopped',stopped_at=now() where patient_id=new.patient_id and status='active';
   update public.voice_turns set status='cancelled',transcript=null,result=null where patient_id=new.patient_id and status in ('processing','responding');
  end if;
  if new.purpose='transcript_retention' then update public.voice_turns set transcript=null,result=null where patient_id=new.patient_id;end if;
 end if;return new;end;$$;
revoke all on function smriti_private.withdraw_voice() from public,anon,authenticated;
create trigger withdraw_voice after update on public.consent_grants for each row execute function smriti_private.withdraw_voice();
create function smriti_private.ai_quota() returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then raise exception 'unauthorized' using errcode='42501';end if;
 perform smriti_private.quota('analysis',3);
end;$$;
revoke all on function smriti_private.ai_quota() from public,anon,authenticated;
grant execute on function smriti_private.ai_quota() to authenticated;
create function public.smriti_ai_quota() returns void language sql security invoker set search_path='' as $$select smriti_private.ai_quota();$$;
revoke all on function public.smriti_ai_quota() from public,anon,authenticated;
grant execute on function public.smriti_ai_quota() to authenticated;
commit;
