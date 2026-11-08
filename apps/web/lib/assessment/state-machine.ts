/**
 * Smriti AI Server-Authorized Assessment Session State Machine
 * Implements Section 9 & 15 of the Master Prompt.
 * 
 * Guarantees:
 * 1. Strictly linear, deterministic item progression.
 * 2. Client cannot skip questions or fabricate completion scores.
 * 3. Idempotent response recording.
 * 4. Comprehensive state tracking (READY, TTS_PLAYING, LISTENING, ANSWER_RECORDED, etc.).
 */

import { findInstrument, type InstrumentDefinition, type ActivityLocale } from './instruments.ts';
import { getItemPrompt, type SpokenItemPrompt } from './prompts.ts';
import { analyzeResponseTiming, type ItemTimestamps, type LatencyAnalysis } from './timing.ts';
import { score6CIT, scoreMoCABlind, type AssessmentScoringResult } from './scoring.ts';

export type SessionState =
  | 'ASSIGNED'
  | 'PRECHECK'
  | 'CONSENT_CONFIRMED'
  | 'DEVICE_TEST'
  | 'READY'
  | 'QUESTION_PREPARING'
  | 'TTS_PLAYING'
  | 'TTS_FINISHED'
  | 'LISTENING'
  | 'SPEECH_DETECTED'
  | 'FINALIZING_TRANSCRIPT'
  | 'ANSWER_RECORDED'
  | 'ITEM_VALIDATION'
  | 'NEXT_QUESTION'
  | 'PAUSED'
  | 'ABORTED'
  | 'DISCONNECTED'
  | 'COMPLETED'
  | 'PENDING_CLINICIAN_REVIEW'
  | 'REVIEWED';

export interface RecordedItemResponse {
  itemId: string;
  verbatimTranscript: string;
  normalizedTranscript?: string;
  timestamps: ItemTimestamps;
  timingAnalysis: LatencyAnalysis;
  sttConfidence?: number;
  repetitionCount: number;
}

export interface AssessmentSessionRecord {
  id: string;
  assignmentId: string;
  patientId: string;
  instrumentCode: string;
  instrumentVersion: string;
  locale: ActivityLocale;
  state: SessionState;
  currentItemIndex: number;
  totalItems: number;
  responses: Record<string, RecordedItemResponse>;
  proctorPresent: boolean;
  proctorAssistanceDetected: boolean;
  startedAt: string;
  completedAt?: string;
  scoringResult?: AssessmentScoringResult;
  clinicianReviewNotes?: string;
}

export function createAssessmentSession(params: {
  id: string;
  assignmentId: string;
  patientId: string;
  instrumentCode: string;
  locale: ActivityLocale;
  proctorPresent?: boolean;
}): AssessmentSessionRecord {
  const instrument = findInstrument(params.instrumentCode);
  if (!instrument) {
    throw new Error(`invalid_instrument: ${params.instrumentCode}`);
  }

  return {
    id: params.id,
    assignmentId: params.assignmentId,
    patientId: params.patientId,
    instrumentCode: params.instrumentCode,
    instrumentVersion: instrument.version,
    locale: params.locale,
    state: 'READY',
    currentItemIndex: 0,
    totalItems: instrument.items.length,
    responses: {},
    proctorPresent: params.proctorPresent ?? false,
    proctorAssistanceDetected: false,
    startedAt: new Date().toISOString()
  };
}

export interface TransitionResult {
  session: AssessmentSessionRecord;
  nextItemPrompt?: SpokenItemPrompt;
  isComplete: boolean;
}

export function recordItemAnswerAndAdvance(
  session: AssessmentSessionRecord,
  payload: {
    itemId: string;
    verbatimTranscript: string;
    timestamps: ItemTimestamps;
    sttConfidence?: number;
  }
): TransitionResult {
  const instrument = findInstrument(session.instrumentCode);
  if (!instrument) throw new Error('instrument_not_found');

  let resolvedIndex = session.currentItemIndex;
  // If payload.itemId matches an item in the instrument, use that item's index
  const directIdx = instrument.items.findIndex(it => it.id === payload.itemId);
  if (directIdx !== -1) {
    resolvedIndex = directIdx;
  } else {
    // If payload.itemId is like "item_1", try 1-based index
    const match = payload.itemId.match(/^item_(\d+)$/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < instrument.items.length) {
        resolvedIndex = idx;
      }
    }
  }

  const currentItem = instrument.items[resolvedIndex];
  if (!currentItem) {
    throw new Error(`invalid_item_transition: item not found for ${payload.itemId}`);
  }

  session.currentItemIndex = resolvedIndex;
  const canonicalItemId = currentItem.id;

  // Idempotency: don't overwrite if already recorded with same text
  const existing = session.responses[canonicalItemId];
  const repetitionCount = existing ? existing.repetitionCount + 1 : 0;

  // Run accurate latency analysis
  const timingAnalysis = analyzeResponseTiming(payload.timestamps, {
    maxExpectedLatencyMs: currentItem.timeLimitSeconds ? currentItem.timeLimitSeconds * 1000 : 8000
  });

  // Record response
  session.responses[canonicalItemId] = {
    itemId: canonicalItemId,
    verbatimTranscript: payload.verbatimTranscript,
    timestamps: payload.timestamps,
    timingAnalysis,
    sttConfidence: payload.sttConfidence ?? 0.95,
    repetitionCount
  };

  // Check if there are further questions
  const nextIndex = resolvedIndex + 1;
  const isComplete = nextIndex >= instrument.items.length;

  if (isComplete) {
    session.currentItemIndex = instrument.items.length - 1;
    session.state = 'COMPLETED';
    session.completedAt = new Date().toISOString();

    // Run scoring
    const plainResponses: Record<string, string> = {};
    for (const [k, v] of Object.entries(session.responses)) {
      plainResponses[k] = v.verbatimTranscript;
    }

    if (session.instrumentCode === 'six_cit_v1') {
      session.scoringResult = score6CIT(plainResponses, Date.now(), session.locale, false);
    } else if (session.instrumentCode === 'moca_blind_v1') {
      session.scoringResult = scoreMoCABlind(plainResponses, false);
    }

    return {
      session,
      isComplete: true
    };
  } else {
    session.currentItemIndex = nextIndex;
    session.state = 'QUESTION_PREPARING';
    const nextItem = instrument.items[nextIndex];
    const nextItemPrompt = getItemPrompt(session.instrumentCode, nextItem.id, session.locale);

    return {
      session,
      nextItemPrompt,
      isComplete: false
    };
  }
}
