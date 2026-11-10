/**
 * Voice selection per locale for Gnani Timbre TTS (model: timbre-v2.5).
 * Active voices:
 *   mr-IN → Brinda (GNANI_MARATHI_VOICE_ID)
 *   bn-IN → Trisha (GNANI_BENGALI_VOICE_ID)
 * Override any locale via its env var; fallback is 'Shivani' on timbre-v3.0.
 */

export function getLocaleVoice(locale: string): string {
  if (locale === 'mr-IN') {
    return process.env.GNANI_MARATHI_VOICE_ID || 'Brinda';
  }
  if (locale === 'bn-IN') {
    return process.env.GNANI_BENGALI_VOICE_ID || 'Trisha';
  }
  if (locale === 'hi-IN') {
    return process.env.GNANI_HINDI_VOICE_ID || process.env.GNANI_DEFAULT_VOICE_ID || 'Shivani';
  }
  if (locale === 'en-IN') {
    return process.env.GNANI_ENGLISH_VOICE_ID || process.env.GNANI_DEFAULT_VOICE_ID || 'Shivani';
  }
  return process.env.GNANI_DEFAULT_VOICE_ID || 'Shivani';
}

