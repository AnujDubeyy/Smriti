/**
 * POST /api/v1/assessment/sessions/[id]/response
 * Submits a spoken item response with full millisecond audio-boundary timestamps,
 * evaluates cognitive response latency, and advances the session state machine.
 */

import { z } from 'zod';
import { requireCare, CareError, failure } from '../../../../../../../lib/care';
import { json, sameOrigin, limitedBody } from '../../../../../../../lib/auth/http';
import { authenticatedClient } from '../../../../../../../lib/auth/access';
import { submitItemResponse, getAssessmentSession, startNewAssessmentSession } from '../../../../../../../lib/assessment/session-store';
import { findInstrument } from '../../../../../../../lib/assessment/instruments';

export const dynamic = 'force-dynamic';

const timestampsSchema = z.object({
  question_prepared_at: z.number().positive(),
  tts_generation_started_at: z.number().positive().optional(),
  tts_audio_received_at: z.number().positive().optional(),
  question_playback_started_at: z.number().positive(),
  question_playback_finished_at: z.number().positive(),
  listening_started_at: z.number().positive(),
  patient_speech_started_at: z.number().positive(),
  patient_speech_ended_at: z.number().positive(),
  vad_endpoint_at: z.number().positive().optional(),
  stt_first_partial_at: z.number().positive().optional(),
  stt_final_at: z.number().positive(),
  answer_finalized_at: z.number().positive()
}).strict();

const responseSchema = z.object({
  item_id: z.string().optional(),
  instrument_code: z.string().optional(),
  locale: z.enum(['en-IN', 'hi-IN', 'mr-IN']).optional(),
  item_index: z.number().int().min(0).optional(),
  patient_id: z.string().optional(),
  assignment_id: z.string().optional(),
  verbatim_transcript: z.string().default(''),
  timestamps: timestampsSchema,
  stt_confidence: z.number().min(0).max(1).optional()
}).strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!sameOrigin(request)) throw new CareError('forbidden', 403);
    const { id: sessionId } = await params;
    const raw = await limitedBody(request, 10000);
    if (!raw) throw new CareError('invalid_request', 400);

    const input = responseSchema.parse(JSON.parse(raw));
    if (process.env.SMRITI_LOCAL_DOCTOR_PREVIEW !== '1') {
      await requireCare();
    }

    let session = getAssessmentSession(sessionId);
    if (!session) {
      // In serverless environments, if in-memory session was evicted or on a different lambda instance,
      // reconstruct session state dynamically from request metadata.
      const instrumentCode = input.instrument_code || 'six_cit_v1';
      const locale = input.locale || 'en-IN';
      const patientId = input.patient_id || 'patient-session';
      const assignmentId = input.assignment_id || sessionId;

      session = startNewAssessmentSession({
        sessionId,
        assignmentId,
        patientId,
        instrumentCode,
        locale
      });

      if (typeof input.item_index === 'number') {
        session.currentItemIndex = input.item_index;
      }
    }

    const instrument = findInstrument(session.instrumentCode);
    const currentItem = instrument?.items[session.currentItemIndex];
    const itemIdToUse = input.item_id || currentItem?.id || `item_${session.currentItemIndex + 1}`;

    const result = submitItemResponse({
      sessionId,
      itemId: itemIdToUse,
      verbatimTranscript: input.verbatim_transcript,
      timestamps: input.timestamps,
      sttConfidence: input.stt_confidence
    });

    const nextItem = instrument?.items[result.session.currentItemIndex];

    if (result.isComplete) {
      try {
        const auth = await authenticatedClient();
        if (auth.client && session.assignmentId) {
          await auth.client.rpc('smriti_caretaker_assessments', {
            operation: 'submit',
            input: {
              patient_id: session.patientId,
              assignment_id: session.assignmentId,
              responses: {
                task_score: result.session.scoringResult?.totalScore ?? 0,
                response_text: `Completed voice assessment: ${session.instrumentCode}`,
                caregiver_observation: 'Completed via hands-free voice assessment session.'
              }
            }
          });
        }
      } catch {
        // Non-fatal: submission RPC can be finalized by caretaker or report endpoint
      }
    }

    return json({
      session_id: sessionId,
      state: result.session.state,
      is_complete: result.isComplete,
      current_item_index: result.session.currentItemIndex,
      total_items: result.session.totalItems,
      next_item: !result.isComplete && nextItem ? {
        id: nextItem.id,
        title: nextItem.title,
        domain: nextItem.domain,
        timeLimitSeconds: nextItem.timeLimitSeconds,
        prompt: result.nextItemPrompt
      } : null,
      recorded_timing: result.session.responses[itemIdToUse]?.timingAnalysis,
      scoring: result.isComplete ? result.session.scoringResult : null
    });
  } catch (e) {
    return failure(e);
  }
}
