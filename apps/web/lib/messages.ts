import dictionaries from './messages.json';
export const messages = dictionaries;
export type Locale = keyof typeof messages;
export const locales = ['en-IN', 'hi-IN', 'mr-IN'] as const;
export const localeNames: Record<Locale, string> = { 'en-IN': 'English', 'hi-IN': 'हिन्दी · Beta', 'mr-IN': 'मराठी · Beta' };
export const pillars = ['assessment', 'companionship', 'monitoring'] as const;
export type Pillar = typeof pillars[number];
export const roles = ['patient', 'caregiver', 'clinician'] as const;
export type Role = typeof roles[number];
