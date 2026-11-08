import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeResponseTiming,
  buildTimelineSegments
} from '../lib/assessment/timing.ts';

import {
  convertDevanagariNumerals,
  extractSpokenYear,
  extractSpokenMonth,
  analyzeBackwardCount,
  analyzeReverseMonths,
  matchAddressComponents
} from '../lib/assessment/normalization.ts';

import {
  score6CIT,
  scoreMoCABlind
} from '../lib/assessment/scoring.ts';

import {
  createAssessmentSession,
  recordItemAnswerAndAdvance
} from '../lib/assessment/state-machine.ts';

import {
  findInstrument,
  STANDARDIZED_INSTRUMENTS,
  TRIAL_ACTIVITIES
} from '../lib/assessment/instruments.ts';

// -------------------------------------------------------------
// 1. Response Latency & Audio Boundary Timing Tests
// -------------------------------------------------------------
test('timing: calculates accurate initiation latency and isolates technical delay', () => {
  const timestamps = {
    question_prepared_at: 1000,
    tts_generation_started_at: 1050,
    tts_audio_received_at: 1350,
    question_playback_started_at: 1400,
    question_playback_finished_at: 4400, // prompt finished at 4400ms
    listening_started_at: 4410,
    patient_speech_started_at: 5600,     // patient started speaking at 5600ms (1200ms latency)
    patient_speech_ended_at: 8200,       // patient finished at 8200ms (2600ms speech span)
    stt_first_partial_at: 8400,
    stt_final_at: 8950,                  // STT completed at 8950ms (750ms STT delay)
    answer_finalized_at: 9000
  };

  const analysis = analyzeResponseTiming(timestamps);

  // Patient cognitive initiation latency
  assert.equal(analysis.response_latency_ms, 1200);

  // Patient speaking span
  assert.equal(analysis.response_span_ms, 2600);

  // Technical delay (STT processing)
  assert.equal(analysis.stt_processing_delay_ms, 750);

  // Technical prompt delivery duration
  assert.equal(analysis.prompt_playback_duration_ms, 3000);

  // No quality flags for clean turn
  assert.equal(analysis.quality_flags.length, 0);

  // Timeline segments builder returns 4 segments matching the right types
  const segments = buildTimelineSegments(analysis);
  assert.equal(segments.length, 4);
  assert.equal(segments[0].type, 'prompt');
  assert.equal(segments[1].type, 'latency');
  assert.equal(segments[2].type, 'speech');
  assert.equal(segments[3].type, 'technical');
  assert.equal(segments[0].durationMs, 3000); // prompt playback
  assert.equal(segments[1].durationMs, 1200); // patient initiation latency
  assert.equal(segments[2].durationMs, 2600); // speech span
  assert.equal(segments[3].durationMs, 750);  // STT processing
});

test('timing: flags speech before question playback finishes', () => {
  const timestamps = {
    question_prepared_at: 1000,
    question_playback_started_at: 1200,
    question_playback_finished_at: 4000,
    listening_started_at: 3500,
    patient_speech_started_at: 3800, // Patient interrupted 200ms before Smriti finished
    patient_speech_ended_at: 5000,
    stt_final_at: 5500,
    answer_finalized_at: 5600
  };

  const analysis = analyzeResponseTiming(timestamps);
  // Raw latency is negative, so flag should be set
  assert.ok(analysis.quality_flags.includes('patient_spoke_before_prompt_finished'));
  assert.equal(analysis.response_latency_ms, 0); // clamped to 0
});

// -------------------------------------------------------------
// 2. Multilingual Normalization Tests (English, Hindi, Marathi)
// -------------------------------------------------------------
test('normalization: Devanagari numeral conversion', () => {
  assert.equal(convertDevanagariNumerals('२०२६'), '2026');
  assert.equal(convertDevanagariNumerals('१५'), '15');
  assert.equal(convertDevanagariNumerals('२०'), '20');
  // No Devanagari — no change
  assert.equal(convertDevanagariNumerals('2026'), '2026');
});

