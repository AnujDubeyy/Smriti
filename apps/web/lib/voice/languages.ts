/** Languages supported by Gnani Prisma v3 and Timbre v3; UI translations are separate. */
export const VOICE_LANGUAGES=[
 {code:"hi-IN",name:"हिन्दी · Hindi"},
 {code:"en-IN",name:"English"},
 {code:"mr-IN",name:"मराठी · Marathi"},
 {code:"bn-IN",name:"বাংলা · Bengali"},
 {code:"gu-IN",name:"ગુજરાતી · Gujarati"},
 {code:"pa-IN",name:"ਪੰਜਾਬੀ · Punjabi"},
 {code:"kn-IN",name:"ಕನ್ನಡ · Kannada"},
 {code:"te-IN",name:"తెలుగు · Telugu"},
 {code:"ta-IN",name:"தமிழ் · Tamil"},
 {code:"ml-IN",name:"മലയാളം · Malayalam"}
] as const;
export type VoiceLocale=typeof VOICE_LANGUAGES[number]["code"];
export const VOICE_LANGUAGE_CODES=VOICE_LANGUAGES.map(x=>x.code) as [VoiceLocale,...VoiceLocale[]];
export function isVoiceLocale(value:string):value is VoiceLocale{return VOICE_LANGUAGE_CODES.some(code=>code===value);}
