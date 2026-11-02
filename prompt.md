# SMRITI AI / स्मृति — MASTER IMPLEMENTATION PROMPT

**Document:** `prompt.md`  
**Status:** Agent-executable project specification, v1.0 — 2026-11-02  
**Project:** Smriti AI — multilingual, voice-first dementia support and care-monitoring PWA  
**Primary audience:** Coding agent(s) working in an existing or new repository  
**Source of visual truth:** Existing `DESIGN.md` and its supplied `assets/`  
**Visual reference:** Supplied mobile screenshot (`image(20261101-220704).png`) — preserve its **three-tab bottom navigation**, not its exact dimensions, copy, or small-text limitations.

---

## 0. EXECUTION DIRECTIVE — READ THIS FIRST

You are the principal engineer implementing **Smriti AI**, an installable Progressive Web App with **exactly three product pillars** (`Assessment`, `Companionship`, `Monitoring`) and **exactly three user-role classes** (`patient`, `caregiver`, `clinician`). This is an implementation contract, **not a concept pitch** and **not a second design system**.

**Before writing code:**

1. Inspect the whole repository, README, package manager, branch status, existing migrations, linked apps, assets and deployment setup. **Read `DESIGN.md` in full**; do not manufacture visual tokens or redraw brand art. Inspect `assets/` and verify file existence. If `DESIGN.md` or assets are missing, record the blocker and implement only neutral functional scaffolding without inventing branding.
2. Look for a prior Smriti implementation; **extend it** rather than replacing or duplicating components. This is a **new Smriti application**; do **not** copy the old NeuroCREW AD/PD prediction models into this system or call them dementia progression trackers. The earlier NeuroCREW repository is not the source of clinical validity for Smriti.
3. Read official documentation for installed framework and Gnani API versions **before using endpoint shapes**. Use documented requests and parse responses with schemas. Do not invent an endpoint, auth header, token format, language/voice ID or claim successful API access without calling it.
4. Build in the ordered phases below. Each phase must produce working, tested behavior and a short `docs/progress/PHASE-XX.md` containing changes, migrations, tests, screenshots or traces when appropriate, blockers, and next steps. **Do not silently mark a phase complete.**
5. Default every environment to **synthetic patient/demo data** until clinical governance, consent, licensing, privacy and appropriate human supervision are in place. Never treat this as a diagnosed/progression-certified medical device.
6. Honor privacy, patient autonomy, accessibility, and accurate measurement above polish or deadlines. The patient can stop talking, skip a topic, withdraw from optional activities and request human assistance.
7. Never commit real secrets, patient recordings, medical profiles, proprietary test questions, consent forms containing real identities, or private family photographs.
8. When essential credentials, source assets or licenses are unavailable, implement a faithful **mock adapter** and functional UI, declare the production integration **BLOCKED**, and continue unaffected phases. Do not replace Gnani with browser speech APIs while claiming Gnani integration.
9. Keep one main branch deployable. Use migrations, feature flags, isolated test fixtures, and incremental pull requests (or incremental documented commits if no PR workflow exists). Never deploy to production without permission and checks.

**Definition of success:** A caregiver can enroll a fictional patient, dictate and verify a personal life story, the patient can voluntarily engage in a respectful conversation in an enabled language, the caregiver can submit a structured daily observation, the clinician can review source-linked evidence, and all three tabs and role permissions work. Assessment instruments are implemented only when lawful and clinically appropriate; otherwise a **clearly labelled original demonstration activity** shows the engine without impersonating a validated test.

---

## 1. PRODUCT INTENT, SCOPE AND SAFETY CLAIMS

### 1.1 What this is

Smriti supports **people already diagnosed with dementia**, plus their caregivers and clinicians, through:

- **Assessment:** Clinician-selected, stage-appropriate clinical measures or explicitly marked research/demo activities; deterministic, reviewable scores.
- **Companionship:** Compassionate, mother-tongue conversation grounded in **caregiver-confirmed, patient-approved** life stories, photographs, familiar interests and emotional associations; **connection over correction**.
- **Monitoring:** Longitudinal, source-attributed home observations, assessment records and support-session preferences to support clinician review and practical care-plan changes.

**Core insight:** Even when a person cannot recall exact biographical facts, a conversation may still feel meaningful. Optimize for **comfort, consent, dignity, engagement and connection**, not a count of family names correctly recalled. Do not claim that repetition preserves specific memories, halts neurodegeneration, treats disease or restores a previous personality.

### 1.2 Explicit exclusions

- No automated diagnosis of Alzheimer's, Parkinson's or any dementia type.
- No independently calculated “dementia severity %”, deterioration score, prognosis, progression classifier or treatment recommendations.
- No import of historical NeuroCREW Cox/risk models as a monitor for already-diagnosed patients.
- No face recognition, hidden ambient listening, passive background microphone use, deception about family-member identity, family-voice cloning or behavioural manipulation.
- No unlicensed reproduction of full MoCA, MMSE, CDR, FAST, NPI-Q, QoL-AD, DSRS, ADCS-ADL, SIB or translations. A publicly visible PDF or free-to-use statement **does not equal redistribution rights**.
- No automatic conclusion that a conflict between caregiver and patient recollections is a memory deficit.
- No continuous emergency monitoring or promise of immediate clinician response.

### 1.3 User vocabulary and labeling

Use **patient**, **caregiver**, **clinician** in code and role authorization. The UI may use respectful localized labels. Use “observation,” “possible change requiring review,” “care need,” and “reported experience” rather than invented diagnostic conclusions. An AI-generated overview must be labeled `AI-generated — requires review`; separate observations from speculative interpretation.

---

## 2. LOCKED PRODUCT NAVIGATION & REFERENCE IMAGE

### 2.1 Non-negotiable mobile bottom navigation

The reference image depicts an effective persistent navigation architecture. Implement a **fixed/sticky mobile bottom navigation with exactly three visible primary tabs, in exactly this order**:

1. **Assessment** — red pillar.
2. **Companionship** — yellow pillar.
3. **Monitoring** — blue pillar.

**Always maintain these three tab identities across all roles**, though content and permissions depend on the role and the active patient. Do not add a fourth/fifth bottom tab, change the order, or use misleading links. Use real links/router destinations, visible labels, suitable icons, large touch areas, selected state and `aria-current="page"`; respect `env(safe-area-inset-bottom)` and account for nav height in scroll padding. Underlying nested pages preserve the active parent tab and a usable back path. On desktop, map the same three destinations into a persistent sidebar or top navigation while preserving semantics.

**Exception:** During high-focus, time-sensitive voice capture or clinician-approved assessments, an expanded immersive subview may replace/temporarily collapse the tab bar **only with a prominent Exit/Back action, saved session state, and a clear route back to its parent pillar**. Default tab persistence should remain; no silent loss of responses on switching tabs. The three tabs reappear in regular views.

**Role-aware tab meaning**:

| Tab | Patient | Caregiver | Clinician |
|---|---|---|---|
| Assessment | Assigned permitted activities; completion status, no clinician-only scores | Respondent assessments assigned to caregiver; status and explanations | Instrument registry, assignment, administration, scoring, review |
| Companionship | Talk, listen, family photos/stories, stop/skip, preferences | Life Book authoring, story approvals, patient preferences and support history | Review support suitability, flagged topics and engagement evidence |
| Monitoring | Minimal optional view: sessions/preferences and accessible personal summaries; no alarming graphs | Daily voice check-in, timeline, care tasks, shared observations | Patient list, longitudinal dashboards, assessment trends, flags, notes, care plans |

For a patient who cannot interpret monitoring data, show a simple reassuring sessions page or an appropriate restricted explanation—not a fake analytics dashboard. No role gains permission just by opening a tab.

### 2.2 Monitoring visual reference — retain semantics, not dummy copy

The supplied small phone screenshot shows a top Smriti brand header, blue **Monitoring** summary area, **Logs / Insights** segmented control, dated conversation rows, an AI overview card and the three tabs. Implement these as functional concepts:

- `Monitoring > Logs`: searchable/filterable real sessions with event type, date, duration and recording status. Rows open an authorized detail page, not play silently.
- `Monitoring > Insights`: factual trends, completeness and review flags. Do not show clinician-grade conclusions to the patient.
- `Session detail`: **cautious AI overview first**, then, if consented and retained, secure audio player and time-aligned transcript, then notes/feedback.
- “Memory Quiz Discussion” in the reference is **not** a standardized score; label such content as a conversation unless it came from an actual authorized assessment attempt.
- “Good recall of past events / slight difficulty with recent dates” cannot be generated without documented evidence and scope. Replace with source-linked observed text and uncertainty. If no sessions exist, show a real empty state.

### 2.3 Visual source precedence and fonts

`DESIGN.md` is the **only design-language authority**. Implement its assets, red/yellow/blue semantics, round typography, spacing, accessibility, animation, reference motifs and microinteractions. Product safety and this prompt's explicit **three-tab** navigation requirement take precedence where they conflict with generic optional navigation examples in `DESIGN.md`.

