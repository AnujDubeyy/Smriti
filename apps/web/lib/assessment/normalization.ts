/**
 * Smriti AI Multilingual Answer Normalization Engine
 * Implements Section 11 of the Master Prompt for English, Hindi, and Marathi.
 * 
 * Deterministically normalizes spoken responses without hallucinating or paraphrasing.
 */

import type { ActivityLocale } from './instruments.ts';

// Devanagari to Latin numeral map
const DEVA_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

export function convertDevanagariNumerals(text: string): string {
  return text.replace(/[०-९]/g, ch => DEVA_DIGITS[ch] || ch);
}

// Spoken numbers in Hindi & Marathi
const HINDI_NUMBERS: Record<string, number> = {
  'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5,
  'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
  'सोलह': 16, 'सत्रह': 17, 'अट्ठारह': 18, 'उन्नीस': 19, 'बीस': 20,
  'इक्कीस': 21, 'बाईस': 22, 'तेईस': 23, 'चौबीस': 24, 'पच्चीस': 25,
  'सौ': 100, 'हज़ार': 1000, 'हजार': 1000, 'दो हज़ार': 2000, 'दो हजार': 2000
};

const MARATHI_NUMBERS: Record<string, number> = {
  'शून्य': 0, 'एक': 1, 'दोन': 2, 'तीन': 3, 'चार': 4, 'पाच': 5,
  'सहा': 6, 'सात': 7, 'आठ': 8, 'नऊ': 9, 'दहा': 10,
  'अकरा': 11, 'बारा': 12, 'तेरा': 13, 'चौदा': 14, 'पंधरा': 15,
  'सोळा': 16, 'सतरा': 17, 'अठरा': 18, 'एकोणीस': 19, 'वीस': 20,
  'एकवीस': 21, 'बावीस': 22, 'तेवीस': 23, 'चोवीस': 24, 'पंचवीस': 25,
  'शंभर': 100, 'हजार': 1000, 'दोन हजार': 2000
};

const ENGLISH_NUMBERS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'twenty one': 21, 'twenty two': 22, 'twenty three': 23, 'twenty four': 24, 'twenty five': 25,
  'hundred': 100, 'thousand': 1000, 'two thousand': 2000
};

