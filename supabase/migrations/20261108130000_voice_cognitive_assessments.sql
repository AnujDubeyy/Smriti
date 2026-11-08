-- Support voice-based standardized cognitive assessments: 6CIT, TICS, MoCA Blind
-- alongside existing trial exercises.
BEGIN;

CREATE OR REPLACE FUNCTION public.smriti_doctor_assessments(operation text,input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE
 u uuid:=auth.uid();
 p uuid;
 task text;
 due date;
 assigned uuid;
 already uuid;
BEGIN
 IF u IS NULL OR NOT EXISTS (
  SELECT 1 FROM auth.users au JOIN public.app_users app ON app.id=au.id
   WHERE au.id=u AND app.onboarding_role='doctor' AND NOT au.is_anonymous
     AND au.email_confirmed_at IS NOT NULL
 ) THEN RAISE EXCEPTION 'doctor_only' USING errcode='42501';END IF;
 p:=(input->>'patient_id')::uuid;
 IF p IS NULL OR NOT EXISTS (
  SELECT 1 FROM smriti_private.doctor_qr_invites i
   JOIN public.patients pt ON pt.id=i.patient_id
   JOIN public.patient_memberships m ON m.patient_id=i.patient_id AND m.user_id=u
  WHERE i.patient_id=p AND i.created_by=u AND i.claimed_at IS NOT NULL
   AND pt.synthetic=true AND m.role='clinician' AND m.status='active'
   AND m.revoked_at IS NULL AND (m.valid_until IS NULL OR m.valid_until>now())
 ) OR NOT smriti_private.has_scope(p,'records:read') THEN
  RAISE EXCEPTION 'sharing_required' USING errcode='42501';END IF;
 IF operation='list' THEN
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'response_text',r.responses->>'response_text',
   'caregiver_observation',r.responses->>'caregiver_observation',
   'task_score',r.score_result->'task_score',
   'id',a.id,'instrument_code',a.instrument_code,'instrument_version',a.instrument_version,
   'locale',substring(coalesce(a.notes,'') from 'locale:([a-z]{2}-[A-Z]{2})'),
   'status',a.status,'due_date',a.due_date,'created_at',a.created_at,
   'submitted_at',(SELECT max(s.created_at) FROM public.assessment_submissions s WHERE s.assignment_id=a.id)
  ) ORDER BY a.created_at DESC) FROM public.assessment_assignments a
   LEFT JOIN LATERAL (SELECT responses,score_result FROM public.assessment_submissions sub WHERE sub.assignment_id=a.id AND sub.patient_id=p ORDER BY created_at DESC LIMIT 1) r ON true
   WHERE a.patient_id=p AND a.instrument_code IN (
    'smriti_word_repeat_v1','smriti_category_fluency_v1','smriti_orientation_v1',
    'six_cit_v1','tics_v1','moca_blind_v1'
   )),'[]'::jsonb);
 ELSIF operation='assign' THEN
  task:=input->>'instrument_code';
  IF task NOT IN (
   'smriti_word_repeat_v1','smriti_category_fluency_v1','smriti_orientation_v1',
   'six_cit_v1','tics_v1','moca_blind_v1'
  ) THEN
   RAISE EXCEPTION 'invalid_assessment' USING errcode='22023';END IF;
  IF input ? 'due_date' AND NULLIF(input->>'due_date','') IS NOT NULL THEN
   due:=(input->>'due_date')::date;
   IF due<current_date OR due>current_date+interval '180 days'
   THEN RAISE EXCEPTION 'invalid_due_date' USING errcode='22023';END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p::text,0));
  SELECT id INTO already FROM public.assessment_assignments
   WHERE patient_id=p AND instrument_code=task AND status IN ('assigned','in_progress')
   ORDER BY created_at DESC LIMIT 1;
  IF already IS NOT NULL THEN
   RAISE EXCEPTION 'assessment_already_assigned' USING errcode='23505';END IF;
  INSERT INTO public.assessment_assignments
   (patient_id,instrument_code,instrument_version,assigned_by,intended_respondent,due_date,notes,status)
  VALUES (
   p,
   task,
   COALESCE(NULLIF(input->>'instrument_version',''), '1.0'),
   u,
   'patient',
   due,
   'Voice-based assessment demonstration activity. locale:' || COALESCE(NULLIF(input->>'locale',''), 'en-IN'),
   'assigned'
  )
  RETURNING id INTO assigned;
  RETURN jsonb_build_object('id',assigned,'status','assigned');
 ELSE RAISE EXCEPTION 'invalid_operation' USING errcode='22023';
 END IF;
END;
$f$;