test('normalization: year extraction supports Devanagari and 4-digit', () => {
  assert.equal(extractSpokenYear('the year is 2026'), 2026);
  assert.equal(extractSpokenYear('२०२६'), 2026);
  assert.equal(extractSpokenYear('two thousand twenty six'), 2026);
  assert.equal(extractSpokenYear('two thousand twenty five'), 2025);
  assert.equal(extractSpokenYear('दो हज़ार छब्बीस'), 2026);
  // Unrecognized → null
  assert.equal(extractSpokenYear('I do not know'), null);
});

test('normalization: month extraction by locale alias', () => {
  assert.equal(extractSpokenMonth('November', 'en-IN'), 11);
  assert.equal(extractSpokenMonth('नवंबर', 'hi-IN'), 11);
  assert.equal(extractSpokenMonth('नोव्हेंबर', 'mr-IN'), 11);
  assert.equal(extractSpokenMonth('जनवरी', 'hi-IN'), 1);
  assert.equal(extractSpokenMonth('डिसेंबर', 'mr-IN'), 12);
  assert.equal(extractSpokenMonth('January', 'en-IN'), 1);
});

test('normalization: backward count analysis detects errors and omissions', () => {
  // Perfect English countdown
  const perfectEn = '20 19 18 17 16 15 14 13 12 11 10 9 8 7 6 5 4 3 2 1';
  const evalPerfect = analyzeBackwardCount(perfectEn, 20, 1);
  assert.equal(evalPerfect.errorCount, 0);
  assert.equal(evalPerfect.isComplete, true);
  assert.equal(evalPerfect.omissions.length, 0);

  // Count with 1 omission (skipped 17)
  const oneOmission = '20 19 18 16 15 14 13 12 11 10 9 8 7 6 5 4 3 2 1';
  const evalOne = analyzeBackwardCount(oneOmission, 20, 1);
  assert.ok(evalOne.omissions.includes(17));

  // Hindi words countdown - should parse at least 15 numbers
  const hindiCount = 'बीस उन्नीस अठारह सत्रह सोलह पंद्रह चौदह तेरह बारह ग्यारह दस नौ आठ सात छह पांच चार तीन दो एक';
  const evalHi = analyzeBackwardCount(hindiCount, 20, 1);
  assert.ok(evalHi.numbersSpoken.length >= 15);
});

test('normalization: reverse months analysis flags order errors', () => {
  // English reverse months – no errors
  const monthsEn = 'December, November, October, September, August, July, June, May, April, March, February, January';
  const evalMonthsEn = analyzeReverseMonths(monthsEn, 'en-IN');
  assert.equal(evalMonthsEn.errorCount, 0);
  assert.equal(evalMonthsEn.monthsDetected.length, 12);

  // Forward order = many order errors
  const forwardOrder = 'January, February, March, April, May, June, July, August, September, October, November, December';
  const evalForward = analyzeReverseMonths(forwardOrder, 'en-IN');
  assert.ok(evalForward.orderErrors.length > 0);
});

test('normalization: address component matching', () => {
  // All 5 components recalled
  const targetComponents = ['John', 'Smith', '42', 'High Street', 'Bedford'];
  const spoken = 'John Smith 42 High Street Bedford';
  const result = matchAddressComponents(spoken, targetComponents);
  assert.equal(result.matchedCount, 5);
  assert.equal(result.missing.length, 0);

  // Partial recall
  const partial = 'John Smith lives on Bedford road';
  const partialResult = matchAddressComponents(partial, targetComponents);
  assert.ok(partialResult.recalled.includes('John'));
  assert.ok(partialResult.recalled.includes('Smith'));
  assert.ok(partialResult.recalled.includes('Bedford'));
  assert.ok(partialResult.missing.includes('42'));
});

