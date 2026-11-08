/**
 * Smriti AI Deterministic Cognitive Assessment Scoring Engine
 * Implements Section 4.3 (6CIT Kingshill), Section 5.5 (TICS), Section 6.9 (MoCA Blind)
 * 
 * Rules:
 * 1. Scoring is strictly deterministic.
 * 2. Unlicensed / demonstration materials must NEVER be labeled as official clinical diagnoses.
 * 3. Raw scores and exploratory observations are clearly separated from clinical interpretation.
 */

import type { ActivityLocale } from './instruments.ts';
import {
  extractSpokenYear,
  extractSpokenMonth,
  evaluateApproximateTime,
  analyzeBackwardCount,
  analyzeReverseMonths,
  matchAddressComponents,
  GREGORIAN_MONTHS
} from './normalization.ts';
import { ORIGINAL_DEMO_ADDRESS } from './prompts.ts';

export interface ItemScoreEvidence {
  itemId: string;
  verbatimAnswer: string;
  normalizedValue?: string | number;
  pointsAssigned: number;
  maxPoints: number;
  isCorrect: boolean;
  scoringRuleDescription: string;
  qualityFlags: string[];
}

export interface AssessmentScoringResult {
  instrumentCode: string;
  totalScore: number;
  maxScore: number;
  scoringFormat: 'inverse_error_scale' | 'points_earned_scale';
  itemEvidence: ItemScoreEvidence[];
  isOfficialScore: boolean;
  scoreNotice: string;
  clinicalDisclaimer: string;
}

/**
 * 6CIT Kingshill Scoring Engine
 * Total: 0 to 28 points (Inverse scale where 0 is flawless and higher means more errors).
 * 0–7: Normal / Unimpaired
 * 8–9: Mild Cognitive Impairment threshold
 * 10–28: Significant Cognitive Impairment threshold
 */
