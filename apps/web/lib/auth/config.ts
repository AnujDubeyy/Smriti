// An explicit project reference prevents accidental reuse of another app's environment.
export function authConfig() {
 const url = process.env.SMRITI_SUPABASE_URL;
 const key = process.env.SMRITI_SUPABASE_PUBLISHABLE_KEY;
 const expected = process.env.SMRITI_SUPABASE_PROJECT_REF;
 if (!url || !key || !expected) return null;
 try {
  const parsed = new URL(url);
  if (expected === 'qrjsxucybeorxeiqfsjo' || parsed.protocol !== 'https:' || parsed.hostname !== `${expected}.supabase.co` || parsed.pathname !== '/' || parsed.username || parsed.password || parsed.search || parsed.hash || !key.startsWith('sb_publishable_')) return null;
  return { url: parsed.origin, key };
 } catch { return null; }
}
