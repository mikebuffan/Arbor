-- Disposable PostgreSQL acceptance ONLY.
-- Never apply synthetic identities/roles to a live project.
\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE TABLE public.arbor_pattern_hop_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  conversation_id uuid,
  objective text not null,
  seed jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','complete','blocked','exhausted')),
  max_depth integer not null default 6 check (max_depth between 1 and 32),
  frontier jsonb not null default '[]'::jsonb,
  visited jsonb not null default '[]'::jsonb,
  exhausted_branches jsonb not null default '[]'::jsonb,
  completed_branches jsonb not null default '[]'::jsonb,
  blocker text,
  verification_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mirror the hosted Preview table's owner-scoped RLS closely enough to prove
-- that the proposed control RPCs work as SECURITY INVOKER, not by bypassing RLS.
CREATE SCHEMA auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $uid$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$uid$;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role;

ALTER TABLE public.arbor_pattern_hop_runs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.arbor_pattern_hop_runs TO authenticated, service_role;

CREATE POLICY pattern_hop_runs_select_own
ON public.arbor_pattern_hop_runs FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY pattern_hop_runs_update_own
ON public.arbor_pattern_hop_runs FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

\ir ../../../docs/migrations/PROPOSED_pattern_hop_run_control_20261006.sql

DO $acceptance$
DECLARE
  alice uuid := '11111111-1111-4111-8111-111111111111';
  bob uuid := '22222222-2222-4222-8222-222222222222';
  project_id uuid := '33333333-3333-4333-8333-333333333333';
  run_id uuid := '44444444-4444-4444-8444-444444444444';
  r jsonb;
  token uuid;
  value text;
BEGIN
  INSERT INTO public.arbor_pattern_hop_runs(
    id,user_id,project_id,objective,seed,status,max_depth,frontier,visited,
    exhausted_branches,completed_branches,verification_state
  ) VALUES (
    run_id,alice,project_id,'synthetic run','{"clue":"agency"}','active',2,
    '[{"evidenceId":"seed","clue":"agency","depth":0,"branch":"direct_matches"}]',
    '[]','[]','[]','{}'
  );

  PERFORM set_config('request.jwt.claim.role','service_role',false);
  PERFORM set_config('request.jwt.claim.sub','',false);

  r := public.arbor_pattern_hop_claim_run(
    run_id,alice,project_id,'worker-a',90000);
  IF r->>'status' <> 'claimed' THEN
    RAISE EXCEPTION 'first run lease not claimed: %',r;
  END IF;
  token := (r->>'leaseToken')::uuid;

  r := public.arbor_pattern_hop_claim_run(
    run_id,alice,project_id,'worker-b',90000);
  IF r->>'status' <> 'in_progress' THEN
    RAISE EXCEPTION 'second continuation was not fenced: %',r;
  END IF;

  -- RPC must clear its internal trigger bypass before returning.
  BEGIN
    UPDATE public.arbor_pattern_hop_runs
      SET stop_requested_at=clock_timestamp()
      WHERE id=run_id;
    RAISE EXCEPTION 'direct control-column update bypassed RPC guard';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  value := public.arbor_pattern_hop_request_stop(run_id,alice,project_id);
  IF value <> 'requested' THEN
    RAISE EXCEPTION 'durable STOP not requested: %',value;
  END IF;
  IF (SELECT stop_requested_at FROM public.arbor_pattern_hop_runs
      WHERE id=run_id) IS NULL THEN
    RAISE EXCEPTION 'STOP latch was not durable';
  END IF;

  r := public.arbor_pattern_hop_heartbeat_run(
    run_id,alice,project_id,'worker-a',token,90000);
  IF r->>'status' <> 'stopped' THEN
    RAISE EXCEPTION 'active worker did not observe STOP: %',r;
  END IF;

  value := public.arbor_pattern_hop_resume_run(run_id,alice,project_id);
  IF value <> 'in_progress' THEN
    RAISE EXCEPTION 'resume cleared STOP while active lease remained: %',value;
  END IF;

  value := public.arbor_pattern_hop_release_run(
    run_id,alice,project_id,'worker-a',token);
  IF value <> 'released' THEN
    RAISE EXCEPTION 'lease release failed: %',value;
  END IF;

  IF (SELECT stop_requested_at FROM public.arbor_pattern_hop_runs
      WHERE id=run_id) IS NULL THEN
    RAISE EXCEPTION 'lease release silently cleared STOP';
  END IF;

  value := public.arbor_pattern_hop_resume_run(run_id,alice,project_id);
  IF value <> 'resumed' THEN
    RAISE EXCEPTION 'explicit resume did not clear STOP: %',value;
  END IF;
  IF (SELECT stop_requested_at FROM public.arbor_pattern_hop_runs
      WHERE id=run_id) IS NOT NULL THEN
    RAISE EXCEPTION 'resume receipt returned but STOP remained';
  END IF;

  -- Authenticated callers can control only their own run identity.
  PERFORM set_config('request.jwt.claim.role','authenticated',false);
  PERFORM set_config('request.jwt.claim.sub',bob::text,false);
  r := public.arbor_pattern_hop_claim_run(
    run_id,alice,project_id,'foreign-worker',90000);
  IF r->>'status' <> 'no_access' THEN
    RAISE EXCEPTION 'foreign authenticated identity claimed run: %',r;
  END IF;

  PERFORM set_config('request.jwt.claim.sub',alice::text,false);
  r := public.arbor_pattern_hop_claim_run(
    run_id,alice,project_id,'worker-c',90000);
  IF r->>'status' <> 'claimed' THEN
    RAISE EXCEPTION 'owner could not reclaim resumed run: %',r;
  END IF;
  token := (r->>'leaseToken')::uuid;
  value := public.arbor_pattern_hop_release_run(
    run_id,alice,project_id,'worker-c',token);
  IF value <> 'released' THEN
    RAISE EXCEPTION 'owner release after resume failed: %',value;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname LIKE 'arbor_pattern_hop_%'
      AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'Pattern Hop control proposal unexpectedly retained SECURITY DEFINER';
  END IF;

  RAISE NOTICE 'PATTERN_HOP_RUN_CONTROL=PASS; LIVE_MIGRATION=HOLD';
END
$acceptance$;

-- Exercise the same RPCs under the actual authenticated database role so the
-- acceptance fails if SECURITY INVOKER no longer composes with owner RLS.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);

DO $foreign_invoker$
DECLARE
  r jsonb;
BEGIN
  r := public.arbor_pattern_hop_claim_run(
    '44444444-4444-4444-8444-444444444444',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'foreign-authenticated-worker',
    90000
  );
  IF r->>'status' <> 'no_access' THEN
    RAISE EXCEPTION 'foreign authenticated SECURITY INVOKER claim was not denied: %', r;
  END IF;
END
$foreign_invoker$;

SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);

DO $owner_invoker$
DECLARE
  r jsonb;
  token uuid;
  value text;
BEGIN
  r := public.arbor_pattern_hop_claim_run(
    '44444444-4444-4444-8444-444444444444',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'owner-authenticated-worker',
    90000
  );
  IF r->>'status' <> 'claimed' THEN
    RAISE EXCEPTION 'owner authenticated SECURITY INVOKER claim failed: %', r;
  END IF;
  token := (r->>'leaseToken')::uuid;
  value := public.arbor_pattern_hop_release_run(
    '44444444-4444-4444-8444-444444444444',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'owner-authenticated-worker',
    token
  );
  IF value <> 'released' THEN
    RAISE EXCEPTION 'owner authenticated SECURITY INVOKER release failed: %', value;
  END IF;
END
$owner_invoker$;

RESET ROLE;