**Typography contract (do not invent a universal “ROUNDY font”):**

- **Latin/English UI:** **Nunito** (rounded Latin), weights in `DESIGN.md`.
- **Hindi/Marathi short headings:** **Baloo 2**; use **Noto Sans Devanagari** for dense text, incomplete glyphs or body copy.
- **Bengali:** Baloo Da 2 (display) + Noto Sans Bengali (body).
- **Gujarati:** Baloo Bhai 2 + Noto Sans Gujarati.
- **Punjabi (Gurmukhi):** Baloo Paaji 2 + Noto Sans Gurmukhi.
- **Tamil:** Baloo Thambi 2 + Noto Sans Tamil.
- **Telugu:** Baloo Tammudu 2 + Noto Sans Telugu.
- **Kannada:** Baloo Tamma 2 + Noto Sans Kannada.
- **Malayalam:** Baloo Chettan 2 + Noto Sans Malayalam.
- **Brand wordmark:** use original `assets/svg/9.svg`, **not** newly typeset text or automatically selected `Tiro Devanagari Hindi`. If Tiro files are present in earlier uploads, they are **not the canonical UI font** unless `DESIGN.md` is explicitly revised.
- Fall back to script-appropriate Noto Sans where Baloo coverage or readability is insufficient. Verify actual font licenses, glyph shaping and character coverage; self-host approved subsets, do not redistribute arbitrary ZIP fonts.

See `DESIGN.md` for precise visual tokens, brand image filenames and acceptance breakpoints. Do **not** copy entire design specifications into UI code or create a competing design system.

---

## 3. LANGUAGES, I18N AND VOICE-CAPABILITY MATRIX

### 3.1 Gnani-supported candidate languages

Based on Gnani **Prisma v3.0's** documented STT coverage and **Timbre v3.0's** advertised 10-language TTS coverage, target these **10 language choices**, gated **per feature** by a tested capability matrix:

| Locale | Language | Script | UI font stack | Target tier |
|---|---|---|---|---|
| `hi-IN` | Hindi | Devanagari | Baloo 2 / Noto Sans Devanagari | Initial |
| `mr-IN` | Marathi | Devanagari | Baloo 2 / Noto Sans Devanagari | Initial |
| `en-IN` | English (India) | Latin | Nunito / system-ui | Initial |
| `bn-IN` | Bengali | Bengali | Baloo Da 2 / Noto Sans Bengali | After QA |
| `gu-IN` | Gujarati | Gujarati | Baloo Bhai 2 / Noto Sans Gujarati | After QA |
| `pa-IN` | Punjabi | Gurmukhi | Baloo Paaji 2 / Noto Sans Gurmukhi | After QA |
| `kn-IN` | Kannada | Kannada | Baloo Tamma 2 / Noto Sans Kannada | After QA |
| `te-IN` | Telugu | Telugu | Baloo Tammudu 2 / Noto Sans Telugu | After QA |
| `ta-IN` | Tamil | Tamil | Baloo Thambi 2 / Noto Sans Tamil | After QA |
| `ml-IN` | Malayalam | Malayalam | Baloo Chettan 2 / Noto Sans Malayalam | After QA |

**Hinglish** is a `hi-IN` conversation mode/code-mixed speech preference, **not** an eleventh independent language. Prisma v3 supports `codemix`; Timbre v3 labels mid-sentence mixed-language synthesis as **beta**. Do not advertise perfectly natural Hinglish voice output without provider/device testing.

A language may be enabled for UI but disabled for TTS, or enabled for conversation but **not** for a clinical instrument whose validated translation is unavailable. Never translate a standardized test live with an LLM and label it validated.

### 3.2 Capability object

```ts
type Capability = {
  locale: string;                 // BCP-47
  ui: 'verified' | 'beta' | 'off';
  stt: 'verified' | 'beta' | 'off';
  tts: 'verified' | 'beta' | 'off';
  conversationLLM: 'verified' | 'beta' | 'off';
  voiceId?: string;
  codeMix?: boolean;
  assessments: Record<string, 'licensed-validated' | 'research-only' | 'off'>;
  lastVerifiedAt?: string;
};
```

Store capabilities in versioned configuration. A fully voice-enabled session requires suitable STT, TTS, conversational LLM **and** appropriate consent/reliability. Confirm each language **with native speakers**; test low-volume speech, names, code-switching, silence, matras/conjuncts, numeric/date reading and audio playback.

**Locale engineering:** `next-intl` or equivalent; translation keys for all UI text, validation messages, microphone status, accessible labels and emergency copy. Use Unicode-normalized storage but preserve a faithful original transcript. Set `lang` on content, use Intl for dates/times, do not clip names, test 200% scaling and 320px widths. Clinical instruments only load an exact approved language version.

---

## 4. STACK, REPOSITORY AND ENVIRONMENT

### 4.1 Preferred stack

- **Next.js App Router + React + TypeScript** (strict), Tailwind CSS + reusable accessible components. Preserve installed project choices when sound.
- Installable **PWA**: web manifest, icons from approved art, service worker and offline app shell; no sensitive patient data automatically cached.
- **Supabase PostgreSQL** for structured data and row-level access, Supabase Auth for authentication, private Storage buckets for permitted media.
- **Server-side Gnani adapter** for Prisma STT and Timbre TTS; a separate WebSocket/voice gateway **only if streaming is needed**.
- **LLM provider adapter** for conversation and text extraction; prefer Gnani Evon **only if the account exposes suitable access/API**, otherwise a permitted provider or deterministic mock. Do not assume Evon endpoints or access keys exist.
- `zod` or comparable runtime validation; shared schema/types. Background worker/queue for long tasks once needed. Recharts for factual trends. Vitest, Playwright, Testing Library, axe/accessibility checks and database policy tests.
- Vercel for the web app and a suitable backend runtime for long-lived connections if necessary. Supabase project environment separated across local/staging/prod.

### 4.2 Monorepo layout (create gradually)

```text
smriti-ai/
  prompt.md                           # this file
  DESIGN.md                           # existing, authoritative
  assets/                              # existing, approved brand art
  apps/
    web/
      app/(auth)/
      app/(patient)/
      app/(caregiver)/
      app/(clinician)/
      app/api/v1/
      app/manifest.ts
      public/sw.js
      components/{shell,assessment,companion,monitoring,shared}/
      lib/{auth,locale,api}/
    worker/                            # add when justified
    voice-gateway/                     # phase-2 streaming enhancement
  packages/
    domain/                            # type models, zod schemas, enums
    authz/                             # roles, ACL and consent checks
    gnani/                             # STT/TTS adapters and mocks
    memories/                          # life book and provenance
    conversation/                      # state machine and safeguards
    assessments/                       # licensing registry, deterministic scoring
    monitoring/                        # observations/trends/flags
    clinical/                          # review and care plans
  supabase/{migrations,seed,tests}/
  tests/{e2e,integration,security,accessibility,voice}/
  docs/{architecture,api,clinical,privacy,progress,decisions}/
  .env.example                         # variable names ONLY
  README.md
```

### 4.3 Secret and configuration contract

Use placeholders in `.env.example`. **Never ask the agent to write any real secret into a document.** Required names are conventions to map to the actual provider account; validate official API headers and request shapes before implementing:

```dotenv
# Public, safe configuration only
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_DEMO_MODE=true

# Server only — do not prefix with NEXT_PUBLIC_
SUPABASE_SECRET_KEY=...
GNANI_API_KEY=...
GNANI_API_KEY_ID=...             # only if required by the documented endpoint
GNANI_STT_MODEL=prisma-v3.0
GNANI_TTS_MODEL=...              # verify current API value; do not guess
GNANI_STT_URL=...                # documented REST endpoint URL
GNANI_TTS_URL=...                # documented REST/stream endpoint URL
GNANI_DEFAULT_VOICE_ID=...      # verify voice + locale availability
LLM_PROVIDER=mock
LLM_API_KEY=...                 # only if selected LLM requires it
LLM_MODEL=...

# Optional infrastructure
JOB_QUEUE_URL=...
ERROR_MONITORING_DSN=...
```

**Do not treat `GNANI_API_KEY_ID` and `GNANI_API_KEY` as interchangeable.** Gnani's public STT/TTS materials display differing interface examples. Obtain the exact requirements from the latest **authenticated documentation / dashboard** and implement them in the adapter; no production endpoint should be hardcoded based only on marketing snippets. Keep all server-only variables secret in Vercel or equivalent. Publishable Supabase keys are **not** authorization; enforce session and RLS.

For local without keys use `VOICE_PROVIDER=mock` in test/dev (no real calls) and show a conspicuous demo indicator. **No API key is supplied by this prompt**.

---

## 5. ROLES, ACCESS, CONSENT & AUDIT

### 5.1 Role model

One person can occupy multiple roles across different patient relationships. Do not put a single insecure mutable `role` claim on the user and call that authorization. Use:

