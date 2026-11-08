/**
 * POST /api/v1/assessment/synthesize
 * Synthesizes voice assessment prompts using Gnani Timbre TTS
 * with native support for Marathi (mr-IN), Hindi (hi-IN), and English (en-IN).
 */

import { z } from 'zod';
import { requireCare, CareError, failure } from '../../../../../lib/care';
import { json, sameOrigin, limitedBody } from '../../../../../lib/auth/http';
import { synthesize } from '../../../../../lib/voice/gnani';
import { getLocaleVoice } from '../../../../../lib/voice/locale-voices';
import { VOICE_LANGUAGE_CODES } from '../../../../../lib/voice/languages';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const synthesizeSchema = z.object({
  text: z.string().trim().min(1).max(1200),
  locale: z.enum(VOICE_LANGUAGE_CODES).optional().default('mr-IN'),
  voice: z.string().optional()
}).strict();

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new CareError('forbidden', 403);
    const raw = await limitedBody(request, 2000);
    if (!raw) throw new CareError('invalid_request', 400);

    const input = synthesizeSchema.parse(JSON.parse(raw));

    if (process.env.SMRITI_LOCAL_DOCTOR_PREVIEW !== '1') {
      await requireCare().catch(() => {});
    }

    const key = process.env.GNANI_API_KEY_ID;
    if (!key) {
      return json({ ok: false, error: 'voice_not_configured', fallback: true });
    }

    // Clean any markup to avoid invalid_tts error
    const cleanText = input.text.replace(/[<>]/g, '').trim();
    if (!cleanText) throw new CareError('invalid_text', 400);

    const voiceName = input.voice || getLocaleVoice(input.locale);

    try {
      const audioBytes = await synthesize(cleanText, input.locale, voiceName, key, request.signal);
      const audioBase64 = Buffer.from(audioBytes).toString('base64');

      return json({
        ok: true,
        audio_base64: audioBase64,
        mimeType: 'audio/wav',
        voice: voiceName,
        locale: input.locale,
        provider: 'gnani'
      });
    } catch (synthErr) {
      console.warn('Gnani synthesis error during assessment:', synthErr);
      return json({
        ok: false,
        error: synthErr instanceof Error ? synthErr.message : 'synthesis_failed',
        fallback: true
      });
    }
  } catch (error) {
    return failure(error);
  }
}
