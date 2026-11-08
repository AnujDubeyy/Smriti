# Smriti

Smriti is an intelligent cognitive healthcare and companion platform designed for seniors living with Mild Cognitive Impairment (MCI) and early-stage dementia. The platform unites patients, caregivers and healthcare providers through a structured care model organized around three core pillars: Assessment, Companionship and Monitoring.

Smriti prioritizes dignity, emotional connection and privacy over rigid testing routines. All interactions emphasize voice communication in native Indian languages, transparent consent boundaries and local control of patient recordings.

---

## Core Pillars

### 1. Cognitive Assessment
Smriti delivers hands-free verbal cognitive evaluations with millisecond-precision response latency tracking.
* Standardized Instruments: Protocol demonstrations for the Six-Item Cognitive Impairment Test (6CIT), Telephone Interview for Cognitive Status (TICS) and Montreal Cognitive Assessment Blind (MoCA Blind).
* Familiarization Trial Activities: Word list repetition, 60-second animal category fluency and temporal orientation tasks designed to help seniors practice speaking with Smriti without evaluation pressure.
* Acoustic and Latency Analytics: Measures question preparation time, speech onset latency, pauses and answer duration.
* Local Device Recordings: Audio capture and transcript timelines are stored in browser IndexedDB on the device. Recordings never upload to external storage without explicit user export.
* Clinical Report Synthesis: Clinicians review complete item latency timelines, scoring breakdowns, verbatim transcripts and audio playback directly in their dashboard.

### 2. Voice Companionship
Smriti provides gentle conversation and reminiscence without demanding factual recall of names or dates.
* Native Indian Language Speech: Integrates Gnani Timbre Text-to-Speech (TTS) with native voice models for Marathi (mr-IN), Hindi (hi-IN) and English (en-IN).
* Conversational AI Chain: Employs a resilient multi-model fallback chain across Groq (Llama / Mixtral) and Google Gemini models. Responses are strictly grounded in caregiver-approved memory notes.
* Dignity and Safety First: Disallows synthetic claims of family identity, prevents emotionally manipulative dialogue and respects immediate stop commands.

### 3. Monitoring and Caregiver Observations
* Daily Observation Check-Ins: Caregivers record physical, emotional and sleep notes using voice or text.
* Evidence Digest Generation: Produces structured observation summaries linked strictly to confirmed caregiver notes without diagnostic claims or web lookups.
* Longitudinal Trend Visualization: Enables clinical teams to review functional trajectory and behavioral patterns over time.

---

## User Roles and Workspaces

* Patient Workspace: Calmed, high-contrast interface with large touch targets, live speech-to-text captions and zero clinical jargon.
* Caregiver Workspace: Manage patient profiles, practice trial exercises, record observations and export encrypted assessment packages for medical appointments.
* Doctor Workspace: Configure and assign clinical assessments, review scoring analytics, inspect acoustic timelines and draft clinical recommendations.

---

## Technology Stack

* Frontend: Next.js 16 (App Router and Turbopack), React 19 and CSS Modules.
* Language: TypeScript with strict typing.
* Database and Authentication: Supabase PostgreSQL with comprehensive Row Level Security (RLS) policies.
* Voice and Speech Processing: Gnani Prisma v3.0 Speech-to-Text (STT) and Gnani Timbre v2.5 / v3.0 Text-to-Speech (TTS).
* Language Models: Groq API and Google Gemini API in a prioritized sequential fallback sequence.
* Client-Side Storage: IndexedDB via native browser storage for audio blobs and segment transcripts.
* Progressive Web App (PWA): Service worker asset caching for offline shell availability.

---

## Project Structure

```
Smriti/
├── apps/
│   └── web/                     # Next.js web application
│       ├── app/                 # App Router pages and API routes
│       │   ├── api/v1/          # REST endpoints for assessment, voice and care
│       │   ├── assessment/      # Patient assessment routes
│       │   ├── companionship/   # Conversational companion interface
│       │   ├── doctor/          # Clinician management workspace
│       │   └── monitoring/      # Caregiver monitoring and observation logs
│       ├── components/          # Reusable UI components and modals
│       ├── lib/                 # Business logic, scoring, timing and voice adapters
│       ├── public/              # Static assets, brand icons and offline shell
│       └── tests/               # Automated test suites
├── docs/                        # Architectural documentation, decisions and contracts
└── supabase/
    └── migrations/              # PostgreSQL schema definitions and RLS policies
```