- `auth.users` — identity.
- `app_users` — user preferences and verified professional status fields (verification cannot be self-asserted).
- `patients` — patient record independent of login account; some patients cannot self-sign-in.
- `patient_memberships` — `(patient_id, user_id, membership_role, status, scopes, granted_by, valid_until)`.
- `consent_grants` — `(patient_id, purpose, subject_or_representative, recipient, scope, granted_at, expires_at, revoked_at, basis, evidence_ref)`.
- `audit_events` — `(actor_id, patient_id, action, object_type, object_id, timestamp, result, metadata)` without unnecessary PHI in log text.

**Scope examples:** `life_book:write`, `story:approve`, `assessment:assign`, `assessment:respond`, `assessment:finalize`, `observations:write`, `records:read`, `recordings:read`, `clinical_notes:read`, `care_plan:write`.

**Patient:** may use approved support session and assigned activities; no permission to see other patients, issue prescriptions, or alter finalized clinical scores.  
**Caregiver:** writes patient-linked stories and observations, participates in assigned proxy instruments, sees authorized shared records. Not automatically a clinician.  
**Clinician:** sees only patients with verified, active care access; can select authorized assessments, annotate/interpret, write care plans, administer clinical scoring and review concern flags. No blanket global access.

### 5.2 Consent and privacy by purpose

Separate choices for: account care relationship, Life Book usage, conversational personalization, audio capture, **audio retention**, transcript retention, clinician sharing, optional notifications, and research/export consent. A patient may choose to talk without storing the full recording if the selected workflow permits ephemeral processing.

Handle lack of capacity through an appropriate lawful representative mechanism, documented by the care team; **caregiver account ownership by itself is not proof of consent authority**. Track withdrawal and its effect on future sessions. Use data minimization and configurable retention, not infinite storage defaults.

### 5.3 Clinical constraints and safety

- Not emergency-response software. Prominently present real human contact routes and urgent-care guidance; do not promise a monitored alert channel.
- Sudden confusion/major deterioration or urgent safety concerns should prompt the caregiver to seek timely clinical help; cannot wait for weekly trend batch.
- Avoid deliberate deception, real-relative voice imitation, invented patient facts, forced reminiscence or personality-restoration goals.
- Distress triggers immediate topic stop/pause, optional safe diversion and caregiver review as appropriate. A patient saying “stop” must be deterministic, not dependent on the LLM feeling cooperative.
- Clinician records carry professional provenance; AI cannot modify diagnosis, medicines or care decisions.
- Data is potentially extremely sensitive, including identities of relatives and family media: require an explicit privacy and Indian DPDP applicability review before real-person rollout.

---

## 6. CORE DATA MODEL — DATABASE MIGRATIONS

Implement migrations, indexes, foreign keys, enums/check constraints, `created_at`, `updated_at` where relevant, and table-specific RLS. UUIDs for primary keys; UTC timestamps with timezone; human timezone in preferences. Add immutable finalized event tables, deletion/retention policy, and source attribution.

### 6.1 Identity, links and governance

- `app_users(id auth_id, display_name, preferred_locale, clinician_verification_status, created_at)`
- `patients(id, linked_user_id NULL, preferred_name, locale, timezone, diagnosed_condition_label [clinician-provided optional], care_preferences, stage_note [clinician provided], created_at)`
- `patient_memberships(id, patient_id, user_id, role, scopes JSONB, status, invited_by, accepted_at, revoked_at)`
- `consent_grants(id, patient_id, purpose, scope, actor_id, authorization_basis, granted_at, expires_at, revoked_at, evidence_ref)`
- `audit_events(id, actor_id, patient_id, entity, entity_id, event, timestamp, outcome, request_id)`
- `record_retention_policies`, `data_subject_requests`, `account_invitations`

### 6.2 Life Book

- `life_people(id, patient_id, preferred_name, nicknames, relationship_label, photo_asset_id NULL, active, source_id)`
- `life_events(id, patient_id, title, event_type, period_text, description, sensitivity, permitted_for_conversation, patient_preference, moderation_state, last_confirmed_at)`
- `life_facts(id, event_id, claim_text, source_kind, source_id, confidence_label, status, proposed_by, verified_by, verified_at)`
- `life_emotion_associations(id, event_id, emotion_label, attribution [patient|caregiver|other], quote_or_note, observed_at, confidence_label)`
- `life_assets(id, patient_id, object_key, media_type, size_bytes, uploader_id, usage_permissions, deleted_at)`
- `life_event_people(event_id, life_person_id)`, `life_topic_restrictions`, `life_story_revisions`, `story_approvals`

**State:** draft → awaiting_confirmation → approved_for_use / restricted / rejected. Only approved, consent-permitted, sensitivity-compliant items may be retrieved for conversation. New claims heard from the patient go to `life_fact_candidates`—not directly into approved facts.

### 6.3 Voice and support

- `voice_sessions(id, patient_id, kind [support|assessment|caregiver_note], locale, consent_snapshot_id, initiated_by, started_at, ended_at, status, provider_metadata, recording_retained, retention_until)`
- `voice_turns(id, session_id, turn_index, speaker, transcript_raw, transcript_normalized, detected_locale, transcript_confidence_if_available, timing JSONB, stt_model_version, error_code, audio_asset_id NULL)`
- `support_interactions(id, session_id, life_event_id NULL, approach, invitation_accepted, explicitly_reported_feeling NULL, requested_continue, requested_stop, possible_distress_review, evidence_turn_ids, summary_status)`
- `support_feedback(id, session_id, reporter_id, role, reaction_category, narrative, created_at)`
- `support_preferences(id, patient_id, pace, voice_id, max_session_seconds, allowed_topics, avoid_topics, updated_by)`
- `support_review_flags` and `support_topic_usage` (usage counts **not** memory health scores)

### 6.4 Assessments and clinical instruments

- `instrument_registry(id, name, version, publisher, license_status, approval_evidence_uri, source_locale, permitted_modes, permitted_locales, respondent_role, scoring_module_version, clinician_only, enabled)`
- `instrument_forms(id, instrument_id, locale, version, protected_content_pointer, approved_translation_reference)` — stored only if authorized.
- `assessment_assignments(id, patient_id, instrument_id, assigned_by, respondent_membership_id, due_at, status, guidance)`
- `assessment_attempts(id, assignment_id, patient_id, started_at, completed_at, instrument_version, locale, administration_mode, operator_id, status, protocol_deviations JSONB)`
- `assessment_responses(id, attempt_id, question_key, response_value JSONB, source_turn_id NULL, verified_by, captured_at, amendment_status)`
- `assessment_scores(id, attempt_id, scoring_version, score JSONB, score_status, computed_at, clinician_reviewer_id, reviewed_at)`
- `clinician_custom_questions`, `custom_question_responses` — **never included in licensed normative totals**.

No original proprietary test items in public source code, fixture snapshots or client bundles unless explicitly permitted; render only to authorized subjects as allowed by license. Never treat unpublished original demo prompts as validated scales.

### 6.5 Monitoring, clinic and review

- `caregiver_checkins(id, patient_id, author_id, observed_date, transcript_id NULL, verification_state, completeness, created_at)`
- `observation_events(id, patient_id, checkin_id NULL, category, metric_key, value JSONB, observed_at, report_source, reporter_id, confirmation_status, quality_flags JSONB)`
- `monitoring_baselines(id, patient_id, category, metric_key, baseline_period, baseline_value JSONB, determined_by, last_reviewed_at)`
- `monitoring_rule_versions(id, code, version, rule JSONB, clinician_approved_by, enabled)`
- `review_flags(id, patient_id, flag_type, urgency_label, explanation, evidence_refs JSONB, raised_at, status, assigned_clinician_id, resolved_at)`
- `clinician_reviews(id, patient_id, reviewed_by, date, summary, evidence_refs, interpretation, recommendations, status)`
- `care_plans(id, patient_id, version, author_id, goals, instructions, followup_date, status)`, `care_plan_tasks`, `notifications`, `exports`

### 6.6 Key database rules

- Index `(patient_id, observed_at DESC)` on observations/sessions; indexes on memberships and review queues.
- Use server-issued identities for actor fields; never trust a client-supplied role or author ID.
- Enforce membership on every table and media object, plus **per-scope** permissions; clinician-only notes cannot be read by ordinary caregiver role.
- RLS plus least-privilege SQL grants; protect views (e.g., `security_invoker`); no Supabase secret/service key in browser; private storage access via signed, short-lived authorized URLs only.
- Test `SELECT`, `INSERT`, `UPDATE`, `DELETE` including cross-patient and revoked-access attempts; prevent duplicate attempts via idempotency constraints.
- Preserve immutable raw provenance for finalized assessment records; corrections are append-only audited amendments; all generated summaries cite evidence IDs.
- No secrets, PHI or raw audio in analytics, shared error monitoring, console output or client persistence.

---

