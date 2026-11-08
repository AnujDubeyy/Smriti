/**
 * POST /api/v1/assessment/sessions/start
 * Initializes a secure voice assessment session for a patient assignment.
 */

import { z } from 'zod';
import { requireCare, CareError, failure } from '../../../../../../lib/care';
import { json, sameOrigin, limitedBody } from '../../../../../../lib/auth/http';
import { startNewAssessmentSession } from '../../../../../../lib/assessment/session-store';
import { findInstrument, type ActivityLocale } from '../../../../../../lib/assessment/instruments';
import { getItemPrompt } from '../../../../../../lib/assessment/prompts';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

const startSchema = z.object({
  patient_id: z.string().min(1),
  assignment_id: z.string().min(1),
  instrument_code: z.string().min(1),
  locale: z.enum(['en-IN', 'hi-IN', 'mr-IN']),
  proctor_present: z.boolean().optional()
}).strict();

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new CareError('forbidden', 403);
    const raw = await limitedBody(request, 2000);
    if (!raw) throw new CareError('invalid_request', 400);

    const input = startSchema.parse(JSON.parse(raw));
    const instrument = findInstrument(input.instrument_code);
    if (!instrument) throw new CareError('invalid_assessment', 400);

    // Verify authenticated user has care permissions for patient
    if (process.env.SMRITI_LOCAL_DOCTOR_PREVIEW !== '1') {
      await requireCare();
    }

    const sessionId = randomUUID();
    const session = startNewAssessmentSession({
      sessionId,
      assignmentId: input.assignment_id,
      patientId: input.patient_id,
      instrumentCode: input.instrument_code,
      locale: input.locale as ActivityLocale,
      proctorPresent: input.proctor_present
    });

    const firstItem = instrument.items[0];
    const initialPrompt = firstItem ? getItemPrompt(input.instrument_code, firstItem.id, input.locale) : undefined;

    return json({
      session_id: sessionId,
      state: session.state,
      instrument: {
        code: instrument.code,
        title: instrument.title,
        category: instrument.category,
        totalItems: instrument.items.length,
        currentItemIndex: 0,
        currentItemId: firstItem?.id,
        currentDomain: firstItem?.domain,
        timeLimitSeconds: firstItem?.timeLimitSeconds
      },
      first_item: {
        id: firstItem?.id || '',
        index: 0,
        title: firstItem?.title || instrument.title,
        domain: firstItem?.domain || 'General',
        prompt: initialPrompt,
        time_limit_seconds: firstItem?.timeLimitSeconds
      },
      first_prompt: initialPrompt
    }, 201);
  } catch (e) {
    return failure(e);
  }
}