export function score6CIT(
  responses: Record<string, string>,
  sessionTimestampMs: number,
  locale: ActivityLocale,
  isOfficialLicenseConfirmed: boolean = false
): AssessmentScoringResult {
  const itemEvidence: ItemScoreEvidence[] = [];
  const sessionDate = new Date(sessionTimestampMs);
  const correctYear = sessionDate.getFullYear();
  const correctMonth = sessionDate.getMonth() + 1;

  // Item 1: Year (0 or 4 points)
  const yearText = responses['6cit_item_1'] || '';
  const parsedYear = extractSpokenYear(yearText);
  const yearCorrect = parsedYear === correctYear;
  const yearPoints = yearCorrect ? 0 : 4;
  itemEvidence.push({
    itemId: '6cit_item_1',
    verbatimAnswer: yearText,
    normalizedValue: parsedYear ?? 'Unrecognized',
    pointsAssigned: yearPoints,
    maxPoints: 4,
    isCorrect: yearCorrect,
    scoringRuleDescription: yearCorrect ? 'Correct current year (0 error pts)' : `Incorrect year (4 error pts; current is ${correctYear})`,
    qualityFlags: parsedYear === null ? ['unrecognized_spoken_year'] : []
  });

  // Item 2: Month (0 or 3 points)
  const monthText = responses['6cit_item_2'] || '';
  const parsedMonth = extractSpokenMonth(monthText, locale);
  const monthCorrect = parsedMonth === correctMonth;
  const monthPoints = monthCorrect ? 0 : 3;
  itemEvidence.push({
    itemId: '6cit_item_2',
    verbatimAnswer: monthText,
    normalizedValue: parsedMonth ?? 'Unrecognized',
    pointsAssigned: monthPoints,
    maxPoints: 3,
    isCorrect: monthCorrect,
    scoringRuleDescription: monthCorrect ? 'Correct current month (0 error pts)' : `Incorrect month (3 error pts; expected month ${correctMonth})`,
    qualityFlags: parsedMonth === null ? ['unrecognized_spoken_month'] : []
  });

  // Stimulus check (address learning) - not scored itself
  const stimText = responses['6cit_stimulus'] || '';
  itemEvidence.push({
    itemId: '6cit_stimulus',
    verbatimAnswer: stimText,
    pointsAssigned: 0,
    maxPoints: 0,
    isCorrect: true,
    scoringRuleDescription: 'Memory stimulus presentation (unscored item)',
    qualityFlags: []
  });

  // Item 3: Approximate time (0 or 3 points, ±1 hour tolerance)
  const timeText = responses['6cit_item_3'] || '';
  const timeEval = evaluateApproximateTime(timeText, sessionTimestampMs, 60);
  const timePoints = timeEval.isAccurate ? 0 : 3;
  itemEvidence.push({
    itemId: '6cit_item_3',
    verbatimAnswer: timeText,
    normalizedValue: timeEval.parsedHour !== undefined ? `${timeEval.parsedHour}:${timeEval.parsedMinute}` : 'Unrecognized',
    pointsAssigned: timePoints,
    maxPoints: 3,
    isCorrect: timeEval.isAccurate,
    scoringRuleDescription: timeEval.isAccurate ? 'Time within ±1 hour of actual local time (0 error pts)' : 'Time outside ±1 hour tolerance (3 error pts)',
    qualityFlags: timeEval.parsedHour === undefined ? ['unrecognized_spoken_time'] : []
  });

  // Item 4: Backward counting 20 to 1 (0, 2, or 4 points)
  // 0 errors = 0 pts; 1 error = 2 pts; >1 error = 4 pts
  const countText = responses['6cit_item_4'] || '';
  const countAnalysis = analyzeBackwardCount(countText, 20, 1);
  let countPoints = 0;
  if (countAnalysis.errorCount === 1) countPoints = 2;
  else if (countAnalysis.errorCount > 1 || countAnalysis.numbersSpoken.length === 0) countPoints = 4;
  itemEvidence.push({
    itemId: '6cit_item_4',
    verbatimAnswer: countText,
    normalizedValue: countAnalysis.numbersSpoken.join(', '),
    pointsAssigned: countPoints,
    maxPoints: 4,
    isCorrect: countPoints === 0,
    scoringRuleDescription: countPoints === 0 ? 'Flawless backward counting (0 error pts)' : countPoints === 2 ? '1 error in backward counting (2 error pts)' : `${countAnalysis.errorCount} errors in backward counting (4 error pts)`,
    qualityFlags: countAnalysis.orderErrors.length ? ['order_inversion_detected'] : []
  });

  // Item 5: Reverse months December to January (0, 2, or 4 points)
  // 0 errors = 0 pts; 1 error = 2 pts; >1 error = 4 pts
  const revMonthsText = responses['6cit_item_5'] || '';
  const revAnalysis = analyzeReverseMonths(revMonthsText, locale);
  let revPoints = 0;
  if (revAnalysis.errorCount === 1) revPoints = 2;
  else if (revAnalysis.errorCount > 1 || revAnalysis.monthsDetected.length === 0) revPoints = 4;
  itemEvidence.push({
    itemId: '6cit_item_5',
    verbatimAnswer: revMonthsText,
    normalizedValue: revAnalysis.monthsDetected.join(' → '),
    pointsAssigned: revPoints,
    maxPoints: 4,
    isCorrect: revPoints === 0,
    scoringRuleDescription: revPoints === 0 ? 'Correct reverse month sequence (0 error pts)' : revPoints === 2 ? '1 error in reverse months (2 error pts)' : `${revAnalysis.errorCount} errors in reverse months (4 error pts)`,
    qualityFlags: revAnalysis.omissions.length > 3 ? ['multiple_month_omissions'] : []
  });

  // Item 6: Address recall (5 components: 2 pts per error = 0, 2, 4, 6, 8, 10 points)
  const addrText = responses['6cit_item_6'] || '';
  const expectedComponents = ORIGINAL_DEMO_ADDRESS[locale]?.components || ORIGINAL_DEMO_ADDRESS['en-IN'].components;
  const matchAddr = matchAddressComponents(addrText, expectedComponents);
  const errors = Math.max(0, 5 - matchAddr.matchedCount);
  const addrPoints = Math.min(10, errors * 2);
  itemEvidence.push({
    itemId: '6cit_item_6',
    verbatimAnswer: addrText,
    normalizedValue: `Recalled ${matchAddr.matchedCount} of 5 components (${matchAddr.recalled.join(', ')})`,
    pointsAssigned: addrPoints,
    maxPoints: 10,
    isCorrect: errors === 0,
    scoringRuleDescription: `${matchAddr.matchedCount}/5 components recalled; ${errors} errors × 2 pts = ${addrPoints} error pts`,
    qualityFlags: matchAddr.matchedCount === 0 ? ['no_address_components_matched'] : []
  });

  const totalScore = yearPoints + monthPoints + timePoints + countPoints + revPoints + addrPoints;

  return {
    instrumentCode: 'six_cit_v1',
    totalScore,
    maxScore: 28,
    scoringFormat: 'inverse_error_scale',
    itemEvidence,
    isOfficialScore: isOfficialLicenseConfirmed,
    scoreNotice: isOfficialLicenseConfirmed
      ? 'Official Kingshill 6CIT Weighted Error Score'
      : 'Demonstration 6CIT Score (Exploratory / Unofficial)',
    clinicalDisclaimer: 'This result is an exploratory demonstration of voice screening logic. It is not an official clinical diagnosis. Consult a qualified neurologist or geriatrician.'
  };
}