## 7. GNANI VOICE INTEGRATION: REAL ADAPTERS, MOCKS AND SAFETY

### 7.1 STT adapter

Create `GnaniSpeechToText` behind `SpeechToTextProvider`:

```ts
type TranscriptResult = {
  textRaw: string;
  textNormalized?: string;
  detectedLocale?: string;
  segments?: { startMs: number; endMs: number; text: string }[];
  confidence?: number;       // only when provider actually returns this
  provider: 'gnani' | 'mock';
  model: string;
  requestId?: string;
};
interface SpeechToTextProvider {
  transcribe(input: { audio: Uint8Array; contentType: string; locale?: string; mode: 'verbatim'|'transcribe'|'codemix'|'transliterate'; keyTerms?: string[] }): Promise<TranscriptResult>;
}
```

Use Gnani **Prisma v3.0**. For MVP use documented **REST for short clips**; later implement documented PCM/WebSocket streaming if interactive tests justify it. Understand exact accepted audio format, sample rate, maximum size and auth headers from current docs. Validate MIME and enforce size/duration before proxying. Handle no-speech, code-mix, low confidence, connection loss, timeouts, retries and provider 429/5xx.

**Key terms:** Family names and nicknames may be supplied for companion usability **only when consented and appropriate**. In formal recall assessments, do not use name hinting or silent replacement that might artificially improve a score; keep raw transcript, alternate output or a human-verified interpretation as protocol allows. Never use LLM rewriting as an invisible scoring input.

### 7.2 TTS adapter

Create `GnaniTextToSpeech` behind `TextToSpeechProvider`:

```ts
interface TextToSpeechProvider {
  synthesize(input: { text: string; locale: string; voiceId: string; pace?: 'slow'|'normal' }): Promise<{ audio: Uint8Array; contentType: string; durationMs?: number; provider: 'gnani'|'mock' }>;
}
```

Use **Gnani Timbre v3** (verify exact provider model ID and endpoint at integration time). Keep a per-locale verified voice mapping. Favor gentle consistent delivery; no emotionally manipulative tags, shouting, fake family voices or excessive expressive effects. Validate text length and sanitize unsupported tags. Provide repeat, pause and transcript/caption controls.

### 7.3 Mock mode vs real mode

- **Mock:** deterministic text/audio fixture; clearly visible `DEMO / MOCK VOICE` state; does **not** claim actual Gnani integration success.
- **Real:** enabled only after a smoke test of the actual Gnani credentials, STT input, output parsing, TTS playback and billing/error behaviour. Log model/version, response status and latency, **not** secret values or raw PHI.
- Automated provider-contract tests must use recorded synthetic fixtures and mock responses; live provider smoke checks are opt-in, limited and documented to prevent accidental cost.

### 7.4 LLM and memory retrieval

`ConversationLLM` / `ExtractorLLM` provider interfaces; route through server-side schema validation. For story extraction: candidate claims → caregiver confirmation → approved life event. For dialogue: retrieve only a **minimal list** of approved, consented, relevant story snippets with source IDs and emotion attribution. Provider output should carry `referenced_memory_ids` and `safety_flags`; reject unsupported personal claims or omit them on fallback. **A second LLM check is not sufficient assurance**: deterministic topic denylist, consent and grounding constraints must run independently.

### 7.5 Voice capture and lifecycle

- Browser `getUserMedia` on explicit tap only; always show microphone state and stop control. No passive wake word or hidden background recording.
- Audio capture starts only after active session consent. Stop audio tracks on session end, tab departure, lock/suspend or revoked permission; validate actual browser behavior.
- Turn-based session flow: `record -> send -> transcribe -> propose response -> safety-check -> synthesize -> play -> observe`; support cancellation/idempotency per turn and abort on stop.
- Do not automatically persist raw voice audio. Save only permitted transcript portions and metadata; if audio retention consent granted, private storage with expiration and access log.
- Transcribed utterances from patient in this mode are **not** formal scored assessments.

---

## 8. COMPANIONSHIP: THE EMOTIONAL CONNECTION ENGINE

### 8.1 Philosophy

This module tries to create **meaningful present experiences**, not enforce exact biographical recognition. A patient may enjoy warmth associated with a memory even without correctly identifying a person. It is **not proven** that an AI can prevent forgetting relatives or preserve the memory trace.

Never repeatedly quiz family names, insist the patient previously believed something, or attempt to reinstate a former personality. The person's **current** opinions, boundaries and autonomy matter. Use third-person stories when appropriate, but avoid covertly misleading the patient about what is fictional versus family-reported.

### 8.2 Session controller

States:

```text
IDLE -> PERMISSION -> OPENING -> TOPIC_SELECT -> LISTENING
                                                  |
                            SPEAKING <- COMPOSE_REPLY
                               |                  ^
                               +------ LISTENING -+
                                    |
                         PAUSED / RECONNECTING
                                    |
                         STOPPED / FINISHED
```

**Priority interrupts** from **every** state: `STOP`, `NO_CONSENT`, `TOPIC_RESTRICTED`, `DISTRESS`, `HUMAN_HELP`, `MIC_PERMISSION_LOST`, `NETWORK_FAILURE`. Stop and help intents should have deterministic recognition paths and an obvious UI control in addition to STT interpretation.

### 8.3 Conversation approach strategy

Modes: `everyday_chat`, `direct_reminiscence`, `third_person_story`, `sensory_or_photo`, `listening_only`, `comfort_mode`. Choose using:

1. Explicit patient preference and current willingness.
2. Consent and topic restriction.
3. Story factual verification and emotional attribution.
4. Prior **observed** positive/negative reaction, with room for changing preferences.
5. Energy/time and current conversation context.

A default session: ask permission → brief check-in → optionally suggest 1 approved story → patient-led dialogue → gentle close. Suggested **5–10 minutes** and a few optional weekly invitations are **configurable product trial defaults, not a clinically proven dose**. The person can end earlier or continue if they wish.

### 8.4 Example (fictional only)

Caregiver approved: “Meera's first teaching job was in 1982. The daughter reports Meera felt proud and bought a saree for her mother.”

- **Do not:** “What year was your first job? Don't you remember? Your daughter's name is...”.
- **Do:** “Would you like a story about a teacher who used her first salary to buy her mother a gift?” Follow their response. If the person opts out, change topic without pressure.
- If patient gives a different version, label `patient_reported`; do not auto-flag “forgot important fact.”
- If caregiver calls the story happy but the patient appears upset or asks to stop, **stop and suppress automatic reintroduction** pending review.

### 8.5 Support feedback data

Record only meaningful **observable** data: patient explicitly said pleasant/unpleasant; wanted to continue/end; voluntarily shared story; caregiver observed relaxation/distress with reporter attribution. An AI may detect possible concern language for **review**, but cannot assign an authoritative mood label or depression score. Avoid simplistic engagement ratings based on word count or silence.

### 8.6 Patient safety and human handoff

- `stop` immediately cancels pending TTS and releases microphone.
- `need_help` shows preconfigured caregiver/help contact options without pretending the AI called someone unless an integration actually completed.
- Avoid prohibited topics and avoid inventing family facts.
- If the patient is confused, validate feelings and redirect safely; do not continuously correct harmless mistakes. Don't dismiss immediate risks such as an unsafe situation or sudden confusion.
- Output messages should be brief, adult-respectful, simple, localized and unhurried; confirm comfort without interrogating.

### 8.7 Audio cost controls

Per-session audio duration caps, turn count guardrails, TTS character limits, server-side rate limits and per-account budget. Show a friendly retry/fallback state rather than charging repeatedly for duplicated sends. Track approximate usage and real provider invoices, not fabricated savings.

---

## 9. ASSESSMENTS: WHAT WE WILL IMPLEMENT AND WHAT WE MAY ONLY SIMULATE

### 9.1 Governing distinction: domain-matched ≠ validated

**The project is not an independent dementia detection app**. Assessment is **post-diagnosis follow-up**. The clinician determines which domains and instruments are appropriate at the patient's current dementia stage. Not every patient should receive a memory quiz; avoid distress and floor effects.

There are **three implementation lanes**:

- **Lane A — Original unvalidated demonstration tasks:** Build new, short **domain-matched** activities for *engineering demonstration only*. Label `Smriti demonstration activity — not MoCA/MMSE/CDR/NPI-Q, not validated, no clinical interpretation`. Do **not** duplicate proprietary question text, scoring algorithms, published norms, certification badges or instrument names in user-facing scores.
- **Lane B — Legally authorized electronic instrument:** When licensing terms explicitly permit software reproduction, translations, remote/voice administration and scoring, integrate the **official version verbatim**, keeping version, scoring, restrictions and translated form. Any voice conversion may still need separate scientific validation.
- **Lane C — Clinician-entered external result:** For licensed forms not authorized for Smriti digital administration, permit an authorized clinician to enter **a score obtained externally** using the official instrument (instrument label, version, locale, date, assessor, mode, possible caveats), **without displaying protected full forms in the app**. This is the safest early path to show real-world assessment history.

