/** Original prototype activities, not copyrighted tests or clinical instruments. */
export const activityCatalog=[
 {code:'smriti_word_repeat_v1',title:'Repeat five words',
  duration:'2–3 min',description:'Hear five everyday words, then repeat what was heard. Caretaker records the response.'},
 {code:'smriti_category_fluency_v1',title:'Name animals',
  duration:'1 min',description:'Name as many animals as possible in one minute, at a comfortable pace.'},
 {code:'smriti_orientation_v1',title:'Day and place conversation',
  duration:'2 min',description:'Respond to gentle questions about the day and current surroundings.'}
] as const;
export type ActivityCode=typeof activityCatalog[number]['code'];
export function isActivityCode(value:string):value is ActivityCode{
 return activityCatalog.some(a=>a.code===value);
}
export type Assignment={
 id:string;instrument_code:string;status:string;due_date:string|null;
 created_at:string;submitted_at?:string|null;response_text?:string;caregiver_observation?:string;task_score?:number|null
};
export type ActivityLocale='en-IN'|'hi-IN'|'mr-IN';
export function activityPrompt(code:ActivityCode,locale:string):string{
 const prompts:Record<ActivityCode,Record<ActivityLocale,string>>={
  smriti_word_repeat_v1:{
   'en-IN':'Please listen carefully. Cup, river, garden, chair, mango. Now repeat the five words in any order.',
   'hi-IN':'कृपया ध्यान से सुनिए। कप, नदी, बगीचा, कुर्सी, आम। अब ये पाँच शब्द दोहराइए।',
   'mr-IN':'कृपया नीट ऐका। कप, नदी, बाग, खुर्ची, आंबा। आता हे पाच शब्द पुन्हा सांगा.'
  },
  smriti_category_fluency_v1:{
   'en-IN':'Take your time and name as many different animals as you can during one minute.',
   'hi-IN':'एक मिनट में जितने अलग-अलग जानवरों के नाम याद आएँ, आराम से बताइए।',
   'mr-IN':'एका मिनिटात जितक्या वेगवेगळ्या प्राण्यांची नावे आठवतील तितकी शांतपणे सांगा.'
  },
  smriti_orientation_v1:{
   'en-IN':'What day do you think it is today? Can you tell me where you are right now?',
   'hi-IN':'आपके हिसाब से आज कौन सा दिन है? क्या आप बता सकते हैं कि अभी आप कहाँ हैं?',
   'mr-IN':'तुमच्या मते आज कोणता वार आहे? आणि तुम्ही आत्ता कुठे आहात ते सांगू शकाल का?'
  }
 };
 const lang:ActivityLocale=locale==='hi-IN'||locale==='mr-IN'?locale:'en-IN';
 return prompts[code][lang];
}

export function wordTargets(locale:string){
 return locale==='hi-IN'?['कप','नदी','बगीचा','कुर्सी','आम']:locale==='mr-IN'?['कप','नदी','बाग','खुर्ची','आंबा']:['cup','river','garden','chair','mango'];
}
function normalizeWord(value:string,_locale:string){return value.normalize('NFC').toLowerCase();}
export function wordMatches(text:string,locale:string){
 const targets=new Set(wordTargets(locale).map(word=>normalizeWord(word,locale)));
 const spoken=new Set(text.normalize('NFC').split(/[^\p{L}\p{M}]+/u).map(word=>normalizeWord(word,locale)).filter(Boolean));
 return [...targets].filter(word=>spoken.has(word)).length;
}
export function wordMatchTokens(text:string,locale:string,scoreWords:boolean):{text:string;recognized:boolean}[]{
 const targetSet=new Set(scoreWords?wordTargets(locale).map(word=>normalizeWord(word,locale)):[]);
 return text.split(/([\p{L}\p{M}]+)/u).filter(Boolean).map(part=>({
  text:part,recognized:/[\p{L}\p{M}]/u.test(part)&&targetSet.has(normalizeWord(part,locale))
 }));
}
export function resultLabel(code:string){
 return code==='smriti_word_repeat_v1'?'target words repeated out of 5':code==='smriti_orientation_v1'?'correct answers out of 2':'distinct animals confirmed';
}
