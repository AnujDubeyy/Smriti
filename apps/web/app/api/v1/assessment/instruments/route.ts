/**
 * GET /api/v1/assessment/instruments
 * Returns available assessment instruments, versions, licensing disclosures and trial activities.
 */

import { json } from '../../../../../lib/auth/http';
import { ALL_INSTRUMENTS, TRIAL_ACTIVITIES, STANDARDIZED_INSTRUMENTS } from '../../../../../lib/assessment/instruments';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json({
    trial_activities: TRIAL_ACTIVITIES,
    standardized_instruments: STANDARDIZED_INSTRUMENTS,
    all_instruments: ALL_INSTRUMENTS
  });
}
