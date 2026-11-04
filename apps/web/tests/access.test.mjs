import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
let db;
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const p1=uid(101),p2=uid(102);
before(async()=>{
 db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,name text,bucket_id text);alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;grant select on storage.objects to anon,authenticated;`);
 for(const f of readdirSync('../../supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync(`../../supabase/migrations/${f}`,'utf8'));
 for(let n=1;n<=6;n++)await db.query(`insert into auth.users(id,email_confirmed_at,raw_user_meta_data,email) values($1,now(),$2,$3)`,[uid(n),JSON.stringify({role:'clinician',clinician_verification_status:'verified'}),`synthetic${n}@example.invalid`]);
 await db.query(`update public.app_users set clinician_verification_status='verified' where id=$1`,[uid(3)]);
 await db.query(`update public.app_users set onboarding_role='caregiver' where id=$1`,[uid(1)]);
 await db.query(`insert into public.patients(id,preferred_name) values($1,'Synthetic A'),($2,'Synthetic B')`,[p1,p2]);
 const members=[[1,p1,'patient',['records:read','consent:manage','consent:read']],[2,p1,'caregiver',['records:read','clinical_notes:read','consent:manage']],[3,p1,'clinician',['records:read','clinical_notes:read','clinical_notes:write']],[4,p2,'patient',['records:read']],[5,p1,'clinician',['records:read','clinical_notes:read']],[6,p1,'caregiver',['records:read']]];
 for(const [n,p,r,s]of members)await db.query(`insert into patient_memberships(patient_id,user_id,role,scopes,status,accepted_at) values($1,$2,$3,$4,'active',now())`,[p,uid(n),r,s]);
 await db.query(`update patient_memberships set valid_until=now()-interval '1 hour' where user_id=$1`,[uid(6)]);
 await db.query(`insert into clinical_notes(patient_id,author_id,body) values($1,$2,'Synthetic private note')`,[p1,uid(3)]);
 await db.query(`insert into patient_authorities(patient_id,user_id,basis,verified_at) values($1,$2,'self',now())`,[p1,uid(1)]);
 await db.query(`insert into consent_grants(id,patient_id,purpose,actor_id,authorization_basis) values($1,$2,'audio_retention',$3,'self')`,[uid(201),p1,uid(1)]);
 await db.query(`insert into consent_grants(id,patient_id,purpose,actor_id,recipient_id,authorization_basis) values($1,$2,'clinician_sharing',$3,$4,'self')`,[uid(202),p1,uid(1),uid(3)]);
 await db.exec(`insert into storage.objects values(gen_random_uuid(),'private-audio.webm','smriti-recordings')`);
});
after(async()=>{await db?.close();});
async function asUser(n,fn){await db.exec('begin');try{await db.query(`select set_config('request.jwt.claim.sub',$1,true)`,[uid(n)]);await db.exec('set local role authenticated');return await fn();}finally{await db.exec('rollback');}}
const query=(s,args=[])=>db.query(s,args);
test('signup metadata cannot assert clinician verification',async()=>{const r=await query('select clinician_verification_status from app_users where id=$1',[uid(5)]);assert.equal(r.rows[0].clinician_verification_status,'unverified');});
test('patient lists only their authorized patient',()=>asUser(1,async()=>{const r=await query('select id from patients');assert.deepEqual(r.rows,[{id:p1}]);}));
test('direct cross-patient ID query returns no row',()=>asUser(1,async()=>{assert.equal((await query('select * from patients where id=$1',[p2])).rows.length,0);}));
test('caregiver cannot read clinical notes even with accidentally granted note scope',()=>asUser(2,async()=>{assert.equal((await query('select * from clinical_notes')).rows.length,0);}));
test('verified clinician sees notes only for an active patient relationship',()=>asUser(3,async()=>{assert.equal((await query('select * from clinical_notes')).rows.length,1);assert.equal((await query('select * from patients where id=$1',[p2])).rows.length,0);}));
test('unverified clinician membership grants no care access',()=>asUser(5,async()=>{assert.equal((await query('select * from patients')).rows.length,0);}));
test('expired membership grants no patient access',()=>asUser(6,async()=>{assert.equal((await query('select * from patients')).rows.length,0);}));
test('member cannot grant their own role or scopes',()=>asUser(2,async()=>{await assert.rejects(query("update patient_memberships set role='clinician',scopes=array['clinical_notes:read'] where user_id=$1",[uid(2)]),e=>e.code==='42501');}));
test('user cannot set their own professional verification',()=>asUser(5,async()=>{await assert.rejects(query("update app_users set clinician_verification_status='verified' where id=$1",[uid(5)]),e=>e.code==='42501');}));
test('user can edit preferences without editing another profile',()=>asUser(1,async()=>{assert.equal((await query("update app_users set display_name='Synthetic alias' where id=$1 returning id",[uid(1)])).rows.length,1);assert.equal((await query("update app_users set display_name='Intrusion' where id=$1 returning id",[uid(2)])).rows.length,0);}));
test('revocation immediately removes access without refreshing a JWT',async()=>{await query("update patient_memberships set status='revoked',revoked_at=now() where user_id=$1",[uid(2)]);await asUser(2,async()=>assert.equal((await query('select * from patients')).rows.length,0));await query("update patient_memberships set status='active',revoked_at=null where user_id=$1",[uid(2)]);});
test('clinician suspension immediately removes access',async()=>{await query("update app_users set clinician_verification_status='suspended' where id=$1",[uid(3)]);await asUser(3,async()=>assert.equal((await query('select * from clinical_notes')).rows.length,0));await query("update app_users set clinician_verification_status='verified' where id=$1",[uid(3)]);});
test('caregiver ownership is not consent authority',()=>asUser(2,async()=>{assert.equal((await query('update consent_grants set revoked_at=now() returning id')).rows.length,0);}));
test('verified consent authority can withdraw but cannot restore consent',()=>asUser(1,async()=>{assert.equal((await query('update consent_grants set revoked_at=now() where id=$1 returning id',[uid(201)])).rows.length,1);assert.equal((await query('update consent_grants set revoked_at=null where id=$1 returning id',[uid(201)])).rows.length,0);}));
test('consent evidence and purpose cannot be altered by clients',()=>asUser(1,async()=>{await assert.rejects(query("update consent_grants set purpose='research_export'"),e=>e.code==='42501');}));
test('audit events cannot be forged by clients',()=>asUser(1,async()=>{await assert.rejects(query("insert into audit_events(entity,entity_id,event) values('patients',$1,'fake')",[p1]),e=>e.code==='42501');}));
test('private recording objects are unavailable to authenticated clients',()=>asUser(1,async()=>{assert.equal((await query('select * from storage.objects')).rows.length,0);}));
test('anonymous role cannot read patient tables',async()=>{await db.exec('begin;set local role anon');try{await assert.rejects(query('select * from patients'),e=>e.code==='42501');}finally{await db.exec('rollback');}});
test('private bucket and policy coverage are present',async()=>{assert.equal((await query("select public from storage.buckets where id='smriti-recordings'")).rows[0].public,false);assert.equal((await query("select count(*)::int as n from pg_tables where schemaname='public' and not rowsecurity")).rows[0].n,0);});

test('withdrawing clinician sharing removes clinical access immediately',async()=>{await query('update consent_grants set revoked_at=now() where id=$1',[uid(202)]);await asUser(3,async()=>assert.equal((await query('select * from clinical_notes')).rows.length,0));await query('update consent_grants set revoked_at=null where id=$1',[uid(202)]);});
test('clinician cannot forge another author',()=>asUser(3,async()=>{await assert.rejects(query('insert into clinical_notes(patient_id,author_id,body) values($1,$2,$3)',[p1,uid(1),'Synthetic forged note']),e=>e.code==='42501');}));
test('verified clinician writes own note and mutation is audited',()=>asUser(3,async()=>{await query('insert into clinical_notes(patient_id,author_id,body) values($1,$2,$3)',[p1,uid(3),'Synthetic clinician note']);assert.equal((await query('select * from clinical_notes')).rows.length,2);await db.exec('reset role');assert.ok((await query("select * from audit_events where entity='clinical_notes' and actor_id=$1",[uid(3)])).rows.length>0);}));
test('unconfirmed accounts cannot read patients',async()=>{await query('update auth.users set email_confirmed_at=null where id=$1',[uid(1)]);await asUser(1,async()=>assert.equal((await query('select * from patients')).rows.length,0));await query('update auth.users set email_confirmed_at=now() where id=$1',[uid(1)]);});
test('consent cannot be fabricated by a client',()=>asUser(2,async()=>{await assert.rejects(query("insert into consent_grants(patient_id,purpose,actor_id,authorization_basis) values($1,'clinician_sharing',$2,'self')",[p1,uid(2)]),e=>e.code==='42501');}));
const command=async(op,input)=>{const r=await query('select public.smriti_command($1,$2) as result',[op,JSON.stringify(input)]);return r.rows[0].result;};
const voice=async(op,input)=>{const r=await query('select public.smriti_voice($1,$2) as result',[op,JSON.stringify(input)]);return r.rows[0].result;};
async function ownProfile(){return(await command('create_patient',{name:'Synthetic self',locale:'en-IN'})).patient_id;}
async function grant(p,purpose){return command('consent',{patient_id:p,purpose,enabled:true});}
test('onboarding creates a synthetic self relationship and self authority atomically',()=>asUser(1,async()=>{const p=await ownProfile();const r=await command('workspace',{patient_id:p});assert.equal(r.patient.synthetic,true);assert.equal(r.membership.role,'patient');assert.equal(r.can_manage,true);}));
test('verification request never approves professional status',()=>asUser(5,async()=>{await command('verification_request',{kind:'clinician'});assert.equal((await query('select clinician_verification_status from app_users where id=$1',[uid(5)])).rows[0].clinician_verification_status,'pending');}));
test('caregiver cannot invite or grant consent',()=>asUser(2,async()=>{await assert.rejects(command('consent',{patient_id:p1,purpose:'audio_capture',enabled:true}),e=>e.code==='42501');}));
test('invitation contains only a hash and rejects caller-selected scopes',()=>asUser(1,async()=>{const p=await ownProfile();await command('invite',{patient_id:p,email:'recipient@example.invalid',role:'caregiver',hash:'a'.repeat(64),scopes:['clinical_notes:read']});await db.exec('reset role');const r=(await query('select scopes,token_hash from account_invitations where patient_id=$1',[p])).rows[0];assert.equal(r.token_hash,'a'.repeat(64));assert.ok(!r.scopes.includes('clinical_notes:read'));}));
test('invitation redemption enforces recipient email',()=>asUser(1,async()=>{const p=await ownProfile();await command('invite',{patient_id:p,email:'wrong@example.invalid',role:'caregiver',hash:'b'.repeat(64)});await assert.rejects(command('accept_invite',{hash:'b'.repeat(64)}),e=>e.code==='42501');}));
test('invitation expiry is enforced',()=>asUser(1,async()=>{const p=await ownProfile();await command('invite',{patient_id:p,email:'synthetic1@example.invalid',role:'caregiver',hash:'c'.repeat(64)});await db.exec('reset role');await query("update account_invitations set expires_at=now()-interval '1 hour' where token_hash=$1",['c'.repeat(64)]);await db.exec('set local role authenticated');await assert.rejects(command('accept_invite',{hash:'c'.repeat(64)}),e=>e.code==='42501');}));
test('clinical invitation cannot bypass verification',()=>asUser(1,async()=>{const p=await ownProfile();await command('invite',{patient_id:p,email:'synthetic5@example.invalid',role:'clinician',hash:'d'.repeat(64)});await query("select set_config('request.jwt.claim.sub',$1,true)",[uid(5)]);await assert.rejects(command('accept_invite',{hash:'d'.repeat(64)}),e=>e.code==='42501');}));
test('caregiver redemption is idempotent and creates only one active relationship',()=>asUser(1,async()=>{const p=await ownProfile();await command('invite',{patient_id:p,email:'synthetic2@example.invalid',role:'caregiver',hash:'e'.repeat(64)});await query("select set_config('request.jwt.claim.sub',$1,true)",[uid(2)]);const a=await command('accept_invite',{hash:'e'.repeat(64)});assert.deepEqual(await command('accept_invite',{hash:'e'.repeat(64)}),a);assert.equal((await query('select * from patient_memberships where patient_id=$1',[p])).rows.length,1);}));
test('voice session requires separate relationship and audio-capture consent',()=>asUser(1,async()=>{const p=await ownProfile();await grant(p,'care_relationship');await assert.rejects(voice('start',{patient_id:p,locale:'en-IN'}),e=>e.code==='42501');}));
test('voice turn reservations prevent duplicate work and conflicting retries',()=>asUser(1,async()=>{const p=await ownProfile();await grant(p,'care_relationship');await grant(p,'audio_capture');const session=await voice('start',{patient_id:p,locale:'en-IN'});const input={session_id:session.id,turn_id:uid(301),hash:'f'.repeat(64)};assert.equal((await voice('claim',input)).duplicate,false);assert.equal((await voice('claim',input)).duplicate,true);await voice('reserve_response',input);await assert.rejects(voice('reserve_response',input),/duplicate_turn/);}));
test('turn text is absent without retention consent',()=>asUser(1,async()=>{const p=await ownProfile();await grant(p,'care_relationship');await grant(p,'audio_capture');const session=await voice('start',{patient_id:p,locale:'en-IN'});const input={session_id:session.id,turn_id:uid(302),hash:'f'.repeat(64)};await voice('claim',input);await voice('reserve_response',input);await voice('finish',{...input,transcript:'Synthetic speech',result:{reply:'Hello'},metadata:{mode:'mock'}});const r=(await query('select transcript,result from voice_turns where id=$1',[uid(302)])).rows[0];assert.equal(r.transcript,null);assert.equal(r.result,null);}));
test('audio consent withdrawal stops an active session before another provider call',()=>asUser(1,async()=>{const p=await ownProfile();await grant(p,'care_relationship');await grant(p,'audio_capture');const s=await voice('start',{patient_id:p,locale:'en-IN'});await command('consent',{patient_id:p,purpose:'audio_capture',enabled:false});await assert.rejects(voice('check',{session_id:s.id}),e=>e.code==='42501');}));
test('retention withdrawal removes previously retained turn text',()=>asUser(1,async()=>{const p=await ownProfile();await grant(p,'care_relationship');await grant(p,'audio_capture');await grant(p,'transcript_retention');const s=await voice('start',{patient_id:p,locale:'en-IN'});const i={session_id:s.id,turn_id:uid(303),hash:'f'.repeat(64)};await voice('claim',i);await voice('reserve_response',i);await voice('finish',{...i,transcript:'Synthetic retained',result:{reply:'Hello'},metadata:{mode:'mock'}});await command('consent',{patient_id:p,purpose:'transcript_retention',enabled:false});assert.equal((await query('select transcript from voice_turns where id=$1',[uid(303)])).rows[0].transcript,null);}));
test('cross-patient voice operations return denial',()=>asUser(2,async()=>{await assert.rejects(voice('start',{patient_id:p2,locale:'en-IN'}),e=>e.code==='42501');}));
const setup=async(input)=> (await query('select public.smriti_setup($1) as result',[JSON.stringify(input)])).rows[0].result;
const details={patient_name:'Test Patient',date_of_birth:'1956-11-04',sex:'prefer_not_to_say',family_count:4,caregiver_name:'Test Relative',locale:'hi-IN',relationship:'Child',support_notes:'Needs help with daily tasks',authorized:true,audio_capture:true,transcript_retention:true,personalization:true};
test('caregiver setup saves fictional details, consent and a real voice session atomically',()=>asUser(1,async()=>{const {patient_id:p}=await setup(details);const row=(await query('select synthetic,care_details from patients where id=$1',[p])).rows[0];assert.equal(row.synthetic,true);assert.equal(row.care_details.caregiver_name,details.caregiver_name);assert.equal(row.care_details.family_count,4);assert.equal((await voice('context',{patient_id:p})).items.length,0);assert.ok((await voice('start',{patient_id:p,locale:'hi-IN'})).id);const again=await setup({...details,patient_name:'Updated'});assert.equal(again.patient_id,p);assert.equal((await query('select count(*)::int as n from patients where linked_user_id=$1',[uid(1)])).rows[0].n,1);}));
test('setup requires explicit authority and cannot promote clinician privileges',()=>asUser(1,async()=>{await assert.rejects(setup({...details,authorized:false}),/invalid_request/);}));
test('setup with microphone disabled cannot start a call',()=>asUser(1,async()=>{const {patient_id:p}=await setup({...details,audio_capture:false});await assert.rejects(voice('start',{patient_id:p,locale:'hi-IN'}),/consent_required/);}));
test('editing details preserves retained transcripts and active calls when consent is unchanged',()=>asUser(1,async()=>{const {patient_id:p}=await setup(details);const s=await voice('start',{patient_id:p,locale:'hi-IN'});const i={session_id:s.id,turn_id:uid(304),hash:'a'.repeat(64)};await voice('claim',i);await voice('reserve_response',i);await voice('finish',{...i,transcript:'Keep this conversation',result:{reply:'Hello'},metadata:{}});await setup({...details,patient_name:'Updated name'});assert.equal((await query('select transcript from voice_turns where id=$1',[uid(304)])).rows[0].transcript,'Keep this conversation');assert.equal((await voice('check',{session_id:s.id})).patient_id,p);}));


test('doctor QR is single-use and does not bypass caretaker consent',async()=>{
 await db.exec('begin');
 try{
  const doctor=uid(8),caretaker=uid(7);
  await db.query("insert into auth.users(id,email,email_confirmed_at,is_anonymous) values($1,$2,now(),false),($3,null,null,true)",
   [doctor,'doctor-qr@example.invalid',caretaker]);
  await db.query("update public.app_users set onboarding_role='doctor' where id=$1",[doctor]);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[doctor]);
  await db.exec('set local role authenticated');
  const hash='a'.repeat(64);
  const intake={
   token_hash:hash,patient_name:'Fictional Patient',caretaker_name:'Fictional Caretaker',
   relationship:'daughter',relationship_other:'',date_of_birth:'1950-01-01',sex:'prefer_not_to_say',
   family_count:3,locale:'hi-IN',support_notes:'',
   blood_group:'A+',diagnoses:['alzheimers'],diagnosis_status:'confirmed_by_clinician',
   dementia_stage:'mild',daily_support:'occasional',communication_support:['slower_pace'],other_condition:''
  };
  const created=await db.query('select public.smriti_issue_doctor_qr($1::jsonb) as result',[JSON.stringify(intake)]);
  const pid=created.rows[0].result.patient_id;
  assert.ok(pid);
  assert.equal((await db.query('select smriti_private.has_scope($1, $2) as allowed',[pid,'records:read'])).rows[0].allowed,false,
   'doctor should not read patient records before caretaker sharing consent');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[caretaker]);
  assert.equal((await db.query('select public.smriti_qr_session_ok() as allowed')).rows[0].allowed,false);
  const claimed=await db.query('select public.smriti_claim_caretaker_qr($1::jsonb) as result',[JSON.stringify({token_hash:hash,authorized:true})]);
  assert.equal(claimed.rows[0].result.patient_id,pid);
  assert.equal((await db.query('select public.smriti_qr_session_ok() as allowed')).rows[0].allowed,true);
  assert.equal((await db.query('select smriti_private.has_scope($1,$2) as allowed',[pid,'records:read'])).rows[0].allowed,true);
  await db.exec('savepoint attempted_reuse');
  await assert.rejects(db.query('select public.smriti_claim_caretaker_qr($1::jsonb)',[JSON.stringify({token_hash:hash,authorized:true})]),
   /qr_expired_or_used/);
  await db.exec('rollback to savepoint attempted_reuse');
  const beforeSupport=await db.query('select public.smriti_conversation_support($1) as support',[pid]);
  assert.deepEqual(beforeSupport.rows[0].support,{},'without personalization consent no clinical profile leaves Supabase');
  await db.query('select smriti_private.command($1,$2::jsonb)',[
   'consent',JSON.stringify({patient_id:pid,purpose:'personalization',enabled:true})
  ]);
  const withSupport=await db.query('select public.smriti_conversation_support($1) as support',[pid]);
  assert.equal(withSupport.rows[0].support.relationship,'daughter');
  assert.equal(withSupport.rows[0].support.dementia_stage,'mild');
  assert.ok(!Object.hasOwn(withSupport.rows[0].support,'blood_group'),'blood group must not be sent to AI');
  const changed={patient_id:pid,patient_name:'Fictional Patient',caretaker_name:'Fictional Caretaker',
   relationship:'son',relationship_other:'',date_of_birth:'1950-01-01',
   sex:'prefer_not_to_say',family_count:3,support_notes:'Prefers quiet mornings'};
  await db.query('select public.smriti_update_caretaker_profile($1::jsonb)',[JSON.stringify(changed)]);
  const saved=await db.query('select care_details from public.patients where id=$1',[pid]);
  assert.equal(saved.rows[0].care_details.clinical_intake.blood_group,'A+');
  assert.equal(saved.rows[0].care_details.clinical_intake.dementia_stage,'mild');
  assert.equal(saved.rows[0].care_details.relationship,'son');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[doctor]);
  const revised={
   patient_id:pid,clinical_intake:{
    blood_group:'B+',diagnoses:['mci'],diagnosis_status:'confirmed_by_clinician',
    dementia_stage:'not_assessed',daily_support:'daily',
    communication_support:['short_sentences'],other_condition:''
   }
  };
  await db.query('select public.smriti_update_doctor_intake($1::jsonb)',[JSON.stringify(revised)]);
  const afterDoctor=await db.query('select public.smriti_doctor_qr_roster() as items');
  const authorIntake=afterDoctor.rows[0].items.find(x=>x.patient_id===pid).clinical_intake;
  assert.equal(authorIntake.blood_group,'B+');
  assert.equal(authorIntake.diagnoses[0],'mci');
  // The doctor's scoped roster does not expose the caretaker's private notes.
  assert.ok(!Object.hasOwn(afterDoctor.rows[0].items[0],'care_details'));
  assert.equal((await db.query('select smriti_private.has_scope($1,$2) as allowed',[pid,'records:read'])).rows[0].allowed,false,
   'updating a doctor-authored intake must not bypass caretaker clinician-sharing consent');



 }finally{await db.exec('rollback');}
});
