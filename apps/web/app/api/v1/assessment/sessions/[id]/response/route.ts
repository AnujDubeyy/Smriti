/**
 * POST /api/v1/assessment/sessions/[id]/response
 * Submits a spoken item response with full millisecond audio-boundary timestamps,
 * evaluates cognitive response latency, and advances the session state machine.
 */

import { z } from 'zod';
import { requireCare, CareError, failure } from '../../../../../../../lib/care';
import { json, sameOrigin, limitedBody } from '../../../../../../../lib/auth/http';
import { submitItemResponse, getAssessmentSession } from '../../../../../../../lib/assessment/session-store';
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
  item_id: z.string().min(1),
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

    const result = submitItemResponse({
      sessionId,
      itemId: input.item_id,
      verbatimTranscript: input.verbatim_transcript,
      timestamps: input.timestamps,
      sttConfidence: input.stt_confidence
    });

    const instrument = findInstrument(result.session.instrumentCode);
    const currentItem = instrument?.items[result.session.currentItemIndex];

    return json({
      session_id: sessionId,
      state: result.session.state,
      is_complete: result.isComplete,
      current_item_index: result.session.currentItemIndex,
      total_items: result.session.totalItems,
      next_item: !result.isComplete && currentItem ? {
        id: currentItem.id,
        title: currentItem.title,
        domain: currentItem.domain,
        timeLimitSeconds: currentItem.timeLimitSeconds,
        prompt: result.nextItemPrompt
      } : null,
      recorded_timing: result.session.responses[input.item_id]?.timingAnalysis,
      scoring: result.isComplete ? result.session.scoringResult : null
    });
  } catch (e) {
    return failure(e);
  }
}
