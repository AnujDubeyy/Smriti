-- Apply only to a dedicated Smriti project. No patient data or credentials are seeded.
begin;
create schema if not exists smriti_private;
revoke all on schema smriti_private from public, anon, authenticated;
grant usage on schema smriti_private to authenticated;

create table public.app_users (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (length(display_name)<=120),
 preferred_locale text not null default 'en-IN' check(preferred_locale in ('en-IN','hi-IN','mr-IN')),
 clinician_verification_status text not null default 'unverified' check(clinician_verification_status in ('unverified','pending','verified','rejected','suspended')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.patients (
 id uuid primary key default gen_random_uuid(),
 linked_user_id uuid references auth.users(id) on delete set null,
 preferred_name text not null check(length(preferred_name) between 1 and 120),
 locale text not null default 'en-IN' check(locale in ('en-IN','hi-IN','mr-IN')),
 timezone text not null default 'Asia/Kolkata',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.patient_memberships (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id),
 user_id uuid not null references auth.users(id),
 role text not null check(role in ('patient','caregiver','clinician')),
 scopes text[] not null default '{}',
 status text not null default 'invited' check(status in ('invited','active','revoked')),
 granted_by uuid references auth.users(id), accepted_at timestamptz, valid_until timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(patient_id,user_id), check(status<>'active' or accepted_at is not null),
 check(status<>'revoked' or revoked_at is not null)
);
create index memberships_user_patient on public.patient_memberships(user_id,patient_id);
create table public.consent_grants (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id),
 purpose text not null check(purpose in ('care_relationship','life_book','personalization','audio_capture','audio_retention','transcript_retention','clinician_sharing','notifications','research_export')),
 scope text[] not null default '{}', actor_id uuid not null references auth.users(id),
 recipient_id uuid references auth.users(id),
 authorization_basis text not null check(authorization_basis in ('self','verified_representative')),
 evidence_ref uuid, granted_at timestamptz not null default now(), expires_at timestamptz, revoked_at timestamptz,
 check(expires_at is null or expires_at>granted_at), check(revoked_at is null or revoked_at>=granted_at)
);
create index consent_patient_purpose on public.consent_grants(patient_id,purpose);
-- Authorities are provisioned only after a separate authority review, never inferred from caregiver role.
create table public.patient_authorities (
 patient_id uuid not null references public.patients(id), user_id uuid not null references auth.users(id),
 basis text not null check(basis in ('self','verified_representative')), evidence_ref uuid,
 verified_by uuid references auth.users(id), verified_at timestamptz not null, revoked_at timestamptz,
 primary key(patient_id,user_id)
);
create table public.account_invitations (
 id uuid primary key default gen_random_uuid(),patient_id uuid not null references public.patients(id),
 invited_by uuid not null references auth.users(id), recipient_email text not null,
 role text not null check(role in ('patient','caregiver','clinician')), scopes text[] not null default '{}',
 token_hash text not null unique, expires_at timestamptz not null, accepted_at timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.clinical_notes (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id),
 author_id uuid not null references auth.users(id), body text not null check(length(body) between 1 and 10000),
 created_at timestamptz not null default now()
);
create index clinical_notes_patient on public.clinical_notes(patient_id,created_at desc);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(),actor_id uuid, patient_id uuid,
 entity text not null, entity_id uuid not null, event text not null,
 timestamp timestamptz not null default now(), outcome text not null default 'success'
);
create index audit_events_patient on public.audit_events(patient_id,timestamp desc);

-- Bypass only for this internal, non-exposed membership lookup, with identity bound to auth.uid().
create function smriti_private.has_scope(target uuid, required_scope text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
  select 1 from public.patient_memberships m join public.app_users u on u.id=m.user_id
  join auth.users a on a.id=m.user_id
  where m.patient_id=target and m.user_id=auth.uid() and m.status='active'
   and a.email_confirmed_at is not null and not coalesce(a.is_anonymous,false)
   and m.revoked_at is null and (m.valid_until is null or m.valid_until>now())
   and required_scope=any(m.scopes)
   and (m.role<>'clinician' or (u.clinician_verification_status='verified' and exists (
    select 1 from public.consent_grants c where c.patient_id=target and c.purpose='clinician_sharing'
     and c.revoked_at is null and c.granted_at<=now() and (c.expires_at is null or c.expires_at>now())
     and (c.recipient_id is null or c.recipient_id=auth.uid())
   )))
   and (required_scope not in ('clinical_notes:read','clinical_notes:write','care_plan:write','assessment:finalize')
        or (m.role='clinician' and u.clinician_verification_status='verified'))
 );
