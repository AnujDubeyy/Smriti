/**
 * Voice selection per locale for Gnani Timbre TTS.
 * In Gnani Timbre, 'Shivani' is the primary production multilingual voice
 * that natively supports Marathi (mr-IN), Hindi (hi-IN), and English (en-IN).
 * Can be overridden with GNANI_MARATHI_VOICE_ID, GNANI_HINDI_VOICE_ID, etc.
 */

export function getLocaleVoice(locale: string): string {
  if (locale === 'mr-IN') {
    return process.env.GNANI_MARATHI_VOICE_ID || process.env.GNANI_DEFAULT_VOICE_ID || 'Shivani';
  }
  if (locale === 'hi-IN') {
    return process.env.GNANI_HINDI_VOICE_ID || process.env.GNANI_DEFAULT_VOICE_ID || 'Shivani';
  }
  if (locale === 'en-IN') {
    return process.env.GNANI_ENGLISH_VOICE_ID || process.env.GNANI_DEFAULT_VOICE_ID || 'Shivani';
  }
  return process.env.GNANI_DEFAULT_VOICE_ID || 'Shivani';
}
