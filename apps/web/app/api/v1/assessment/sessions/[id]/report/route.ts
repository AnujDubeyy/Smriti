/**
 * GET /api/v1/assessment/sessions/[id]/report
 * Produces comprehensive doctor assessment report with timeline visualizations,
 * item-by-item breakdown, latency evidence, and clinical disclosures.
 */

import { requireCare, CareError, failure } from '../../../../../../../lib/care';
import { json, sameOrigin } from '../../../../../../../lib/auth/http';
import { getAssessmentSession } from '../../../../../../../lib/assessment/session-store';
import { findInstrument } from '../../../../../../../lib/assessment/instruments';
import { buildTimelineSegments } from '../../../../../../../lib/assessment/timing';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    if (process.env.SMRITI_LOCAL_DOCTOR_PREVIEW !== '1') {
      await requireCare();
    }

    const session = getAssessmentSession(sessionId);
    if (!session) throw new CareError('session_not_found', 404);

    const instrument = findInstrument(session.instrumentCode);
    if (!instrument) throw new CareError('instrument_not_found', 404);

    // Build timeline visualization for each item
    const itemReports = Object.values(session.responses).map(resp => {
      const itemDef = instrument.items.find(i => i.id === resp.itemId);
      const timeline = buildTimelineSegments(resp.timingAnalysis);

      return {
        item_id: resp.itemId,
        title: itemDef?.title || resp.itemId,
        domain: itemDef?.domain || 'General',
        verbatim_transcript: resp.verbatimTranscript,
        normalized_transcript: resp.normalizedTranscript,
        timing: {
          response_latency_ms: resp.timingAnalysis.response_latency_ms,
          response_span_ms: resp.timingAnalysis.response_span_ms,
          stt_processing_delay_ms: resp.timingAnalysis.stt_processing_delay_ms,
          tts_total_duration_ms: resp.timingAnalysis.tts_total_duration_ms,
          prompt_playback_duration_ms: resp.timingAnalysis.prompt_playback_duration_ms,
          quality_flags: resp.timingAnalysis.quality_flags
        },
        timeline,
        confidence: resp.sttConfidence ?? 0.95
      };
    });

    return json({
      session_id: session.id,
      patient_id: session.patientId,
      instrument: {
        code: instrument.code,
        title: instrument.title,
        version: instrument.version,
        category: instrument.category,
        licensing: instrument.licensing
      },
      locale: session.locale,
      state: session.state,
      started_at: session.startedAt,
      completed_at: session.completedAt,
      is_valid: session.state === 'COMPLETED' && !session.proctorAssistanceDetected,
      scoring: session.scoringResult || null,
      items: itemReports,
      proctor: {
        present: session.proctorPresent,
        assistance_detected: session.proctorAssistanceDetected
      },
      clinical_disclaimer: 'Exploratory speech and response observations — not validated diagnostic biomarkers. Review all audio evidence and verbatim transcripts before clinical determination.'
    });
  } catch (e) {
    return failure(e);
  }
}