export const GREGORIAN_MONTHS: Record<ActivityLocale, { name: string; number: number; aliases: string[] }[]> = {
  'en-IN': [
    { name: 'january', number: 1, aliases: ['jan', 'january'] },
    { name: 'february', number: 2, aliases: ['feb', 'february'] },
    { name: 'march', number: 3, aliases: ['mar', 'march'] },
    { name: 'april', number: 4, aliases: ['apr', 'april'] },
    { name: 'may', number: 5, aliases: ['may'] },
    { name: 'june', number: 6, aliases: ['jun', 'june'] },
    { name: 'july', number: 7, aliases: ['jul', 'july'] },
    { name: 'august', number: 8, aliases: ['aug', 'august'] },
    { name: 'september', number: 9, aliases: ['sep', 'sept', 'september'] },
    { name: 'october', number: 10, aliases: ['oct', 'october'] },
    { name: 'november', number: 11, aliases: ['nov', 'november'] },
    { name: 'december', number: 12, aliases: ['dec', 'december'] }
  ],
  'hi-IN': [
    { name: 'जनवरी', number: 1, aliases: ['जनवरी', 'जनवरी का', 'january'] },
    { name: 'फ़रवरी', number: 2, aliases: ['फ़रवरी', 'फरवरी', 'february'] },
    { name: 'मार्च', number: 3, aliases: ['मार्च', 'march'] },
    { name: 'अप्रैल', number: 4, aliases: ['अप्रैल', 'अप्रेल', 'april'] },
    { name: 'मई', number: 5, aliases: ['मई', 'may'] },
    { name: 'जून', number: 6, aliases: ['जून', 'june'] },
    { name: 'जुलाई', number: 7, aliases: ['जुलाई', 'july'] },
    { name: 'अगस्त', number: 8, aliases: ['अगस्त', 'august'] },
    { name: 'सितंबर', number: 9, aliases: ['सितंबर', 'सितम्बर', 'september'] },
    { name: 'अक्टूबर', number: 10, aliases: ['अक्टूबर', 'अक्टोबर', 'october'] },
    { name: 'नवंबर', number: 11, aliases: ['नवंबर', 'नवम्बर', 'november'] },
    { name: 'दिसंबर', number: 12, aliases: ['दिसंबर', 'दिसम्बर', 'december'] }
  ],
  'mr-IN': [
    { name: 'जानेवारी', number: 1, aliases: ['जानेवारी', 'january'] },
    { name: 'फेब्रुवारी', number: 2, aliases: ['फेब्रुवारी', 'february'] },
    { name: 'मार्च', number: 3, aliases: ['मार्च', 'march'] },
    { name: 'एप्रिल', number: 4, aliases: ['एप्रिल', 'april'] },
    { name: 'मे', number: 5, aliases: ['मे', 'may'] },
    { name: 'जून', number: 6, aliases: ['जून', 'june'] },
    { name: 'जुलै', number: 7, aliases: ['जुलै', 'july'] },
    { name: 'ऑगस्ट', number: 8, aliases: ['ऑगस्ट', 'august'] },
    { name: 'सप्टेंबर', number: 9, aliases: ['सप्टेंबर', 'सितंबर', 'september'] },
    { name: 'ऑक्टोबर', number: 10, aliases: ['ऑक्टोबर', 'अक्टूबर', 'october'] },
    { name: 'नोव्हेंबर', number: 11, aliases: ['नोव्हेंबर', 'नवंबर', 'november'] },
    { name: 'डिसेंबर', number: 12, aliases: ['डिसेंबर', 'दिसंबर', 'december'] }
  ]
};

/** Normalize year from spoken text (e.g. "twenty twenty four", "दो हज़ार चौबीस", "२०२४", "2024") */
export function extractSpokenYear(text: string): number | null {
  const clean = convertDevanagariNumerals(text.normalize('NFC').toLowerCase());
  
  // Look for 4-digit year like 2024, 2025, 2026
  const match = clean.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) return parseInt(match[1], 10);

  // Spoken year expressions
  if (clean.includes('two thousand twenty four') || clean.includes('दो हज़ार चौबीस') || clean.includes('दोन हजार चोवीस')) return 2024;
  if (clean.includes('two thousand twenty five') || clean.includes('दो हज़ार पच्चीस') || clean.includes('दोन हजार पंचवीस')) return 2025;
  if (clean.includes('two thousand twenty six') || clean.includes('दो हज़ार छब्बीस') || clean.includes('दोन हजार सव्वीस')) return 2026;
  if (clean.includes('two thousand twenty seven')) return 2027;

  return null;
}

/** Match month name and return month number 1-12 */
export function extractSpokenMonth(text: string, locale: ActivityLocale): number | null {
  const clean = text.normalize('NFC').toLowerCase().trim();
  const list = [
    ...(GREGORIAN_MONTHS[locale] || []),
    ...(GREGORIAN_MONTHS['en-IN']),
    ...(GREGORIAN_MONTHS['hi-IN']),
    ...(GREGORIAN_MONTHS['mr-IN'])
  ];

  for (const item of list) {
    for (const alias of item.aliases) {
      if (clean.includes(alias.toLowerCase())) {
        return item.number;
      }
    }
  }

  // Check numeric month expressions (e.g. "month 11", "ग्यारहवां महीना")
  const digitMatch = clean.match(/\b([1-9]|1[0-2])\b/);
  if (digitMatch && (clean.includes('month') || clean.includes('महीना') || clean.includes('महिना'))) {
    return parseInt(digitMatch[1], 10);
  }

  return null;
}