$$;
revoke all on function smriti_private.has_scope(uuid,text) from public,anon,authenticated;
grant execute on function smriti_private.has_scope(uuid,text) to authenticated;

create function smriti_private.can_revoke_consent(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and smriti_private.has_scope(target,'consent:manage') and exists (
  select 1 from public.patient_authorities a where a.patient_id=target and a.user_id=auth.uid() and a.revoked_at is null
 );
$$;
revoke all on function smriti_private.can_revoke_consent(uuid) from public,anon,authenticated;
grant execute on function smriti_private.can_revoke_consent(uuid) to authenticated;

create function smriti_private.new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Authorization fields are intentionally NOT copied from raw_user_meta_data.
 insert into public.app_users(id) values(new.id);
 return new;
end;$$;
revoke all on function smriti_private.new_user() from public,anon,authenticated;
create trigger smriti_new_user after insert on auth.users for each row execute function smriti_private.new_user();

create function smriti_private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare record_data jsonb;
begin
 record_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 insert into public.audit_events(actor_id,patient_id,entity,entity_id,event)
 values(auth.uid(),case when tg_table_name='patients' then (record_data->>'id')::uuid else (record_data->>'patient_id')::uuid end,
 tg_table_name,coalesce((record_data->>'id')::uuid,(record_data->>'patient_id')::uuid),lower(tg_op));
 return coalesce(new,old);
end;$$;
revoke all on function smriti_private.audit_change() from public,anon,authenticated;

create function smriti_private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end;$$;
revoke all on function smriti_private.touch_updated_at() from public,anon,authenticated;

do $$ declare t text; begin
 foreach t in array array['app_users','patients','patient_memberships','consent_grants','patient_authorities','account_invitations','clinical_notes','audit_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
 foreach t in array array['app_users','patients','patient_memberships','consent_grants','patient_authorities','account_invitations','clinical_notes'] loop
  execute format('create trigger smriti_audit after insert or update or delete on public.%I for each row execute function smriti_private.audit_change()',t);
 end loop;
 foreach t in array array['app_users','patients','patient_memberships'] loop
  execute format('create trigger smriti_updated before update on public.%I for each row execute function smriti_private.touch_updated_at()',t);
 end loop;
end $$;

grant select on public.app_users,public.patients,public.patient_memberships,public.consent_grants,public.patient_authorities,public.clinical_notes,public.audit_events to authenticated;
grant update(display_name,preferred_locale) on public.app_users to authenticated;
grant update(revoked_at) on public.consent_grants to authenticated;
grant insert(patient_id,author_id,body) on public.clinical_notes to authenticated;
create policy own_profile on public.app_users for select to authenticated using(id=(select auth.uid()));
create policy own_preferences on public.app_users for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy patient_access on public.patients for select to authenticated using(smriti_private.has_scope(id,'records:read'));
create policy own_memberships on public.patient_memberships for select to authenticated using(user_id=(select auth.uid()));
create policy consent_access on public.consent_grants for select to authenticated using(smriti_private.has_scope(patient_id,'consent:read') or smriti_private.can_revoke_consent(patient_id));
create policy consent_withdrawal on public.consent_grants for update to authenticated
 using(revoked_at is null and smriti_private.can_revoke_consent(patient_id))
 with check(revoked_at is not null and revoked_at<=now() and smriti_private.can_revoke_consent(patient_id));
create policy authority_access on public.patient_authorities for select to authenticated using(user_id=(select auth.uid()));
create policy clinical_access on public.clinical_notes for select to authenticated using(smriti_private.has_scope(patient_id,'clinical_notes:read'));
create policy clinical_author on public.clinical_notes for insert to authenticated
 with check(author_id=(select auth.uid()) and smriti_private.has_scope(patient_id,'clinical_notes:write'));
create policy audit_access on public.audit_events for select to authenticated using(smriti_private.has_scope(patient_id,'audit:read'));

-- Private bucket; uploads remain disabled until the consented media pipeline is implemented.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('smriti-recordings','smriti-recordings',false,10485760,array['audio/webm','audio/wav','audio/mpeg']);
-- No storage.objects policies are granted in this increment: default deny for all clients.
commit;
