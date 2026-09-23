-- Disposable PostgreSQL fixture ONLY. Never apply to The Grove, Firefly,
-- ARK Preview, or any existing user database. All IDs/content are synthetic.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

-- Recreate only a harmless synthetic auth.users identity provider and stub
-- auth.uid() function. Apply the EXACT original Grove owner+bridge migrations
-- before the transcript proposal; this catches real cross-file DDL drift.
-- NEVER apply synthetic auth objects or synthetic identities to live Supabase.
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
\ir ../../../supabase/grove/migrations/20260922035539_grove_private_owner_access.sql
\ir ../../../supabase/grove/migrations/20260922042500_grove_private_firefly_read_grants.sql

-- Run the EXACT proposed migration, not an independently recreated table.
\ir ../../../docs/migrations/PROPOSED_grove_private_turns_20260923.sql
\ir ../../../docs/migrations/PROPOSED_grove_private_turn_claims_20260923.sql

DO $acceptance$
DECLARE
  alice uuid := '00000000-0000-4000-8000-000000000001';
  bob uuid := '00000000-0000-4000-8000-000000000002';
  project_a uuid := '00000000-0000-4000-8000-000000000003';
  project_b uuid := '00000000-0000-4000-8000-000000000004';
  conversation uuid := '00000000-0000-4000-8000-000000000005';
  retry_id uuid := '00000000-0000-4000-8000-000000000006';
BEGIN
  IF to_regclass('public.grove_private_turns') IS NULL THEN
    RAISE EXCEPTION 'grove transcript table missing';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class
          WHERE oid='public.grove_private_turns'::regclass) THEN
    RAISE EXCEPTION 'grove transcript RLS is disabled';
  END IF;
  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname='public' AND tablename='grove_private_turns') <> 0 THEN
    RAISE EXCEPTION 'unexpected client-facing transcript policy';
  END IF;
  IF NOT has_table_privilege('service_role','public.grove_private_turns','SELECT')
    OR has_table_privilege('service_role','public.grove_private_turns','INSERT')
    OR has_table_privilege('service_role','public.grove_private_turns','UPDATE')
    OR has_table_privilege('service_role','public.grove_private_turns','DELETE') THEN
    RAISE EXCEPTION 'service_role must only SELECT private turns; fenced RPC inserts';
  END IF;
  IF has_table_privilege('anon','public.grove_private_turns','SELECT')
    OR has_table_privilege('anon','public.grove_private_turns','INSERT')
    OR has_table_privilege('authenticated','public.grove_private_turns','SELECT')
    OR has_table_privilege('authenticated','public.grove_private_turns','INSERT') THEN
    RAISE EXCEPTION 'private transcript exposed to client database roles';
  END IF;

  INSERT INTO auth.users(id) VALUES(alice),(bob);
  INSERT INTO public.grove_private_owner_access(user_id)
    VALUES(alice),(bob);
  INSERT INTO public.grove_private_firefly_bridge(
    grove_user_id, firefly_user_id)
    VALUES (alice,alice),(bob,bob);
  INSERT INTO public.grove_private_ark_project_grants(
    grove_user_id, firefly_project_id)
    VALUES (alice,project_a),(bob,project_b);
  INSERT INTO public.grove_private_turns(
    grove_user_id,firefly_project_id,firefly_conversation_id,
    request_id,user_text,assistant_text,reply_verification)
    VALUES(alice,project_a,conversation,retry_id,
           'Synthetic question','Synthetic answer','unverified_model_text');
  INSERT INTO public.grove_private_turns(
    grove_user_id,firefly_project_id,firefly_conversation_id,
    request_id,user_text,assistant_text,reply_verification)
    VALUES(alice,project_a,conversation,retry_id,
           'Synthetic question','Synthetic answer','unverified_model_text')
    ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM public.grove_private_turns) <> 1 THEN
    RAISE EXCEPTION 'request retry was not unique';
  END IF;
  IF (SELECT count(*) FROM public.grove_private_turns
      WHERE grove_user_id=bob AND firefly_project_id=project_a) <> 0 THEN
    RAISE EXCEPTION 'owner/project scope query mixed personal sessions';
  END IF;
  BEGIN
    INSERT INTO public.grove_private_turns(
      grove_user_id,firefly_project_id,firefly_conversation_id,
      request_id,user_text,assistant_text,reply_verification)
      VALUES(alice,project_b,conversation,retry_id,
             'wrong grant','must reject','unverified_model_text');
    RAISE EXCEPTION 'foreign project grant was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.grove_private_turns(
      grove_user_id,firefly_project_id,firefly_conversation_id,
      request_id,user_text,assistant_text,reply_verification)
      VALUES(alice,project_a,conversation,
             '00000000-0000-4000-8000-000000000007',
             'invalid status','must reject','verified_execution');
    RAISE EXCEPTION 'unverified reply status was bypassed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  DELETE FROM public.grove_private_ark_project_grants
    WHERE grove_user_id=alice AND firefly_project_id=project_a;
  IF (SELECT count(*) FROM public.grove_private_turns) <> 0 THEN
    RAISE EXCEPTION 'revoked/deleted grant failed to cascade transcript';
  END IF;
  RAISE NOTICE 'GROVE_DISPOSABLE_TRANSCRIPT_SCHEMA=PASS; LIVE_OWNER_ACCEPTANCE=HOLD';
