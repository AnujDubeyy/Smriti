# Gnani speech contract

Adapters: `apps/web/lib/voice/gnani.ts`. Keys remain server-side as `GNANI_API_KEY_ID`; both requests use `X-API-Key-ID`. No second invented key is required.

| Stage | Contract |
| --- | --- |
| STT | POST `https://api.vachana.ai/stt/v3`; multipart `audio_file` WAV, `language_code`, `model=prisma-v3.0`, `format=verbatim` |
| TTS | POST `https://api.vachana.ai/api/v1/tts/inference`; JSON text, `model=timbre-v3.0`, voice, language, speed, 16 kHz mono linear PCM WAV |

The checked-in adapter is the precise request contract. Default voice is `Shivani`; override only with an ID available to your account using `GNANI_DEFAULT_VOICE_ID`. Language/voice availability, credits and responses must be verified using your own credentials. Official API documentation: https://docs.gnani.ai/ . Account access is not proof that every model/voice/locale works.

Capture is downsampled to mono PCM16 16 kHz WAV. The server parses RIFF/chunks and validates byte alignment, sample rate, size and duration (100 ms–30 seconds; <=960,044 bytes). Text is reviewed before generation. TTS text is bounded to 1,200 characters and rejects markup. Both providers have 20-second timeouts and bounded response bodies. No automatic retries or stored recordings.

No-key mode is visibly mock: STT returns a fixed sentence and AI a fixed response. Public sample playback is a locally generated Flite fixture, not a claim of Gnani speech quality. Its license is next to the WAV. Provider requests are stub-tested; live results remain pending local smoke tests.