/** Check approximate time within tolerance (in minutes, default ±60 min) */
export function evaluateApproximateTime(
  spokenText: string,
  referenceTimestampMs: number,
  toleranceMinutes: number = 60
): { isAccurate: boolean; parsedHour?: number; parsedMinute?: number } {
  const clean = convertDevanagariNumerals(spokenText.normalize('NFC').toLowerCase());
  
  // Search for patterns like "3:30", "3 30", "4 o'clock", "साढ़े तीन", "चार बजे"
  let parsedHour: number | undefined;
  let parsedMinute: number = 0;

  const clockMatch = clean.match(/\b([0-1]?[0-9]|2[0-3])(?::([0-5][0-9]))?\b/);
  if (clockMatch) {
    parsedHour = parseInt(clockMatch[1], 10);
    if (clockMatch[2]) parsedMinute = parseInt(clockMatch[2], 10);
  }

  // Hindi/Marathi spoken expressions
  if (clean.includes('साढ़े तीन') || clean.includes('साडेतीन')) { parsedHour = 3; parsedMinute = 30; }
  else if (clean.includes('साढ़े चार') || clean.includes('साडेचार')) { parsedHour = 4; parsedMinute = 30; }
  else if (clean.includes('साढ़े पाँच') || clean.includes('साडेपाच')) { parsedHour = 5; parsedMinute = 30; }
  else if (clean.includes('ढाई') || clean.includes('अडीच')) { parsedHour = 2; parsedMinute = 30; }
  else if (clean.includes('डेढ़') || clean.includes('दीड')) { parsedHour = 1; parsedMinute = 30; }

  if (parsedHour === undefined) {
    return { isAccurate: false };
  }

  const refDate = new Date(referenceTimestampMs);
  const refTotalMin = refDate.getHours() * 60 + refDate.getMinutes();
  
  // Handle 12-hour vs 24-hour ambiguity
  const cand1 = parsedHour * 60 + parsedMinute;
  const cand2 = ((parsedHour % 12) + 12) * 60 + parsedMinute;
  const cand3 = (parsedHour % 12) * 60 + parsedMinute;

  const diff1 = Math.abs(cand1 - refTotalMin);
  const diff2 = Math.abs(cand2 - refTotalMin);
  const diff3 = Math.abs(cand3 - refTotalMin);
  const minDiff = Math.min(diff1, diff2, diff3);

  return {
    isAccurate: minDiff <= toleranceMinutes,
    parsedHour,
    parsedMinute
  };
}

export interface BackwardCountAnalysis {
  numbersSpoken: number[];
  expectedStart: number;
  expectedEnd: number;
  omissions: number[];
  orderErrors: number[];
  errorCount: number;
  isComplete: boolean;
}

/** Evaluates backward counting (e.g. from 20 to 1) */
export function analyzeBackwardCount(
  text: string,
  start: number = 20,
  end: number = 1
): BackwardCountAnalysis {
  const converted = convertDevanagariNumerals(text.normalize('NFC').toLowerCase());
  
  // Extract all number tokens
  const tokens = converted.split(/[,\s।.]+|-/).filter(Boolean);
  const numbersSpoken: number[] = [];

  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) {
      numbersSpoken.push(parseInt(tok, 10));
    } else if (ENGLISH_NUMBERS[tok] !== undefined) {
      numbersSpoken.push(ENGLISH_NUMBERS[tok]);
    } else if (HINDI_NUMBERS[tok] !== undefined) {
      numbersSpoken.push(HINDI_NUMBERS[tok]);
    } else if (MARATHI_NUMBERS[tok] !== undefined) {
      numbersSpoken.push(MARATHI_NUMBERS[tok]);
    }
  }

  // Deduplicate consecutive repeats (self-corrections)
  const deduped: number[] = [];
  for (let i = 0; i < numbersSpoken.length; i++) {
    if (i === 0 || numbersSpoken[i] !== numbersSpoken[i - 1]) {
      deduped.push(numbersSpoken[i]);
    }
  }

  let errorCount = 0;
  const orderErrors: number[] = [];

  for (let i = 1; i < deduped.length; i++) {
    if (deduped[i] >= deduped[i - 1]) {
      orderErrors.push(deduped[i]);
      errorCount++;
    }
  }

  const expectedCount = (start - end) + 1;
  const omissions: number[] = [];
  const set = new Set(deduped);
  for (let n = start; n >= end; n--) {
    if (!set.has(n)) {
      omissions.push(n);
    }
  }

  // If patient missed significant numbers
  if (omissions.length > 3) {
    errorCount += Math.min(2, Math.floor(omissions.length / 3));
  }

  const isComplete = deduped.length >= Math.floor(expectedCount * 0.7) && errorCount === 0;

  return {
    numbersSpoken: deduped,
    expectedStart: start,
    expectedEnd: end,
    omissions,
    orderErrors,
    errorCount,
    isComplete
  };
}