**Never represent Lane A as Lane B**. Never create unlicensed replicas by changing 1–2 words while copying scoring. Never display protected test content publicly or bundle it in a demo seed.

### 9.2 Priority register

| Instrument | Role / purpose | Initial status | Implementation strategy | Rights gate |
|---|---|---|---|---|
| FAST | Clinician-staged function with caregiver interview; especially Alzheimer's | P1 candidate | Guided *original* functional-observation entries; licensed digital form only after permission | Original authors / use-specific permissions; Australian noncommercial terms not universal |
| NPI-Q | Caregiver report of behavioural symptoms and distress | P1 candidate | Original symptom log for demo; official electronic NPI-Q only with authorization | Copyright/licensing check |
| QoL-AD | Patient and caregiver quality-of-life perspective | P1 candidate | Original satisfaction/well-being prompts for demo; officially scored form only after permission | MAPI e-PROVIDE / copyright holder |
| DSRS | Caregiver-reported severity/follow-up | P1 candidate | Original functional-history questions for demo; official DSRS once licensed | Original authors; region/use restrictions |
| CDR / CDR-SB | Trained clinician dementia severity | P2 | Clinician-entered externally obtained scores first | Explicit WUSTL license incl. translations |
| ADCS-ADL | Caregiver-reported everyday independence | P2 | Clinician-entered score / licensed digital form | ADCS permissions |
| SIB | Advanced cognitive impairment | P3 | Clinician-led specialist workflow, not voice-only default | Instrument owner + validation |
| MoCA / MMSE | Clinician-selected cognition when useful; not default repeat quiz | Optional P3 | Externally administered score entry only, unless explicit digital permissions + proper validation | Proprietary and administration-sensitive |

**Important:** There is **no blanket permission** to reproduce the complete forms of FAST, DSRS, NPI-Q or QoL-AD simply because a repository says noncommercial clinical use is free. Prioritize direct licensing verification for a PWA. Legal/professional review is a milestone blocker for the protected actual tests.

### 9.3 Domain-matched original demo activity examples (no clinical interpretation)

**Caregiver Functional Observation (original):** caregiver reports levels of help for dressing, bathing, meals, orientation around home, safety concerns; do not map these answers to official FAST or ADCS-ADL points. Record dates and context, not pseudo-severity.

**Caregiver Behaviour Log (original):** has new sleep disruption, fear, agitation, withdrawal, changes in appetite or caregiver distress been *observed*? Ask whether it happened and how confident they are; do not present NPI-Q sum or formal syndromic classification.

**Patient Comfort Check (original):** voluntary, simple: “Would you like to talk more, take a break, or do something else?” This is a support preference, not QoL-AD. Optional patient well-being prompt saved as patient-reported only.

**Optional memory-task sandbox:** if a trained clinician explicitly requests a separate novel research activity, implement a simple original word repeat/recall with unvalidated demo label, fixed administration metadata, no family-story content, no key-term boosting, no diagnosis, no comparisons to MoCA/MMSE. Keep this feature **OFF by default** for diagnosed patients and clearly separate from companionship. Do not use its repeated scores to assert disease progression.

### 9.4 Assessment engine technical design

- Instrument registry controls `license_status`, exact allowed locale, respondent role, administration method, scoring implementation and eligibility.
- A clinician assigns an instrument; patient/caregiver sees it only if appropriate, approved and permissioned.
- Deterministic state machine `not_started → in_progress → submitted → pending_review → finalized / amended`, with autosave and no duplicate submissions.
- Supported question types generically: single-select, Likert, numeric, short text, clinician observation. Add audio response only when the instrument permits.
- Score calculators are **pure tested functions** and must be versioned. No LLM scoring, no invented normative cutoffs. Only official license-authorized score definitions get an instrument label.
- Save raw answer vs STT interpretation vs confirmed answer distinctly. Support human correction with audit trail. No silent retroactive score overwrite.
- `clinician_custom_questions` appended **outside** any standardized score and marked `custom, not part of instrument`.
- Completion feedback is configurable by official protocol; do not reveal correctness on tests that forbid it. Do not move automatically to next item before data persistence. Pause/repeat/skip behavior follows instrument-specific rules.
- If clinician-entered external score, capture `source=external_clinician_administration` and prohibit falsely indicating app administration.

### 9.5 Licensing gate checklist for EACH actual instrument

`publisher/owner → terms for this organization → digital reproduction → translation (exact locale) → autonomous vs supervised administration → use of voice → storage/redistribution of items → scoring rights → training/certification → approval evidence → legal reviewer → toggle enabled`.

Until ALL relevant items are confirmed, keep protected test form in `disabled` or external-score-entry mode. Never “solve” the licensing issue by lifting downloadable forms into local JSON.

---

## 10. MONITORING: CAREGIVER + CLINICIAN

### 10.1 Inputs

1. **Formal assessment history** (licensed administered attempts or clearly labeled clinician-entered external scores).
2. **Caregiver check-ins** (daily/when needed; sleep, mobility, appetite, care activities, mood, safety, caregiver needs).
3. **Companion observations** (consent, accepted/declined topic, patient explicit feedback, attributed caregiver reaction; weak clinical evidence).
4. **Clinician assessments and care-plan notes** (professional conclusions, not LLM-generated facts).

### 10.2 Caregiver check-in flow

Caregiver taps `Monitoring → Daily check-in` → speaks an optional 1–2-minute note in preferred language → Gnani STT → LLM extracts proposed structured items → caregiver confirms or corrects each item → original note and verified structured values saved with timestamps, source and missing-data markers.

Example:

```json
{
  "patient_id": "demo-meera",
  "date": "2026-11-02",
  "observations": [
    {"key":"appetite","value":"usual","source":"caregiver"},
    {"key":"sleep","value":"less_than_usual","source":"caregiver"},
    {"key":"dressing_help","value":"needed","source":"caregiver"}
  ],
  "missing": ["mobility"],
  "confirmation":"caregiver_confirmed"
}
```

**Missing != normal.** If nothing was logged, show `not observed / not reported`, not zero difficulty. Allow edits with explicit audit history and record a reason if data is medically relevant.

### 10.3 Baselines, trend calculations and review rules

- Establish personal baseline over appropriately documented periods, ideally clinician-reviewed; baselines can change as care plans evolve.
- Compute simple, transparent facts: number of days help was needed **out of days reported**, time windows, missingness, comparable standardized scores with versions.
- Do not compare unlike instrument versions, unvalidated language adaptations, or incomplete data as equivalent.
- Show `reported on 5/7 logged days this week vs 2/7 last week` rather than `dementia has worsened 150%`.
- Rules for `routine`, `review_needed`, `urgent_safety_concern` must be documented, versioned, reviewed by clinicians and separately tested. Do not implement arbitrary medical numerical triggers as production defaults.
- Sudden severe confusion, new collapse, severe symptoms or other immediate danger trigger plain urgent human-help guidance; don't rely on background emails or AI notifications to provide care.
- Support-session engagement and feelings are **separate** from formal cognitive and functional severity.

### 10.4 Clinician review experience

`Patient roster → Monitoring overview → Review flags → Timeline → Source evidence → Assessment history → Care plan → Mark reviewed / follow-up`.

For each item show observed date, source person, raw/normalized text if consented, uncertainty, relevant assessment versions, caregiver comments, review state and actions. AI summaries are **drafts**, editable by clinician, with evidence IDs and explicit “AI-generated” label. Clinician may disagree and annotate rather than silently overwrite historical evidence.

### 10.5 Heatmap + session logs

Follow `DESIGN.md`: GitHub-like heatmap indicates **activity occurrence only**, never cognitive improvement. Day cells convey count, skipped days distinct from missing data, accessible list alternative; compact mobile 12–16 weeks and desktop year. Recorded sessions show date, duration, type, authorized player and transcript. Time-synced transcript only with provider-generated or verified timing; if none, show untimed transcript.

### 10.6 Notifications

Optional configurable reminders: caregiver check-in, authorized assessment due, clinician review flags. Push/email/SMS is opt-in and must never include sensitive clinical details in a lock-screen preview or subject line. Provide in-app inbox; no claim of 24/7 professional monitoring. Clinician must acknowledge and close review flags with audit trail. Use reliable queue for nonurgent delivery and verify notification status rather than assuming success.

---

## 11. APPLICATION ROUTES AND SCREEN-BY-SCREEN REQUIREMENTS

### Shared

- `/` — role-aware landing, 3-tab shell where logged in, language selection.
- `/login`, `/signup`, `/accept-invite` — minimal login/onboarding; accessible errors.
- `/settings` — languages, volume/speech pace, data/consent controls, accessible preferences, sign out.
- `/patients/select` — for caregivers/clinicians with multiple authorized patient memberships; selects current patient context.
- `/permissions` — grant/revoke legitimate access, consent history, recording retention preferences.

### Assessment tab (`/assessment`)