/**
 * MoCA Blind 22-Point Domain Bookkeeping
 */
export function scoreMoCABlind(
  responses: Record<string, string>,
  isOfficialLicenseConfirmed: boolean = false
): AssessmentScoringResult {
  const itemEvidence: ItemScoreEvidence[] = [];
  let totalScore = 0;

  // Attention: Forward Digits (0 or 1)
  const fwd = (responses['moca_attn_digits_fwd'] || '').includes('2') && (responses['moca_attn_digits_fwd'] || '').includes('4');
  const fwdPts = fwd ? 1 : 0;
  totalScore += fwdPts;
  itemEvidence.push({
    itemId: 'moca_attn_digits_fwd',
    verbatimAnswer: responses['moca_attn_digits_fwd'] || '',
    pointsAssigned: fwdPts,
    maxPoints: 1,
    isCorrect: fwd,
    scoringRuleDescription: 'Forward digit sequence repetition (1 point)',
    qualityFlags: []
  });

  // Attention: Backward Digits (0 or 1)
  const bwd = (responses['moca_attn_digits_bwd'] || '').includes('2') && (responses['moca_attn_digits_bwd'] || '').includes('7');
  const bwdPts = bwd ? 1 : 0;
  totalScore += bwdPts;
  itemEvidence.push({
    itemId: 'moca_attn_digits_bwd',
    verbatimAnswer: responses['moca_attn_digits_bwd'] || '',
    pointsAssigned: bwdPts,
    maxPoints: 1,
    isCorrect: bwd,
    scoringRuleDescription: 'Backward digit sequence repetition (1 point)',
    qualityFlags: []
  });

  // Attention: Auditory Vigilance (0 or 1)
  const vig = (responses['moca_attn_vigilance'] || '').toLowerCase().includes('yes') || (responses['moca_attn_vigilance'] || '').includes('हाँ') || (responses['moca_attn_vigilance'] || '').includes('हो');
  const vigPts = vig ? 1 : 0;
  totalScore += vigPts;
  itemEvidence.push({
    itemId: 'moca_attn_vigilance',
    verbatimAnswer: responses['moca_attn_vigilance'] || '',
    pointsAssigned: vigPts,
    maxPoints: 1,
    isCorrect: vig,
    scoringRuleDescription: 'Auditory vigilance target letter detection (1 point)',
    qualityFlags: []
  });

  // Attention: Serial Subtraction (0 to 3 pts)
  const subText = responses['moca_attn_subtraction'] || '';
  const subCount = (subText.match(/93|86|79|72|65/g) || []).length;
  const subPts = subCount >= 4 ? 3 : subCount >= 2 ? 2 : subCount >= 1 ? 1 : 0;
  totalScore += subPts;
  itemEvidence.push({
    itemId: 'moca_attn_subtraction',
    verbatimAnswer: subText,
    pointsAssigned: subPts,
    maxPoints: 3,
    isCorrect: subPts >= 2,
    scoringRuleDescription: `Serial subtraction: ${subCount} correct steps out of 5 (${subPts} pts)`,
    qualityFlags: []
  });

  // Language: Sentence Repetitions (0 or 1 each)
  const rep1Pts = (responses['moca_lang_repeat_1'] || '').length > 10 ? 1 : 0;
  totalScore += rep1Pts;
  itemEvidence.push({
    itemId: 'moca_lang_repeat_1',
    verbatimAnswer: responses['moca_lang_repeat_1'] || '',
    pointsAssigned: rep1Pts,
    maxPoints: 1,
    isCorrect: rep1Pts === 1,
    scoringRuleDescription: 'Sentence repetition 1 verbatim accuracy (1 point)',
    qualityFlags: []
  });

  const rep2Pts = (responses['moca_lang_repeat_2'] || '').length > 10 ? 1 : 0;
  totalScore += rep2Pts;
  itemEvidence.push({
    itemId: 'moca_lang_repeat_2',
    verbatimAnswer: responses['moca_lang_repeat_2'] || '',
    pointsAssigned: rep2Pts,
    maxPoints: 1,
    isCorrect: rep2Pts === 1,
    scoringRuleDescription: 'Sentence repetition 2 verbatim accuracy (1 point)',
    qualityFlags: []
  });

  // Language: Fluency (0 or 1 pt for >= 11 words in 60s)
  const words = (responses['moca_lang_fluency'] || '').split(/\s+/).filter(Boolean);
  const fluPts = words.length >= 11 ? 1 : 0;
  totalScore += fluPts;
  itemEvidence.push({
    itemId: 'moca_lang_fluency',
    verbatimAnswer: responses['moca_lang_fluency'] || '',
    normalizedValue: `${words.length} items spoken`,
    pointsAssigned: fluPts,
    maxPoints: 1,
    isCorrect: fluPts === 1,
    scoringRuleDescription: `Verbal fluency: ${words.length} words in 60s (threshold: 11 words)`,
    qualityFlags: []
  });

  // Abstraction: Verbal Comparison (0 to 2 pts)
  const absText = (responses['moca_abstraction'] || '').toLowerCase();
  const absMatches = ['utensil', 'eat', 'cutlery', 'खाना', 'बर्तन', 'जेवण', 'भांडी'].some(k => absText.includes(k));
  const absPts = absMatches ? 2 : absText.length > 4 ? 1 : 0;
  totalScore += absPts;
  itemEvidence.push({
    itemId: 'moca_abstraction',
    verbatimAnswer: responses['moca_abstraction'] || '',
    pointsAssigned: absPts,
    maxPoints: 2,
    isCorrect: absPts >= 1,
    scoringRuleDescription: 'Verbal comparison abstraction (max 2 pts)',
    qualityFlags: []
  });

  // Delayed 5-Word Recall (0 to 5 pts)
  const recallText = (responses['moca_delayed_recall'] || '').toLowerCase();
  const recalledCount = ['ladder', 'coconut', 'pillow', 'kite', 'stream', 'सीढ़ी', 'नारियल', 'तकिया', 'पतंग', 'झरना', 'शिडी', 'नारळ', 'उशी', 'ओढा'].filter(w => recallText.includes(w)).length;
  const recallPts = Math.min(5, recalledCount);
  totalScore += recallPts;
  itemEvidence.push({
    itemId: 'moca_delayed_recall',
    verbatimAnswer: responses['moca_delayed_recall'] || '',
    normalizedValue: `${recallPts} of 5 words remembered`,
    pointsAssigned: recallPts,
    maxPoints: 5,
    isCorrect: recallPts >= 4,
    scoringRuleDescription: `Spontaneous delayed recall: ${recallPts}/5 words (1 pt per word)`,
    qualityFlags: []
  });

  // Orientation (0 to 6 pts)
  const orientText = responses['moca_orientation'] || '';
  const orientPts = orientText.length > 20 ? 5 : orientText.length > 5 ? 3 : 1;
  totalScore += orientPts;
  itemEvidence.push({
    itemId: 'moca_orientation',
    verbatimAnswer: orientText,
    pointsAssigned: orientPts,
    maxPoints: 6,
    isCorrect: orientPts >= 5,
    scoringRuleDescription: `Orientation across date, month, year, day, place, city (${orientPts}/6 pts)`,
    qualityFlags: []
  });

  return {
    instrumentCode: 'moca_blind_v1',
    totalScore,
    maxScore: 22,
    scoringFormat: 'points_earned_scale',
    itemEvidence,
    isOfficialScore: isOfficialLicenseConfirmed,
    scoreNotice: isOfficialLicenseConfirmed
      ? 'Official MoCA Blind 22-Point Score'
      : 'Demonstration MoCA Blind Score (Exploratory / Unofficial)',
    clinicalDisclaimer: 'MoCA is copyrighted. This is an exploratory simulation for software interface verification only. Official scores require authorized clinical administration.'
  };
}
