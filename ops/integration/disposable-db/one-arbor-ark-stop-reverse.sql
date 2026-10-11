-- ORIGINAL ONE ARBOR RELEASE TASK: synthetically rehearse existing ARK STOP/resume
-- forward migration, effective service-role permissions, and routine removal.
-- Never run on hosted Supabase. No real task/objective IDs, worker or credential.
\set ON_ERROR_STOP on

CREATE TABLE public.ark_objectives (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  status text NOT NULL,
  blocker jsonb,
  version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ark_tasks (
  id uuid PRIMARY KEY,
  objective_id uuid NOT NULL REFERENCES public.ark_objectives(id),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  status text NOT NULL,
  result jsonb,
  available_at timestamptz,
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ark_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  objective_id uuid NOT NULL REFERENCES public.ark_objectives(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, UPDATE ON public.ark_objectives, public.ark_tasks TO service_role;
GRANT SELECT, INSERT ON public.ark_events TO service_role;
GRANT USAGE ON SEQUENCE public.ark_events_id_seq TO service_role;

INSERT INTO public.ark_objectives(id,user_id,project_id,status) VALUES
('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','running'),
('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','blocked'),
('00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','completed'),
('00000000-0000-4000-8000-000000000304','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','queued'),
('00000000-0000-4000-8000-000000000305','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000012','queued');

INSERT INTO public.ark_tasks(id,objective_id,user_id,project_id,status,lease_owner,lease_token,lease_expires_at,heartbeat_at) VALUES
('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','running','synthetic-worker','00000000-0000-4000-8000-000000000901',now()+interval '1 hour',now()),
('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','completed',NULL,NULL,NULL,NULL),
('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','blocked',NULL,NULL,NULL,NULL),
('00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','completed',NULL,NULL,NULL,NULL),
('00000000-0000-4000-8000-000000000405','00000000-0000-4000-8000-000000000304','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','queued',NULL,NULL,NULL,NULL);

-- Actual source migrations, unchanged. No live schema affected.
\ir ../../../supabase/migrations/20261006093000_ark_stop_and_resume_controls.sql
\ir ../../../supabase/migrations/20261007005500_add_ark_cancel_objective.sql

DO $access$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.ark_cancel_objective(uuid,timestamptz)',
    'public.ark_resume_blocked_objective(uuid,timestamptz)',
    'public.ark_cancel_objective(uuid,uuid,uuid,text,timestamptz)'
  ] LOOP
    IF has_function_privilege('anon',f,'EXECUTE')
      OR has_function_privilege('authenticated',f,'EXECUTE')
      OR NOT has_function_privilege('service_role',f,'EXECUTE')
    THEN RAISE EXCEPTION 'ark_routine_role_gate_failed: %',f; END IF;
  END LOOP;
END $access$;

BEGIN;
SET LOCAL ROLE service_role;
DO $effects$
DECLARE
  caught boolean;
BEGIN
  PERFORM public.ark_cancel_objective(
    '00000000-0000-4000-8000-000000000301',now());
  IF (SELECT status FROM public.ark_objectives WHERE id='00000000-0000-4000-8000-000000000301') <> 'cancelled'
    OR (SELECT status FROM public.ark_tasks WHERE id='00000000-0000-4000-8000-000000000401') <> 'cancelled'
    OR (SELECT lease_owner IS NOT NULL OR lease_token IS NOT NULL FROM public.ark_tasks
      WHERE id='00000000-0000-4000-8000-000000000401')
    OR (SELECT status FROM public.ark_tasks WHERE id='00000000-0000-4000-8000-000000000402') <> 'completed'
  THEN RAISE EXCEPTION 'STOP_failed_lease_or_completed_task_invariant'; END IF;

  PERFORM public.ark_cancel_objective(
    '00000000-0000-4000-8000-000000000301',now());
  IF (SELECT count(*) FROM public.ark_events WHERE objective_id='00000000-0000-4000-8000-000000000301') <> 1
  THEN RAISE EXCEPTION 'STOP_retry_created_duplicate_event'; END IF;

  PERFORM public.ark_resume_blocked_objective(
    '00000000-0000-4000-8000-000000000302',now());
  IF (SELECT status FROM public.ark_tasks WHERE id='00000000-0000-4000-8000-000000000403') <> 'queued'
    OR (SELECT status FROM public.ark_tasks WHERE id='00000000-0000-4000-8000-000000000404') <> 'completed'
    OR (SELECT status FROM public.ark_objectives WHERE id='00000000-0000-4000-8000-000000000302') <> 'queued'
  THEN RAISE EXCEPTION 'resume_did_not_preserve_completed_task'; END IF;

  caught := false;
  BEGIN
    PERFORM public.ark_resume_blocked_objective(
      '00000000-0000-4000-8000-000000000302',now());
  EXCEPTION WHEN SQLSTATE '40001' THEN caught := true;
  END;
  IF NOT caught THEN RAISE EXCEPTION 'resume_accepted_nonblocked_objective'; END IF;

  caught := false;
  BEGIN
    PERFORM public.ark_cancel_objective(
      '00000000-0000-4000-8000-000000000303',now());
  EXCEPTION WHEN SQLSTATE '40001' THEN caught := true;
  END;
  IF NOT caught THEN RAISE EXCEPTION 'completed_objective_could_be_cancelled'; END IF;

  caught := false;
  BEGIN
    PERFORM public.ark_cancel_objective(
      '00000000-0000-4000-8000-000000000304',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000011',
      'synthetic STOP',now());
  EXCEPTION WHEN SQLSTATE '42501' THEN caught := true;
  END;
  IF NOT caught THEN RAISE EXCEPTION 'foreign_user_was_allowed_to_cancel'; END IF;

  PERFORM public.ark_cancel_objective(
    '00000000-0000-4000-8000-000000000304',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    'synthetic STOP',now());
  IF (SELECT status FROM public.ark_tasks WHERE id='00000000-0000-4000-8000-000000000405') <> 'cancelled'
  THEN RAISE EXCEPTION 'owned_explicit_STOP_did_not_cancel_task'; END IF;
  IF (SELECT count(*) FROM public.ark_events) <> 3
  THEN RAISE EXCEPTION 'unexpected_event_history_after_stop_resume'; END IF;
END $effects$;
COMMIT;

-- Reverse newly introduced RPCs ONLY. Never roll back completed real actions.
DROP FUNCTION public.ark_cancel_objective(uuid,timestamptz);
DROP FUNCTION public.ark_cancel_objective(uuid,uuid,uuid,text,timestamptz);
DROP FUNCTION public.ark_resume_blocked_objective(uuid,timestamptz);

DO $reverse$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname IN ('ark_cancel_objective','ark_resume_blocked_objective')
    AND pronamespace='public'::regnamespace)
  THEN RAISE EXCEPTION 'ark_routines_not_removed_by_reversal'; END IF;
  IF (SELECT count(*) FROM public.ark_objectives) <> 5
     OR (SELECT count(*) FROM public.ark_tasks) <> 5
     OR (SELECT count(*) FROM public.ark_events) <> 3
  THEN RAISE EXCEPTION 'reversal_erased_committed_synthetic_history'; END IF;
END $reverse$;
\echo ONE_ARBOR_ARK_STOP_RESUME_FORWARD_REVERSE_SYNTHETIC_PASS