- **Patient:** assigned activity list, permission/eligibility, start/resume, large one-question screen, completion confirmation, no alarming result language.
- **Caregiver:** caregiver-report tasks, history of submitted reports, response correction before finalization.
- **Clinician:** instrument catalog with licensing mode, patient assignments, externally obtained score entry, response review, clinician custom items (separate), real score trends when legally implemented.

### Companionship tab (`/companionship`)

- **Patient:** dominant `Talk to Smriti` CTA, listening/speaking/paused/reconnecting states, approved photo/story options, clear stop/skip, captions, current language.
- **Caregiver:** Life Book list, create via voice/text, structured review of extracted details, relationships, media upload, permissions/restrictions, session reactions, pending fact confirmations.
- **Clinician:** preferences, restricted topic reviews, source-linked support sessions and notes; not a private unrestricted browsing feed.

### Monitoring tab (`/monitoring`)

- **Patient:** simplified safe session list and preferences if appropriate.
- **Caregiver:** `Logs` and `Insights`; daily check-in, observations, patient timeline, shared care tasks, support preferences.
- **Clinician:** active patients overview, detailed `Logs` and `Insights`, activity heatmap, trend panels, review flags, signed notes, care plans, exports.
- `/monitoring/sessions/:sessionId` — summary first → private player if permitted → caption/transcript → review/annotations.
- `/monitoring/patients/:patientId` — clinicians' authorized detailed timeline and comparisons.
- `/monitoring/flags/:flagId` — review audit trail / evidence.

### Route security

Every route loads current `patient_id` context from an authorized membership. Unauthorized actions fail safely with `403`, no data in HTML prefetch, loader payload, Next.js cached response, signed URL or logs. Avoid careless cross-user caching in server components. Tests must exercise direct URL navigation, not just hidden navigation links.

---

## 12. API CONTRACT (INITIAL)

Use `/api/v1` versioning, Zod validation, secure sessions, audit data mutations, rate limits, and idempotency keys for retries. Route names can be adjusted to existing code, but contracts must be documented.

```text
POST   /api/v1/invitations                       invite member with allowed role/scope
GET    /api/v1/patients                          list authorized patients
GET    /api/v1/patients/:id                      role-scoped profile
POST   /api/v1/patients/:id/consents             grant/revoke allowed consent
GET    /api/v1/patients/:id/memories             approved/draft memory listings by role
POST   /api/v1/patients/:id/memories             create draft memory
PATCH  /api/v1/memories/:id                     edit allowed draft
POST   /api/v1/memories/:id/confirm             approve/restrict with evidence
POST   /api/v1/media/upload-intent              private media permission + upload
POST   /api/v1/voice/transcribe                 consented STT turn
POST   /api/v1/voice/synthesize                 server-authorized TTS
POST   /api/v1/companion/sessions               begin session + consent snapshot
POST   /api/v1/companion/sessions/:id/turns      next utterance with idempotency
POST   /api/v1/companion/sessions/:id/stop       immediate stop/cancel
POST   /api/v1/companion/sessions/:id/feedback   attributed user/caregiver feedback
GET    /api/v1/assessments/catalog              licensed/authorized catalog
POST   /api/v1/assessments/assignments          clinician assigns
POST   /api/v1/assessments/attempts             begin authorized attempt
PATCH  /api/v1/assessments/attempts/:id         save answer draft safely
POST   /api/v1/assessments/attempts/:id/finish   finalize idempotently
POST   /api/v1/assessments/external-results      clinician-entered external score
POST   /api/v1/patients/:id/checkins            caregiver confirmed check-in
GET    /api/v1/patients/:id/timeline            time-windowed authorized evidence
GET    /api/v1/patients/:id/trends              factual aggregates + completeness
GET    /api/v1/patients/:id/review-flags         authorized concern queue
POST   /api/v1/flags/:id/review                 clinician disposition
POST   /api/v1/patients/:id/care-plans          clinician-authored plan
GET    /api/v1/sessions/:id/audio-access        expiring URL only if consented
GET    /api/v1/sessions/:id/transcript          consented, authorized transcript
```

Error response includes stable `code`, short localized `messageKey`, request ID, retryability; never leak PHI or provider stack traces. For vendor 429/5xx offer safe retry, backoff and cancellation. On session abort, release microphone and TTS playback; surface unsaved state honestly.

---

## 13. PRIVACY, DATA PROTECTION AND REGULATORY CHECKPOINTS

Before real patient use, an accountable human team must complete:

1. Privacy/legal review for India **DPDP Act/Rules** (phased effective dates, consent, withdrawal, notices, processor contracts, storage/transfers); do not claim compliance from code alone.
2. An ethics/clinical protocol for any testing involving actual people with dementia, including supported decision making and representative authority where applicable.
3. Gnani/LLM provider data-processing review: residency, logging, retention, model-training policy, sensitive-data restrictions, subcontractors and deletion guarantees. No sensitive voice data sent without authorization.
4. Instrument-by-instrument licensing and adaptation approval (digital, voice, translation, scoring).
5. Threat model covering account takeover, caregiver abuse, relationship impersonation, cross-patient reads, insecure file URLs, prompt injection via life stories, malicious file upload, data export and audio leaks.
6. Record deletion, revocation and retention policy test; role changes take effect immediately enough to prevent a revoked caregiver reopening media.
7. Named clinician escalation protocol and disclaimers. No promises of medical supervision without actual staffing.

**Must-pass:** service keys server-only; RLS and grants hardened, storage RLS independently tested, security headers and CSRF protections where relevant, no cached PHI in service worker, signed URLs, media scanning/validation, rate limits, non-sensitive audit logs, 2FA for clinicians where possible.

---

## 14. QUALITY, TEST STRATEGY AND ACCEPTANCE CRITERIA

### 14.1 Testing layers

- **Unit:** data validation, memory status gates, age/date parsing with uncertainty, story source tracking, scoring pure functions, monitoring aggregation, confidence/missingness, stop-state transitions, locale capability gating.
- **Contract:** mock Gnani REST success/failure, authorization headers never exposed, STT script/codemix, TTS playback MIME, timeout/429/5xx, LLM JSON schemas and invalid outputs.
- **Database:** migrations apply/rollback where supported, unique constraints, RLS SELECT/INSERT/UPDATE/DELETE for all roles, cross-patient denial, revoked access, short-lived media, views/invoker risks, duplicate submission conflicts.
- **Integration:** caregiver→STT→draft→verify→approved retriever; patient→voice turn→safe story; caregiver check-in→confirm→timeline; clinician→review→care plan; external assessment result with provenance.
- **E2E:** Playwright at desktop/mobile; login, role switching only when authorized, three tabs, nested navigation state, no data leaks or blank error pages; offline/poor network and microphone denial.
- **Accessibility:** WCAG 2.2 AA target, screen reader/keyboard, contrast, focus, 48px touch, reduced motion, captions, native script shaping, 200% zoom; all `DESIGN.md` breakpoints.
- **Clinical workflow:** clinician reviews content for plausibility; no diagnostic conclusion; distress escalation, no silent correcting, no source-free medical insights.
- **Security:** static scan for keys, dependency audit, CSP/security config, PHI logging scan, upload validation, signed URL expiration, denial tests. Record actual commands and outcomes.

### 14.2 Golden end-to-end story (must pass before demo release)

With **fictional** patient Meera, caregiver Asha and clinician Dr Rao:

1. Caregiver Asha accepts authorized invitation to Meera.
2. She speaks in Hindi: fictional first-teaching-job story, family relation, reported pride, buys saree for mother.
3. Gnani/mock transcribes. App presents structured **draft**, including “daughter-reported emotion.” Caregiver corrects one wrong fact and approves.
4. Patient Meera opens yellow Companionship, gives consent, selects Hindi, asks for a gentle story; bot uses only the approved facts without falsely claiming verified personal emotions.
5. Patient says “bas, band karo”; TTS/audio/mic end immediately, session marked `stopped_by_patient`. Repeat prompts do not occur.
6. Caregiver submits voice check-in: sleep reduced, needed help dressing; confirms extracted events and leaves mobility unreported.
7. Clinician opens blue Monitoring, sees log, source-linked support overview and caregiver observation; sees missing mobility explicitly, no hallucinated “dementia worsened”.
8. Clinician enters an external CDR score with instrument/version/assessor metadata **without reproducing CDR questions**, or a demo-domain activity is labelled unvalidated.
9. Clinician adds a care-plan note and flags the first-job story as `review_required` if patient reported distress; app blocks automatic reuse.
10. All three roles see their **Assessment / Companionship / Monitoring** tabs in correct order, with different authorized content; unrelated user cannot access anything by guessing URLs.

A second golden path tests `no Gnani API key` using mock voice with clear labels. A third path tests `no recording retention consent`, confirming that no audio file is stored.

### 14.3 Release gates