export interface ReverseMonthAnalysis {
  monthsDetected: number[]; // 12 down to 1
  errorCount: number;
  orderErrors: number[];
  omissions: number[];
}

/** Evaluates months in reverse order starting from December */
export function analyzeReverseMonths(text: string, locale: ActivityLocale): ReverseMonthAnalysis {
  const clean = text.normalize('NFC').toLowerCase();
  const list = GREGORIAN_MONTHS[locale] || GREGORIAN_MONTHS['en-IN'];

  // Find the best (longest) month alias match at each character position
  const positionBest = new Map<number, { number: number; length: number }>();

  for (const m of list) {
    for (const alias of m.aliases) {
      const a = alias.toLowerCase();
      let idx = clean.indexOf(a);
      while (idx !== -1) {
        const existing = positionBest.get(idx);
        if (!existing || a.length > existing.length) {
          positionBest.set(idx, { number: m.number, length: a.length });
        }
        idx = clean.indexOf(a, idx + a.length);
      }
    }
  }

  // Sort by string position, then collapse to month number sequence
  const sorted = [...positionBest.entries()]
    .sort((a, b) => a[0] - b[0]);

  // Deduplicate consecutive same-month numbers (overlapping short+long aliases)
  const monthsDetected: number[] = [];
  for (const [, { number }] of sorted) {
    if (monthsDetected.length === 0 || monthsDetected[monthsDetected.length - 1] !== number) {
      monthsDetected.push(number);
    }
  }

  let errorCount = 0;
  const orderErrors: number[] = [];

  for (let i = 1; i < monthsDetected.length; i++) {
    // Should decrease (e.g. 12, 11, 10...)
    if (monthsDetected[i] >= monthsDetected[i - 1]) {
      orderErrors.push(monthsDetected[i]);
      errorCount++;
    }
  }

  const omissions: number[] = [];
  const set = new Set(monthsDetected);
  for (let m = 12; m >= 1; m--) {
    if (!set.has(m)) omissions.push(m);
  }

  if (omissions.length > 3) errorCount += 1;

  return {
    monthsDetected,
    errorCount,
    orderErrors,
    omissions,
  };
}

/** Address Component Recall Matcher */
export function matchAddressComponents(
  spokenText: string,
  expectedComponents: string[]
): { recalled: string[]; missing: string[]; matchedCount: number } {
  const clean = spokenText.normalize('NFC').toLowerCase();
  const recalled: string[] = [];
  const missing: string[] = [];

  for (const comp of expectedComponents) {
    const compClean = comp.normalize('NFC').toLowerCase().trim();
    if (clean.includes(compClean)) {
      recalled.push(comp);
    } else {
      missing.push(comp);
    }
  }

  return {
    recalled,
    missing,
    matchedCount: recalled.length
  };
}
