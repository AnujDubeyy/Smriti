/**
 * Smriti AI Voice Assessment In-Memory & Cache Store
 * Maintains active assessment sessions with monotonic state machines and idempotency.
 */

import {
  type AssessmentSessionRecord,
  createAssessmentSession,
  recordItemAnswerAndAdvance,
  type TransitionResult
} from './state-machine.ts';
import type { ActivityLocale } from './instruments.ts';
import type { ItemTimestamps } from './timing.ts';

const sessionStore = new Map<string, AssessmentSessionRecord>();

export function getAssessmentSession(idOrAssignmentId: string): AssessmentSessionRecord | undefined {
  const direct = sessionStore.get(idOrAssignmentId);
  if (direct) return direct;
  for (const session of sessionStore.values()) {
    if (session.assignmentId === idOrAssignmentId) {
      return session;
    }
  }
  return undefined;
}

export function saveAssessmentSession(session: AssessmentSessionRecord): void {
  sessionStore.set(session.id, session);
}

export function startNewAssessmentSession(params: {
  sessionId: string;
  assignmentId: string;
  patientId: string;
  instrumentCode: string;
  locale: ActivityLocale;
  proctorPresent?: boolean;
}): AssessmentSessionRecord {
  const session = createAssessmentSession({
    id: params.sessionId,
    assignmentId: params.assignmentId,
    patientId: params.patientId,
    instrumentCode: params.instrumentCode,
    locale: params.locale,
    proctorPresent: params.proctorPresent
  });
  sessionStore.set(params.sessionId, session);
  return session;
}

export function submitItemResponse(params: {
  sessionId: string;
  itemId: string;
  verbatimTranscript: string;
  timestamps: ItemTimestamps;
  sttConfidence?: number;
}): TransitionResult {
  const session = sessionStore.get(params.sessionId);
  if (!session) {
    throw new Error('session_not_found');
  }

  const result = recordItemAnswerAndAdvance(session, {
    itemId: params.itemId,
    verbatimTranscript: params.verbatimTranscript,
    timestamps: params.timestamps,
    sttConfidence: params.sttConfidence
  });

  sessionStore.set(params.sessionId, result.session);
  return result;
}

export function updateSessionStatus(
  sessionId: string,
  state: AssessmentSessionRecord['state'],
  notes?: string
): AssessmentSessionRecord {
  const session = sessionStore.get(sessionId);
  if (!session) throw new Error('session_not_found');
  session.state = state;
  if (notes) session.clinicianReviewNotes = notes;
  sessionStore.set(sessionId, session);
  return session;
}