- Unit, integration, RLS, E2E, accessibility and security checks green or clearly documented pending blockers.
- Live Gnani calls verified in each **enabled** language with test audio and no PHI; if not, feature labelled beta/off.
- `DESIGN.md` QA performed with actual screenshots; assets verified; no unsanctioned font or visual drift.
- Instrument license and translation ledger up-to-date. No protected full tests available without documented permission.
- No unsupported medical claim or fabricated statistics in patient/caregiver/clinician UI.
- Human consent and privacy process complete before real-patient roll-out.

### 14.4 Concrete commands and evidence requirements

After discovering the actual package manager and scripts, make scripts exist for these operations and run them instead of merely saying they succeeded:

```bash
# Illustrative npm commands: adapt to the actual repository and lockfile.
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm audit --audit-level=high

# Local Supabase once configured; run on disposable/test database.
supabase start
supabase db reset
supabase test db
```

**Evidence requirements:** document exit code, test count, failing cases, runtime/OS, browser viewport screenshots for role tabs, denial request IDs, and STT/TTS sample IDs (synthetic only). If a command is missing, **add an explicit script or note that it cannot run**; do not pass it by omission. Never run destructive reset on a shared or production database. Record the model, locale and any translation/instrument license used in integration tests. Include browser-level tests of navigation, completed assessment persistence and the hard-stop microphone/audio cleanup.

### 14.5 Reliability and fallback matrix

| Failure | Expected safe behavior | Validation |
|---|---|---|
| Gnani STT unavailable | Stop listening gracefully, offer typed input or retry; no invented transcript | 503, timeout, 429 fixtures |
| Gnani TTS unavailable | Show exact safe text response and optional retry; avoid autoplay loops | provider error fixture |
| LLM unavailable | Do not hallucinate a story; offer approved fixed greetings and human assistance | failure injection |
| Network drops mid-session | Clearly show reconnect, stop mic as appropriate, preserve only permitted saved turns; never claim saved until acknowledged | network throttling E2E |
| Consent revoked | Terminate current processing and future retrieval within enforceable bounds; queue retention/deletion action | live revocation test |
| Story later restricted | Exclude on the *next* retrieval and invalidate relevant caches; previously created reports retain audit provenance subject to retention policy | retrieval RLS/unit test |
| Assessment incomplete | Resume if instrument rules permit; show status, preserve answer provenance and prohibit invalid final score | idempotent retry |
| Provider omits timestamps | Use untimed transcript; never fake synchronization | fixture without segments |
| Caregiver did not observe domain | Store as unreported, not normal/zero | missingness unit test |
| Wrong patient selected | No cross-patient record mutation or stale cached transcript | auth/context switch E2E |
| Urgent safety language | Immediate appropriate human-help guidance; no assumed clinician notification | safety scenario test |

### 14.6 Stage-sensitive interaction constraints

Stage, dementia subtype, sensory ability, preferred language and clinician notes may inform **which activities are offered**, but are **not automatically inferred from voice recordings**. For more advanced impairment: permit listening-only sessions, simpler responses and shorter, patient-led conversations; avoid compulsory quizzes or orientation challenges. For caregiver-report measures, do not let unsupported patient speech replace the designated informant. Track clinically meaningful barriers (hearing, vision, speech, fatigue, acute illness) as *session conditions* and review confounders before drawing longitudinal comparisons.

---

## 15. IMPLEMENTATION PHASES — FOLLOW IN ORDER

**A phase is complete only after its deliverables, tests, screenshots/traces and changelog are committed.** Parallelize tasks only if upstream contracts are stable. Do **not** push to production by default. Suggested priority: establish secure base, make caregiver→patient→clinician narrative work, then extend assessments and monitoring.

### PHASE 0 — Discovery, audit and design contract

**Objective:** Know what actually exists. Do not rebuild blindly.

**Tasks:** Inspect repo, state, assets, `DESIGN.md`, package lock, partial code, deployment, current Gnani account/documentation access, Supabase project. Identify missing fonts/icons and any existing roles, pages, data tables. Confirm source screenshot is purely a structural navigation reference. Audit dependency/license/security risks. Write decision records, feature flags and technical dependencies. Identify whether implementation begins from scratch or extends existing app.

**Deliverables:** `docs/architecture/REPO_AUDIT.md`, `docs/decisions/0001-stack.md`, `docs/decisions/0002-navigation.md`, baseline README, a phase checklist and a risk register; no secret values.  
**Exit tests:** Build/lint commands known and runnable; scope and blockers documented; no false claims about connected services.

### PHASE 1 — App foundation, design integration and 3-tab shell

**Objective:** Installable responsive skeleton with authentic Smriti brand.

**Tasks:** Next.js TypeScript app, Tailwind setup, approved fonts, canonical SVG/icon assets, `DESIGN.md` tokens, i18n mechanism, PWA manifest, service worker app shell, `Assessment / Companionship / Monitoring` bottom navigation in exact order, desktop equivalent, role-aware route layouts, loading/error/offline states, accessibility primitives.

**Deliverables:** Running PWA, `AppShell`, `PillarNav`, `LocalePicker`, `BrandLogo`, placeholder functional role pages (clearly `not configured`), offline notice.  
**Exit tests:** Installability, navigation across all 3, 320px→desktop and 200% zoom, responsive safe area, correct mascots, keyboard nav, no cached PHI.

### PHASE 2 — Auth, patient relationships, permissions and consent

**Objective:** Secure multi-tenant care relationships before adding clinical data.

**Tasks:** Supabase Auth, users/patients/memberships/consents, invitations, clinician verification state, RLS grants/policies, per-scope guards, private buckets, authorization middleware, audit events, synthetic seed accounts, withdrawal/revocation flows. No self-assigned clinician role.

**Deliverables:** Role-specific sign in/onboarding, patient selector for multiple members, permission pages, migrations, RLS tests.  
**Exit tests:** Cross-patient denial, fake clinician self-registration denied, revoked member loses access, clinician notes private, no exposed storage, direct-URL 403.

### PHASE 3 — Gnani speech infrastructure + deterministic mocks

**Objective:** Correct voice plumbing without entangling clinical rules.

**Tasks:** server-only Prisma REST adapter, Timbre REST adapter, LLM adapter/mocks; verified endpoint/header models, audio upload size limits, model config, locale matrix, STT transcript review UI, TTS playback, media retention consent, voice lifecycle states, log redaction and usage counters. Make mock integration deterministic.

**Deliverables:** Demo microphone → transcript → spoken response in enabled locales, documented real/live smoke results, fixtures for no-key paths.  
**Exit tests:** STT, TTS, denial, interruption, no mic, timeout, duplicate retry, no audio persisted absent consent, keys absent from browser bundle.

### PHASE 4 — Caregiver Life Book and story verification

**Objective:** Capture verified, emotionally meaningful personal stories.

**Tasks:** structured caregiver intake, person/relationship editor, guided voice story entry, extract candidate life events+reported emotions+people, fact-by-fact confirmation, media upload and private display, story versions/sources, approval/restriction state, patient preferences, optional clinician review flag. Start with 2–3 stories; don't force full autobiography.

**Deliverables:** Real CRUD, transcript-based entry, confirmation, approval workflow, safe source-aware retrieval.  
**Exit tests:** Unverified/restricted stories excluded; patient vs caregiver accounts distinct; user can correct people and feelings; external image not public; partial voice entry survives allowed navigation.

### PHASE 5 — Patient emotional Companionship end-to-end

**Objective:** Patient feels listened to, not tested.

**Tasks:** session consent, large voice controls, modes, approved-memory retrieval, grounded prompts, dialogue state machine, interruption handling, output validation, patient stop/skip/human-help, no forced recognition, caregiver/patient feedback separation, clear audio retention state, multilingual fallback. Start turn-based, not always-on streaming.

**Deliverables:** Working patient chat with Hindi/Hinglish, Marathi and English only when individually tested; consented session events and authorized reviews.  
**Exit tests:** Stop immediate, topic restriction works, no hallucinated relative names, third-person framing not misleading, source IDs included in generated summaries, audio failure recoverable.

### PHASE 6 — Caregiver monitoring and timeline

**Objective:** Make home reports usable without daily paperwork.

**Tasks:** 1–2-minute optional voice check-ins, structured extraction with caregiver approval, observation table, baseline profiles, missingness, event revisions, chronological logs, session access permissions and simple trend aggregates. Heatmap measures **activity only**.

**Deliverables:** Daily check-in, source-linked timeline, logs, basic factual charts, honest empty states.  
**Exit tests:** Missing != normal, incomplete weeks not compared as complete, timezones correct, duplicate submissions prevented, caregiver cannot access confidential clinician notes.

### PHASE 7 — Clinician monitoring, review and care plans

**Objective:** Evidence-first professional workflow.

**Tasks:** clinician patient roster, evidence-linked logs and AI overview review, review flags and status, authorized audio/timed transcript, assessment history slots, clinical notes, care plans/tasks, periodic comparisons, clinician-approved alert rule registry, printable/exported source-aware reports. Do not ship unreviewed automatic emergency alerts.

