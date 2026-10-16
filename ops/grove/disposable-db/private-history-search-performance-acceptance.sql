-- Disposable PostgreSQL 17.6 ONLY; never run on a live Grove database.
-- Source-only proof that existing bounded ILIKE search can use trigram GIN
-- indexes, remain owner/project/conversation scoped, and not resurrect deletes.
-- This is NOT an approved migration. Live index placement, build cost and
-- rollback need separate review. Starts AFTER backup-replay fixture.
\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE INDEX grove_private_turns_user_search_trgm
  ON public.grove_private_turns USING gin (user_text public.gin_trgm_ops);
CREATE INDEX grove_private_turns_assistant_search_trgm
  ON public.grove_private_turns USING gin (assistant_text public.gin_trgm_ops);

-- Synthetic, non-sensitive older conversation rows.
INSERT INTO public.grove_private_turns (
  grove_user_id, firefly_project_id, firefly_conversation_id,
  request_id, user_text, assistant_text, reply_verification, created_at
)
SELECT
 '00000000-0000-4000-8000-000000000001'::uuid,
 '00000000-0000-4000-8000-000000000003'::uuid,
 '00000000-0000-4000-8000-000000000030'::uuid,
 ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 CASE WHEN n=501 THEN 'Ever After historical synthetic discovery'
      ELSE 'Archived synthetic user line ' || n::text END,
 CASE WHEN n=502 THEN 'Ever After older synthetic response'
      ELSE 'Archived synthetic answer line ' || n::text END,
 'unverified_model_text',
 '2025-06-01T12:00:00Z'::timestamptz + n * interval '1 second'
FROM generate_series(300,899) n;

ANALYZE public.grove_private_turns;

DO $verify_private_search$
DECLARE
  v_count integer;
  v_plan json;
  v_text text;
BEGIN
  -- Two matching rows, and NO access outside this one scope in the query.
  SELECT count(*) INTO v_count
  FROM public.grove_private_turns
  WHERE grove_user_id='00000000-0000-4000-8000-000000000001'::uuid
    AND firefly_project_id='00000000-0000-4000-8000-000000000003'::uuid
    AND firefly_conversation_id='00000000-0000-4000-8000-000000000030'::uuid
    AND (user_text ILIKE '%Ever After%' OR assistant_text ILIKE '%Ever After%');
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'private phrase search incorrect matched count: %', v_count;
  END IF;
  -- Permanently deleted conversation stays absent even after indexing.
  IF EXISTS (SELECT 1 FROM public.grove_private_turns
    WHERE grove_user_id='00000000-0000-4000-8000-000000000001'::uuid
      AND firefly_project_id='00000000-0000-4000-8000-000000000003'::uuid
      AND firefly_conversation_id='00000000-0000-4000-8000-000000000021'::uuid) THEN
    RAISE EXCEPTION 'indexed phrase lookup resurrected deleted conversation';
  END IF;
  -- ONLY proves trigram indexes can serve the ILIKE predicate when forced,
  -- separately from the strict-scope result correctness tested above.
  -- A small selective scoped query can rightly choose the existing btree
  -- index; this synthetic plan does NOT certify real-world selection or SLA.
  PERFORM pg_catalog.set_config('enable_seqscan','off',true);
  EXECUTE $q$EXPLAIN (FORMAT JSON)
   SELECT request_id FROM public.grove_private_turns
   WHERE user_text ILIKE '%Ever After%'
      OR assistant_text ILIKE '%Ever After%'$q$ INTO v_plan;
  v_text := v_plan::text;
  IF position('grove_private_turns_user_search_trgm' in v_text)=0 OR
     position('grove_private_turns_assistant_search_trgm' in v_text)=0 THEN
    RAISE EXCEPTION 'one or both private text search GIN indexes not in forced plan: %',
      left(v_text,600);
  END IF;
  RAISE NOTICE 'GROVE_PRIVATE_SEARCH_TRGM_ELIGIBLE=PASS; LIVE_PERFORMANCE=UNVERIFIED; LIVE_INDEX=HOLD';
END;
$verify_private_search$;

-- No backup provider, original tables, owner records or live settings touched.
