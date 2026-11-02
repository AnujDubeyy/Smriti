# Gemini context and evidence contract

The active system instruction is `apps/web/lib/voice/prompts.ts`, version `smriti-2026-11-02-v1`. The server adapter is `lib/voice/ai.ts`; the key is sent as `x-goog-api-key` directly to Google's fixed API host, never in a browser request or URL. Default model: `gemini-2.5-flash`, overridable with a validated `GEMINI_MODEL` identifier. No automatic paid fallback exists.

The system instruction defines a gentle AI companion, explicitly not a relative or clinician. It requires short locale-aware replies, autonomy, no forced recall/family impersonation, no diagnosis/decline inference/medication advice, and clearly fictional stories only when invited. Stop phrases are intercepted deterministically before an external AI call.

## Data supplied

Companion requests contain the reviewed utterance, up to eight recent in-memory turns (each <=1,200 characters), locale, and up to five approved context items. Approved context is selected through the authenticated database function and requires both active Life Book and personalization consent. Client-supplied history is untrusted and is never accepted as verified memory.

Log analysis retrieves up to 20 human-authored care observations through the current user's scoped database access. It supplies source UUIDs, text and recorded dates. It does not receive clinical notes, another patient's data, private credentials, raw audio, or an unrestricted database query. Automatically recorded voice-turn metadata is labelled unverified and is not used as clinical evidence. No external search or medical retrieval is connected.

All context is JSON data beneath a separate system instruction. There are no model tools. Prompt injection instructions in logs/transcripts must be ignored; this is defense in depth, not a proof that injection is impossible.

## Output validation

JSON schema bounds replies, findings, references and limitations. Unknown source IDs, quotes absent from their cited source, missing quote coverage, companion findings, malformed/incomplete/safety-blocked responses and selected unsafe/personal claims are rejected. Log-analysis headings are fixed by the application; findings are rendered beside exact quotes and source links. The UI always labels the summary as a draft requiring review.

Exact quotes establish provenance only. A model can still misinterpret a valid quote; human review is mandatory. Regex safety checks are incomplete, especially across languages. Do not use the output for diagnosis, severity, prognosis or treatment decisions.

## Processing and failure

Only synthetic profiles may call external speech/AI during this prototype. The free Gemini service may use submitted content for product improvement. No real patient records should be entered. Requests have a 25-second timeout, bounded response size, and no automatic retry. Provider quota/errors return a controlled failure; partial/invalid output is never spoken. Keep keys only in `.env.local` on the server. See Google's [API key guide](https://ai.google.dev/gemini-api/docs/api-key), [structured output guide](https://ai.google.dev/gemini-api/docs/structured-output) and [terms](https://ai.google.dev/gemini-api/terms).