**Deliverables:** Functional clinician dashboard plus review queue, care-plan editing, evidence navigation.  
**Exit tests:** Summary cites source and is clearly AI-drafted, no fabricated progression measure, flag acknowledgement audited, restricted media not accessible to revoked members.

### PHASE 8 — Assessment engine and legal licensing gates

**Objective:** Integrate assessment workflows while preserving clinical validity boundaries.

**Tasks:** instrument registry and rights ledger, clinician assignments, question renderer, autosave, pure scoring module, protocol-deviation logs, custom clinician questions, external-score entry, patient/caregiver respondent flows. Implement original `not clinically validated` demo-domain activity, **not** counterfeit CDR/FAST/NPI-Q/QoL-AD. For an actual instrument, require license evidence and approved locale/mode before embedding test content.

**Deliverables:** Assessment engine with one clearly labeled original demo flow + external clinician score entry + disabled licensed-form slots pending approval. Authorized complete forms added only if rights and validation confirmed.  
**Exit tests:** Deterministic saving, no lost answers, proper roles, no protected prompts in public bundle, official score never produced by unvalidated imitation, custom questions excluded from normative totals.

### PHASE 9 — Multilingual coverage, usability and accessibility

**Objective:** Move from working languages to robust supported languages.

**Tasks:** test Hindi/Hinglish, Marathi, English thoroughly; expand Bengali, Gujarati, Punjabi, Kannada, Telugu, Tamil, Malayalam **only where STT+TTS+LLM+UI pass tests**; language-specific fonts and name pronunciation; test captions, older voices, native speakers, contrast, 200% text, offline and mobile PWA behavior, clinician terminology.

**Deliverables:** Verified locale matrix, i18n QA, voice samples from **consented synthetic/volunteer** test utterances without PHI, language fallback.  
**Exit tests:** Disabled locales honestly labeled; no broken glyphs; no claims of fully validated language-specific clinical instruments from translation alone.

### PHASE 10 — Performance, security, reliability and release audit

**Objective:** Make an auditable demo, not a fragile slideshow.

**Tasks:** production-like staging deploy with synthetic data, run all tests, RLS penetration/membership checks, dependency/license scans, review logging and model retention, background job idempotency, TTS/STT cost safeguards, network and mobile device tests, performance, rate limiting, PHI redaction, privacy/clinical risk review, documentation, backup/restore drills where applicable.

**Deliverables:** `docs/audits/FINAL_AUDIT.md` with exact tests and outcomes, synthetic demo dataset, release notes, user manual, demo walkthrough video/script, clear `research prototype` labeling.  
**Exit tests:** Golden paths pass and are demonstrated; remaining real clinical-use blockers named; production rollout remains blocked until appropriate approvals.

### PHASE 11 — Optional enhancements ONLY after gate approval

- Streaming real-time conversation with barge-in, robust latency and VAD.
- Secure clinician notifications and care-team integrations.
- Authorized licensed digital assessment instruments and validated translations.
- Carefully evaluated quality-of-life improvement study and clinician assessment study.
- Advanced privacy-reviewed insight modeling **only after prospective evidence**.
- Offline encrypted draft mode only after explicit threat model.

**Do not treat Phase 11 as required for the MVP.**

---

## 16. PHASE WORK RULES FOR THE CODING AGENT

For each phase:

1. `DISCOVER`: list existing relevant files, dependencies and docs; reconcile any conflict with `DESIGN.md` and this contract.
2. `PLAN`: break into tangible tasks, migrations, contracts, API validations, tests and security gates.
3. `IMPLEMENT`: write code with typed interfaces, explicit loading/error states and no invented vendor behavior.
4. `VERIFY`: run real commands (`install`, `lint`, `typecheck`, `test`, `build`, `RLS`, `Playwright`) as applicable. State actual results, commands and environment.
5. `REVIEW`: critique code for security, patient autonomy, clinical misrepresentation, role leakage, UX at 320px and 200% zoom, mixed-language fonts and asynchronous persistence; **fix any valid issue before declaring completion**.
6. `REPORT`: produce `docs/progress/PHASE-XX.md` with checklist, changed files, test outputs, screenshots, license decisions and blockers.
7. `STOP CONDITIONS`: if legal rights to an instrument missing, keep actual instrument disabled and implement Lane A/C instead. If secrets missing, mock provider and mark blocked. If RLS broken, no production deploy. If `DESIGN.md` is missing, do not invent official brand illustrations or fonts.

**Quality of reporting:** Never say “tested”, “deployed”, “production-ready”, “clinically validated” or “Gnani connected” without evidence. Never show fake clinical data without explicit demo labeling. Do not ask for confirmation on every small code decision; only ask the user for true blockers such as a vendor key, instrument license, or a destructive/prod operation.

---

## 17. DOCUMENTATION TO GENERATE DURING IMPLEMENTATION

- `README.md`: purpose, install/setup, feature status, privacy statement, demo mode, run commands, known limitations.
- `docs/architecture/OVERVIEW.md`: module boundaries and data flows.
- `docs/architecture/ERD.md`: database relations, RLS strategy and data lifecycle.
- `docs/api/OPENAPI.yaml`: authenticated API and errors.
- `docs/clinical/ASSESSMENT_RIGHTS.md`: instrument/version, owner, permitted digital mode, locale, scoring, approvals and blocked features.
- `docs/clinical/SAFETY_PROTOCOL.md`: stop, distress, acute change, human-help routing, clinician oversight.
- `docs/privacy/DATA_MAP.md`: PHI categories, processors, consent, retention, storage, export/deletion.
- `docs/voice/GNANI_ADAPTER.md`: tested endpoint names, headers (without values), exact models, requests, audio formats, locale list, cost and failure handling.
- `docs/qa/LOCALE_MATRIX.md`: per-locale UI/STT/TTS/LLM/assessment and native QA results.
- `docs/progress/PHASE-XX.md`: status and actual tests after every phase.
- `docs/audits/FINAL_AUDIT.md`: security/clinical/voice/build evidence and unresolved blockers.

---

## 18. OFFICIAL REFERENCES AND VERIFICATION SOURCES

**This prompt was researched November 2026.** Source pages are evidence for **high-level capability/rights**, not substitutes for the live authenticated provider specifications. Recheck terms before integration, and keep the relevant legal/source date in the rights ledger.

**Gnani:**
- Prisma v3.0 language list, code-mix, REST/streaming and key-term prompting: https://www.gnani.ai/resources/prisma-v3
- Timbre v3 voice, language, code-switch beta and expression controls: https://www.gnani.ai/resources/timbre-v3
- Gnani developer documentation: https://docs.gnani.ai
- Gnani console and API keys: https://app.gnani.ai
- TTS API examples (validate against the account's current endpoint): https://www.gnani.ai/text-to-speech-api

**Framework/security:**
- Next.js PWA implementation: https://nextjs.org/docs/app/guides/progressive-web-apps
- Supabase RLS, SQL grants and pgTAP tests: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Noto script typography: https://notofonts.github.io/noto-docs/website/use/

**Clinical instrument rights:**
- CDR official copyright, license and translation policy: https://knightadrc.wustl.edu/professionals-clinicians/cdr-dementia-staging-instrument/copyright-licensing/
- FAST and DSRS use/permission notes (Australian Dementia Outcomes Measurement Suite): https://www.dementiaresearch.org.au/doms/staging/
- QoL-AD use/permission notes (Dementia Outcomes Measurement Suite): https://www.dementiaresearch.org.au/doms/quality/
- ADCS instrument licensing/requests: https://www.adcs.org/instruments/
- NPI copyright and terms: https://www.npitest.net/terms-of-service.html

**Indian privacy:**
- Government of India DPDP Rules press release, 14 Nov 2025: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014

---

## 19. FINAL AGENT HANDOFF — WHAT TO DO ON FIRST RUN

> **Build Smriti AI according to this `prompt.md` and the existing authoritative `DESIGN.md`. Begin by auditing the repository and available assets, then implement Phase 0, followed by the phases in order with actual tests and progress logs. Preserve the bottom mobile navigation `Assessment → Companionship → Monitoring` across all three role-aware experiences. Use Gnani Prisma/Timbre behind secret-bearing server adapters; use faithful mocks with obvious labels when keys are missing. Support only languages whose complete path has been tested; use canonical rounded script-specific fonts from `DESIGN.md`. The patient experience must prioritize dignity and emotional connection rather than forcing recall of factual family details. Caregivers author and verify stories and daily observations; clinicians review evidence and create care plans. Keep protected assessment instruments licensing-gated and use clearly marked original demo activities or clinician-entered external scores until permissions and voice-administration validity are established. Enforce patient-specific RLS, privacy, consent and audit logging. After each phase, run tests, critique the implementation and fix genuine issues before marking it complete. Never present synthetic clinical data, unsupported claims, or mocked Gnani as a production medical system.**