// -------------------------------------------------------------
// 3. 6CIT Kingshill Error Scoring Tests (0 - 28 Scale)
// -------------------------------------------------------------
test('scoring: 6CIT Kingshill perfect recall = 0 error points', () => {
  // Build a timestamp whose *local* wall-clock time is exactly 12:00:00.
  // evaluateApproximateTime() uses getHours() / getMinutes() (local time), so
  // this makes the test timezone-agnostic regardless of where the CI runs.
  const d = new Date('2026-11-08T00:00:00');     // local midnight on the test date
  d.setHours(12, 0, 0, 0);                        // set to local noon
  const fakeSessionTime = d.getTime();

  // Perfect recall answers - must use the ORIGINAL_DEMO_ADDRESS components ('John', 'Smith', '42', 'High Street', 'Bedford')
  const perfectResponses = {
    '6cit_item_1': '2026',
    '6cit_item_2': 'November',
    '6cit_item_3': '12:00',
    '6cit_item_4': '20 19 18 17 16 15 14 13 12 11 10 9 8 7 6 5 4 3 2 1',
    '6cit_item_5': 'December, November, October, September, August, July, June, May, April, March, February, January',
    '6cit_stimulus': '',
    '6cit_item_6': 'John Smith 42 High Street Bedford'
  };

  const perfectResult = score6CIT(perfectResponses, fakeSessionTime, 'en-IN');
  assert.equal(perfectResult.totalScore, 0);
  assert.equal(perfectResult.maxScore, 28);
  assert.equal(perfectResult.scoringFormat, 'inverse_error_scale');
});

test('scoring: 6CIT Kingshill maximum error = 28 points', () => {
  const fakeSessionTime = new Date('2026-11-08T12:00:00Z').getTime();

  const wrongResponses = {
    '6cit_item_1': '1980',                    // 4 error pts
    '6cit_item_2': 'March',                   // 3 error pts (wrong month)
    '6cit_item_3': 'six in the evening',       // 3 error pts (6 hrs off from noon)
    '6cit_item_4': '1 2 3',                   // 4 error pts (ascending = all errors)
    '6cit_item_5': 'January February March',  // 4 error pts (ascending = all errors)
    '6cit_stimulus': '',
    '6cit_item_6': 'I cannot remember anything at all' // 10 error pts
  };

  const wrongResult = score6CIT(wrongResponses, fakeSessionTime, 'en-IN');
  assert.equal(wrongResult.totalScore, 28);
});

// -------------------------------------------------------------
// 4. MoCA Blind 22-Point Scoring Bookkeeping Tests
// -------------------------------------------------------------
test('scoring: MoCA Blind near-perfect score', () => {
  const perfectMoCAResponses = {
    'moca_mem_learn': 'ladder coconut pillow kite stream',
    'moca_attn_digits_fwd': '2 1 8 5 4',
    'moca_attn_digits_bwd': '2 4 7',
    'moca_attn_vigilance': 'yes yes yes',
    'moca_attn_subtraction': '93 86 79 72 65',
    'moca_lang_repeat_1': 'I only know that John is the one to help today',
    'moca_lang_repeat_2': 'The cat always hid under the couch when dogs were in the room',
    'moca_lang_fluency': 'cat dog elephant tiger lion monkey horse sheep goat deer bear fox',
    'moca_abstraction': 'they are both utensils for eating food',
    'moca_delayed_recall': 'ladder coconut pillow kite stream',
    'moca_orientation': 'Today is Sunday 8 November 2026 here in the clinic room in Mumbai'
  };

  const result = scoreMoCABlind(perfectMoCAResponses, false);
  assert.equal(result.maxScore, 22);
  assert.ok(result.totalScore >= 18, `Expected >=18 but got ${result.totalScore}`);
  assert.equal(result.scoringFormat, 'points_earned_scale');
  assert.equal(result.isOfficialScore, false); // Demo mode
});

// -------------------------------------------------------------
// 5. Session State Machine Transitions Tests
// -------------------------------------------------------------
test('state-machine: creates session in READY state at item index 0', () => {
  const session = createAssessmentSession({
    id: 'test-session-123',
    assignmentId: 'assign-456',
    patientId: 'patient-789',
    instrumentCode: 'six_cit_v1',
    locale: 'en-IN'
  });

  assert.equal(session.state, 'READY');
  assert.equal(session.currentItemIndex, 0);
  assert.equal(typeof session.responses, 'object');
});