CREATE OR REPLACE FUNCTION public.smriti_caretaker_assessments(operation text,input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE
 u uuid:=auth.uid();
 p uuid;
 aid uuid;
 assignment_id_found uuid;
 answers jsonb;
 done_id uuid;
 activity text;
 points integer;
BEGIN
 p:=(input->>'patient_id')::uuid;
 IF u IS NULL OR p IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.patients pt
   JOIN public.patient_memberships m ON m.patient_id=pt.id AND m.user_id=u
   JOIN public.patient_authorities pa ON pa.patient_id=pt.id AND pa.user_id=u
  WHERE pt.id=p AND pt.synthetic=true AND pt.linked_user_id=u
   AND m.role='caregiver' AND m.status='active' AND m.revoked_at IS NULL
   AND (m.valid_until IS NULL OR m.valid_until>now())
   AND pa.revoked_at IS NULL
 ) OR NOT smriti_private.has_scope(p,'records:read') THEN
  RAISE EXCEPTION 'forbidden' USING errcode='42501';END IF;
 IF operation='list' THEN
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'response_text',r.responses->>'response_text',
   'caregiver_observation',r.responses->>'caregiver_observation',
   'task_score',r.score_result->'task_score',
   'id',a.id,'instrument_code',a.instrument_code,'instrument_version',a.instrument_version,
   'locale',substring(coalesce(a.notes,'') from 'locale:([a-z]{2}-[A-Z]{2})'),
   'status',a.status,'due_date',a.due_date,'created_at',a.created_at)
   ORDER BY a.created_at DESC)
   FROM public.assessment_assignments a
   LEFT JOIN LATERAL (SELECT responses,score_result FROM public.assessment_submissions sub WHERE sub.assignment_id=a.id AND sub.patient_id=p ORDER BY created_at DESC LIMIT 1) r ON true
   WHERE a.patient_id=p AND a.intended_respondent IN ('patient','caregiver')
    AND a.instrument_code IN (
     'smriti_word_repeat_v1','smriti_category_fluency_v1','smriti_orientation_v1',
     'six_cit_v1','tics_v1','moca_blind_v1'
    )
  ),'[]'::jsonb);
 ELSIF operation='submit' THEN
  aid:=(input->>'assignment_id')::uuid;
  answers:=input->'responses';
  IF answers IS NULL OR jsonb_typeof(answers)<>'object' OR length(trim(coalesce(answers->>'response_text',''))) NOT BETWEEN 1 AND 1500
    OR length(coalesce(answers->>'caregiver_observation',''))>1200
  THEN RAISE EXCEPTION 'invalid_assessment_response' USING errcode='22023';END IF;
  SELECT id,instrument_code INTO assignment_id_found,activity FROM public.assessment_assignments
   WHERE id=aid AND patient_id=p AND status='assigned'
    AND intended_respondent IN ('patient','caregiver')
    AND instrument_code IN (
     'smriti_word_repeat_v1','smriti_category_fluency_v1','smriti_orientation_v1',
     'six_cit_v1','tics_v1','moca_blind_v1'
    )
   FOR UPDATE;
  IF assignment_id_found IS NULL THEN
   RAISE EXCEPTION 'assessment_already_completed' USING errcode='23505';END IF;
  IF answers ? 'task_score' THEN
   IF jsonb_typeof(answers->'task_score') <> 'number' OR (answers->>'task_score') !~ '^[0-9]{1,3}$' THEN
    RAISE EXCEPTION 'invalid_assessment_response' USING errcode='22023';
   END IF;
   points:=(answers->>'task_score')::integer;
   IF points>(CASE activity WHEN 'smriti_word_repeat_v1' THEN 5 WHEN 'smriti_orientation_v1' THEN 2 WHEN 'six_cit_v1' THEN 28 WHEN 'moca_blind_v1' THEN 22 ELSE 200 END) THEN
    RAISE EXCEPTION 'invalid_assessment_response' USING errcode='22023';
   END IF;
  END IF;
  INSERT INTO public.assessment_submissions
   (assignment_id,patient_id,respondent_user_id,responses,score_result,status)
  VALUES (aid,p,u,answers-'task_score',jsonb_build_object('task_score',points,'scored',points IS NOT NULL,'clinical_interpretation',false),'submitted')
  RETURNING id INTO done_id;
  UPDATE public.assessment_assignments SET status='submitted',updated_at=now()
   WHERE id=aid;
  RETURN jsonb_build_object('submission_id',done_id,'status','submitted');
 ELSE RAISE EXCEPTION 'invalid_operation' USING errcode='22023';END IF;
END;
$f$;

COMMIT;