---

## Prerequisites

* Node.js: Version 22.18.0 or higher.
* Package Manager: npm version 10 or higher.
* Supabase Account: A dedicated Supabase project with PostgreSQL.
* Voice and AI Credentials (Optional for live mode):
  * Gnani.ai API Key ID for Prisma STT and Timbre TTS.
  * Google Gemini API Key and Groq API Key for conversational AI.

---

## Environment Configuration

Navigate to the web application directory and configure environment variables:

```bash
cd apps/web
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `SMRITI_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `SMRITI_SUPABASE_PUBLISHABLE_KEY` | Supabase public API key | `your-publishable-key` |
| `SMRITI_SUPABASE_PROJECT_REF` | Supabase project reference identifier | `your-project-ref` |
| `SMRITI_APP_URL` | Canonical application base URL | `http://localhost:3000` |
| `GNANI_API_KEY_ID` | Gnani Vachana platform API Key ID | Server secret key |
| `GNANI_DEFAULT_VOICE_ID` | Default Gnani Timbre voice identifier | `Shivani` |
| `GNANI_MARATHI_VOICE_ID` | Native Marathi voice identifier | `Shivani` |
| `GNANI_HINDI_VOICE_ID` | Native Hindi voice identifier | `Shivani` |
| `GNANI_ENGLISH_VOICE_ID` | Native English voice identifier | `Shivani` |
| `GEMINI_API_KEY` | Google Gemini API key | Server secret key |
| `GEMINI_MODEL` | Google Gemini model identifier | `gemini-2.5-flash` |
| `GROQ_API_KEY` | Groq platform API key | Server secret key |
| `GROQ_MODEL` | Groq platform model identifier | `openai/gpt-oss-120b` |
| `VOICE_PROVIDER` | Speech provider selection mode | `auto` |
| `SMRITI_LOCAL_DOCTOR_PREVIEW` | Enable local preview mode without authentication | `1` (for local exploration) |

---

## Installation and Running Locally

### 1. Install Dependencies
```bash
cd apps/web
npm install
```

### 2. Run Database Migrations
Apply the PostgreSQL migration files located in `supabase/migrations/` using the Supabase CLI or SQL Editor in your Supabase dashboard.

### 3. Start the Development Server
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

### 4. Exploring in Local Preview Mode
To test all clinical features, assessment assignments and patient workflows locally without setting up Supabase authentication:
```bash
SMRITI_LOCAL_DOCTOR_PREVIEW=1 npm run dev
```
In this mode:
* The Doctor workspace is accessible at `http://localhost:3000/doctor/assessments`.
* You can configure and assign both clinical instruments and trial exercises.
* The Patient assessment page at `http://localhost:3000/assessment` displays all assignments ready for hands-free voice administration.
* Completed tests immediately populate the device recording library and clinical review modals.

### 5. Production Build
```bash
npm run build
npm start
```

---

## Automated Verification and Testing

Smriti includes an extensive automated test suite covering clinical scoring engines, timing latency calculators, Devanagari text normalization, multi-model AI fallback chains and authentication boundary security:

```bash
# Run unit and contract test suites
npx tsx --test tests/*.test.mjs

# Run TypeScript typecheck
npm run typecheck

# Run code linter
npm run lint

# Rebuild offline Service Worker asset cache manifest
npm run prebuild
```

---

## Security, Privacy and Consent Principles

1. Zero Cloud Audio Retention: Spoken audio streams are processed in transient memory for transcription and discarded immediately. No audio files are stored on central cloud servers.
2. Device-Only Audio Persistence: When an assessment recording is saved, it is written to the browser IndexedDB storage on the client device. The caregiver or clinician can listen locally or explicitly export a `.smriti` file.
3. Separation of Consents: Microphone audio processing consent and clinical care relationship consent are maintained as independent permissions that can be revoked at any time.
4. Defense in Depth: Sensitive endpoints enforce same-origin verification, maximum payload size boundaries and strict request rate limits.