test('state-machine: advance item records verbatim response and advances index', () => {
  const session = createAssessmentSession({
    id: 'test-session-sm',
    assignmentId: 'assign-sm',
    patientId: 'patient-sm',
    instrumentCode: 'six_cit_v1',
    locale: 'en-IN'
  });

  const mockTimestamps = {
    question_prepared_at: 1000,
    question_playback_started_at: 1200,
    question_playback_finished_at: 4000,
    listening_started_at: 4050,
    patient_speech_started_at: 5200,
    patient_speech_ended_at: 6500,
    stt_final_at: 7000,
    answer_finalized_at: 7100
  };

  const result = recordItemAnswerAndAdvance(session, {
    itemId: '6cit_item_1',
    verbatimTranscript: '2026',
    timestamps: mockTimestamps
  });

  assert.equal(result.session.currentItemIndex, 1);
  assert.equal(result.session.responses['6cit_item_1'].verbatimTranscript, '2026');
  assert.equal(result.isComplete, false);
  // State machine should move to QUESTION_PREPARING for next item
  assert.equal(result.session.state, 'QUESTION_PREPARING');
});

test('state-machine: handles ordinal item_N identifiers flexibly without stall', () => {
  const session = createAssessmentSession({
    id: 'test-session-flex',
    assignmentId: 'assign-flex',
    patientId: 'patient-flex',
    instrumentCode: 'six_cit_v1',
    locale: 'en-IN'
  });

  const mockTimestamps = {
    question_prepared_at: 1000,
    question_playback_started_at: 1200,
    question_playback_finished_at: 4000,
    listening_started_at: 4050,
    patient_speech_started_at: 5200,
    patient_speech_ended_at: 6500,
    stt_final_at: 7000,
    answer_finalized_at: 7100
  };

  // Client sending item_1 instead of canonical 6cit_item_1
  const result1 = recordItemAnswerAndAdvance(session, {
    itemId: 'item_1',
    verbatimTranscript: '2026',
    timestamps: mockTimestamps
  });

  assert.equal(result1.session.currentItemIndex, 1);
  assert.equal(result1.session.responses['6cit_item_1'].verbatimTranscript, '2026');
  assert.equal(result1.isComplete, false);

  // Client advancing to question 2 with item_2
  const result2 = recordItemAnswerAndAdvance(session, {
    itemId: 'item_2',
    verbatimTranscript: 'November',
    timestamps: mockTimestamps
  });

  assert.equal(result2.session.currentItemIndex, 2);
  assert.equal(result2.session.responses['6cit_item_2'].verbatimTranscript, 'November');
  assert.equal(result2.isComplete, false);
});

// -------------------------------------------------------------
// 6. Instrument Version & Accessibility Specification Tests
// -------------------------------------------------------------
test('instruments: defines version specifications and accessibility requirements', () => {
  const sixCit = findInstrument('six_cit_v1');
  assert.ok(sixCit);
  assert.ok(sixCit.availableVersions.length >= 1);
  assert.ok(sixCit.accessibilityRequirements.length >= 3);
  assert.equal(sixCit.electronicAdministrationApproved, false);

  const tics = findInstrument('tics_v1');
  assert.ok(tics);
  assert.ok(tics.availableVersions.length >= 2); // standard + tics_m
  assert.equal(tics.licensing.status, 'authorization_pending');
  assert.equal(tics.electronicAdministrationApproved, false);

  const moca = findInstrument('moca_blind_v1');
  assert.ok(moca);
  assert.equal(moca.licensing.status, 'authorization_pending');
  assert.equal(moca.electronicAdministrationApproved, false);

  for (const trial of TRIAL_ACTIVITIES) {
    assert.ok(trial.availableVersions.length >= 1);
    assert.ok(trial.accessibilityRequirements.length >= 2);
    assert.equal(trial.electronicAdministrationApproved, true);
  }
});

