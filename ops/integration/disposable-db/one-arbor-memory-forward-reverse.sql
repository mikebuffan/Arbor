-- BOUNDED ONE ARBOR RELEASE REHEARSAL — SYNTHETIC PG+PGVECTOR ONLY.
-- This is NOT a migration and MUST NOT be run on any hosted database.
-- Simulate the exact production 5-arg memory function/ACL -> source migration -> restore.
\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS vector;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.memory_items (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid,
  conversation_id uuid,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  tier text NOT NULL DEFAULT 'normal',
  scope text NOT NULL,
  user_trigger_only boolean NOT NULL DEFAULT false,
  importance integer NOT NULL DEFAULT 5,
  confidence numeric NOT NULL DEFAULT 0.9,
  locked boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  deleted_at timestamptz,
  last_seen_at timestamptz,
  last_reinforced_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  excluded_from_memory boolean NOT NULL DEFAULT false,
  embedding vector(1536)
);
ALTER TABLE public.memory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY synthetic_owner_read ON public.memory_items
  FOR SELECT TO authenticated
  USING (user_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);
GRANT SELECT ON public.memory_items TO anon, authenticated, service_role;

-- All identities below are fictitious, and each vector is synthetic.
INSERT INTO public.memory_items (
  id,user_id,project_id,conversation_id,key,scope,excluded_from_memory,status,embedding
) VALUES
  ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001',NULL,NULL,
   'global','global',false,'active',array_fill(1.0::real,ARRAY[1536])::vector(1536)),
  ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011',NULL,
   'project','project',false,'active',array_fill(1.0::real,ARRAY[1536])::vector(1536)),
  ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021',
   'conversation','conversation',false,'active',array_fill(1.0::real,ARRAY[1536])::vector(1536)),
  ('00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021',
   'excluded','conversation',true,'active',array_fill(1.0::real,ARRAY[1536])::vector(1536)),
  ('00000000-0000-4000-8000-000000000105','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012',NULL,
   'other_project','project',false,'active',array_fill(1.0::real,ARRAY[1536])::vector(1536)),
  ('00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000022',
   'other_conversation','conversation',false,'active',array_fill(1.0::real,ARRAY[1536])::vector(1536)),
  ('00000000-0000-4000-8000-000000000107','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000011',NULL,
   'other_user','project',false,'active',array_fill(1.0::real,ARRAY[1536])::vector(1536)),
  ('00000000-0000-4000-8000-000000000108','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011',NULL,
   'inactive','project',false,'superseded',array_fill(1.0::real,ARRAY[1536])::vector(1536));

-- Replay the exact read-only captured production function definition and ACL.
\ir one-arbor-memory-production-baseline.sql

DO $baseline$
BEGIN
  IF NOT has_function_privilege('anon','public.match_memories_v3(uuid,uuid,uuid,vector,integer)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.match_memories_v3(uuid,uuid,uuid,vector,integer)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.match_memories_v3(uuid,uuid,uuid,vector,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'baseline_function_acl_mismatch'; END IF;
  IF position('DEFAULT 24' in pg_get_functiondef(
      'public.match_memories_v3(uuid,uuid,uuid,vector,integer)'::regprocedure)) = 0
  THEN RAISE EXCEPTION 'baseline_default_not_restored'; END IF;
END $baseline$;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $old_read$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.match_memories_v3(
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000021',
    array_fill(1.0::real,ARRAY[1536])::vector(1536),40);
  IF n <> 4 THEN RAISE EXCEPTION 'baseline_visible_count_expected_4_got_%',n; END IF;
END $old_read$;
COMMIT;

-- Apply the ACTUAL candidate SQL in this disposable database only.
\ir ../../../supabase/migrations/20261007013000_restore_conversation_aware_match_memories_v3.sql

DO $forward_acl$
BEGIN
  IF has_function_privilege('anon','public.match_memories_v3(uuid,uuid,uuid,vector,integer)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.match_memories_v3(uuid,uuid,uuid,vector,integer)','EXECUTE')
     OR has_function_privilege('service_role','public.match_memories_v3(uuid,uuid,uuid,vector,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'forward_function_acl_did_not_narrow'; END IF;
  IF position('DEFAULT 40' in pg_get_functiondef(
      'public.match_memories_v3(uuid,uuid,uuid,vector,integer)'::regprocedure)) = 0
  THEN RAISE EXCEPTION 'forward_default_not_changed'; END IF;
END $forward_acl$;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $owner_forward$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.match_memories_v3(
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000021',
    array_fill(1.0::real,ARRAY[1536])::vector(1536),40);
  IF n <> 3 THEN RAISE EXCEPTION 'forward_visible_count_expected_3_got_%',n; END IF;
  IF EXISTS (SELECT 1 FROM public.match_memories_v3(
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000021',
    array_fill(1.0::real,ARRAY[1536])::vector(1536),40)
    WHERE key IN ('excluded','other_project','other_conversation','other_user','inactive'))
  THEN RAISE EXCEPTION 'forward_scope_or_exclusion_violation'; END IF;
END $owner_forward$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
DO $foreign_forward$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.match_memories_v3(
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000021',
    array_fill(1.0::real,ARRAY[1536])::vector(1536),40);
  IF n <> 0 THEN RAISE EXCEPTION 'foreign_caller_bypassed_RLS'; END IF;
END $foreign_forward$;
COMMIT;

-- Recovery only in this disposable fixture: restore original function text+ACL.
\ir one-arbor-memory-production-baseline.sql

DO $reversal_acl$
BEGIN
  IF NOT has_function_privilege('anon','public.match_memories_v3(uuid,uuid,uuid,vector,integer)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.match_memories_v3(uuid,uuid,uuid,vector,integer)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.match_memories_v3(uuid,uuid,uuid,vector,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'reversal_function_acl_not_restored'; END IF;
  IF position('DEFAULT 24' in pg_get_functiondef(
      'public.match_memories_v3(uuid,uuid,uuid,vector,integer)'::regprocedure)) = 0
  THEN RAISE EXCEPTION 'reversal_default_not_restored'; END IF;
  IF (SELECT count(*) FROM public.memory_items) <> 8
  THEN RAISE EXCEPTION 'synthetic_rows_lost_during_rehearsal'; END IF;
END $reversal_acl$;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $old_recovered$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.match_memories_v3(
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000021',
    array_fill(1.0::real,ARRAY[1536])::vector(1536),40);
  IF n <> 4 THEN RAISE EXCEPTION 'reversal_old_behavior_not_restored'; END IF;
END $old_recovered$;
COMMIT;

\echo ONE_ARBOR_MEMORY_FUNCTION_FORWARD_REVERSE_SYNTHETIC_PASS