END
$acceptance$;

DO $claim_acceptance$
DECLARE
  alice uuid := '00000000-0000-4000-8000-000000000001';
  bob uuid := '00000000-0000-4000-8000-000000000002';
  project_a uuid := '00000000-0000-4000-8000-000000000003';
  project_b uuid := '00000000-0000-4000-8000-000000000004';
  conversation uuid := '00000000-0000-4000-8000-000000000005';
  retry_id uuid := '00000000-0000-4000-8000-000000000006';
  first_hash text := repeat('a',64);
  result jsonb;
  lease_token uuid;
  saved text;
BEGIN
  IF to_regclass('public.grove_private_turn_claims') IS NULL
    OR NOT (SELECT relrowsecurity FROM pg_class
        WHERE oid='public.grove_private_turn_claims'::regclass) THEN
    RAISE EXCEPTION 'Grove pending-claim RLS/table absent';
  END IF;
  IF has_table_privilege('anon','public.grove_private_turn_claims','SELECT')
    OR has_table_privilege('authenticated','public.grove_private_turn_claims','INSERT')
    OR has_table_privilege('service_role','public.grove_private_turn_claims','UPDATE')
    OR has_table_privilege('service_role','public.grove_private_turn_claims','SELECT') THEN
    RAISE EXCEPTION 'claim table unexpectedly exposed directly';
  END IF;
  IF NOT has_function_privilege('service_role',
      'public.grove_private_claim_turn(uuid,uuid,uuid,uuid,text)','EXECUTE')
    OR NOT has_function_privilege('service_role',
      'public.grove_private_complete_turn(uuid,uuid,uuid,uuid,uuid,text,text,text,boolean,boolean)','EXECUTE')
    OR has_function_privilege('anon',
      'public.grove_private_complete_turn(uuid,uuid,uuid,uuid,uuid,text,text,text,boolean,boolean)','EXECUTE')
    OR has_function_privilege('authenticated',
      'public.grove_private_complete_turn(uuid,uuid,uuid,uuid,uuid,text,text,text,boolean,boolean)','EXECUTE')
    OR has_function_privilege('anon',
      'public.grove_private_claim_turn(uuid,uuid,uuid,uuid,text)','EXECUTE')
    OR has_function_privilege('authenticated',
      'public.grove_private_claim_turn(uuid,uuid,uuid,uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'private claim function role privileges invalid';
  END IF;

  -- First transcript acceptance deleted Alice's grant. Do not resurrect it:
  -- prove a claim cannot bypass a real revoked owner/project mapping.
  result := public.grove_private_claim_turn(
    alice,project_a,conversation,retry_id,first_hash);
  IF result->>'status' <> 'no_access' THEN
    RAISE EXCEPTION 'deleted project grant allowed model claim: %',result;
  END IF;
  result := public.grove_private_claim_turn(
    bob,project_b,conversation,retry_id,'INVALID');
  IF result->>'status' <> 'invalid_hash' THEN
    RAISE EXCEPTION 'bad text hash accepted: %',result;
  END IF;
  result := public.grove_private_claim_turn(
    bob,project_b,conversation,retry_id,first_hash);
  IF result->>'status' <> 'claimed' THEN
    RAISE EXCEPTION 'first model claim not acquired: %',result;
  END IF;
  lease_token := (result->>'leaseToken')::uuid;
  saved := public.grove_private_complete_turn(
    bob,project_b,conversation,retry_id,
    '00000000-0000-4000-8000-000000000099',
    'Synthetic fenced prompt','Should never save',
    'unverified_model_text',false,false);
  IF saved <> 'stale' THEN
    RAISE EXCEPTION 'wrong token saved a model reply: %',saved;
  END IF;
  result := public.grove_private_claim_turn(
    bob,project_b,conversation,retry_id,first_hash);
  IF result->>'status' <> 'in_progress' THEN
    RAISE EXCEPTION 'simultaneous duplicate was not held: %',result;
  END IF;
  result := public.grove_private_claim_turn(
    bob,project_b,conversation,retry_id,repeat('b',64));
  IF result->>'status' <> 'conflict' THEN
    RAISE EXCEPTION 'request-ID different text not rejected: %',result;
  END IF;

  UPDATE public.grove_private_turn_claims SET
    claimed_at=clock_timestamp()-interval '500 seconds',
    lease_expires_at=clock_timestamp()-interval '1 second'
  WHERE grove_user_id=bob AND firefly_project_id=project_b
    AND firefly_conversation_id=conversation AND request_id=retry_id;
  result := public.grove_private_claim_turn(
    bob,project_b,conversation,retry_id,first_hash);
  IF result->>'status' <> 'claimed' THEN
    RAISE EXCEPTION 'expired-lease retry failed closed unexpectedly: %',result;
  END IF;
  saved := public.grove_private_complete_turn(
    bob,project_b,conversation,retry_id,lease_token,
    'Synthetic fenced prompt','Expired lease worker reply',
    'unverified_model_text',false,false);
  IF saved <> 'stale' THEN
    RAISE EXCEPTION 'superseded worker persisted after reclaim: %',saved;
  END IF;
  lease_token := (result->>'leaseToken')::uuid;
  saved := public.grove_private_complete_turn(
    bob,project_b,conversation,retry_id,lease_token,
    'Synthetic fenced prompt','Current lease worker reply',
    'unverified_model_text',false,false);
  IF saved <> 'created' THEN
    RAISE EXCEPTION 'current worker did not persist its reply: %',saved;
  END IF;
  saved := public.grove_private_complete_turn(
    bob,project_b,conversation,retry_id,lease_token,
    'Synthetic fenced prompt','A different repeated answer',
    'unverified_model_text',false,false);
  IF saved <> 'replayed' THEN
    RAISE EXCEPTION 'canonical persisted reply was overwritten: %',saved;
  END IF;
  IF (SELECT assistant_text FROM public.grove_private_turns
       WHERE grove_user_id=bob AND firefly_project_id=project_b
         AND request_id=retry_id) <> 'Current lease worker reply' THEN
    RAISE EXCEPTION 'fenced canonical reply changed';
  END IF;
  result := public.grove_private_claim_turn(
    bob,project_b,conversation,retry_id,first_hash);
  IF result->>'status' <> 'completed' THEN
    RAISE EXCEPTION 'completed request was reclaimed: %',result;
  END IF;

  DELETE FROM public.grove_private_ark_project_grants
    WHERE grove_user_id=bob AND firefly_project_id=project_b;
  IF EXISTS (SELECT 1 FROM public.grove_private_turn_claims
      WHERE grove_user_id=bob) THEN
    RAISE EXCEPTION 'revoked project grant retained private pending claim';
  END IF;
  result := public.grove_private_claim_turn(
    bob,project_b,conversation,retry_id,first_hash);
  IF result->>'status' <> 'no_access' THEN
    RAISE EXCEPTION 'revoked project grant permitted reclaimed inference';
  END IF;
  RAISE NOTICE 'GROVE_DISPOSABLE_FENCED_RETRY=PASS; DISTRIBUTED_EXACTLY_ONCE_INFERENCE=NOT_CLAIMED; LIVE_MIGRATION=HOLD';
END
$claim_acceptance$;
