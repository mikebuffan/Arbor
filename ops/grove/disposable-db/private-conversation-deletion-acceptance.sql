-- Disposable PostgreSQL ONLY; synthetic identities. NEVER live Supabase.
\set ON_ERROR_STOP on
\ir 00-private-transcript-acceptance.sql
\ir ../../../docs/migrations/PROPOSED_grove_private_conversation_deletion_20261011.sql

-- Existing fixture revoked Alice's project; re-enable only inside disposable DB.
UPDATE public.grove_private_ark_project_grants SET revoked_at=NULL
WHERE grove_user_id='00000000-0000-4000-8000-000000000001'::uuid
  AND firefly_project_id='00000000-0000-4000-8000-000000000003'::uuid;

DO $deletion_acceptance$
DECLARE
  alice uuid := '00000000-0000-4000-8000-000000000001';
  bob uuid := '00000000-0000-4000-8000-000000000002';
  project_a uuid := '00000000-0000-4000-8000-000000000003';
  conversation uuid := '00000000-0000-4000-8000-000000000005';
  other_conversation uuid := '00000000-0000-4000-8000-000000000009';
  retry_id uuid := '00000000-0000-4000-8000-000000000006';
  result jsonb;
BEGIN
  -- Fixture's Alice saved one original complete turn. Another conversation
  -- must remain untouched by targeted deletion.
  INSERT INTO public.grove_private_turns(
    grove_user_id, firefly_project_id, firefly_conversation_id,
    request_id, user_text, assistant_text, reply_verification
  ) VALUES(
    alice,project_a,other_conversation,
    '00000000-0000-4000-8000-000000000010',
    'Keep my other chat','Still here','unverified_model_text'
  );
  IF (SELECT count(*) FROM public.grove_private_turns
    WHERE grove_user_id=alice AND firefly_project_id=project_a
      AND firefly_conversation_id=conversation) <> 1 THEN
    RAISE EXCEPTION 'synthetic initial transcript missing';
  END IF;

  -- No browser role may invoke purge or enumerate tombstones.
  IF has_function_privilege('anon',
    'public.grove_private_delete_conversation(uuid,uuid,uuid)','EXECUTE')
    OR has_function_privilege('authenticated',
    'public.grove_private_delete_conversation(uuid,uuid,uuid)','EXECUTE')
    OR NOT has_function_privilege('service_role',
    'public.grove_private_delete_conversation(uuid,uuid,uuid)','EXECUTE')
    OR has_table_privilege('authenticated',
    'public.grove_private_conversation_tombstones','SELECT') THEN
    RAISE EXCEPTION 'deletion permissions are too broad';
  END IF;

  result := public.grove_private_delete_conversation(
    bob,project_a,conversation);
  IF result->>'status' <> 'no_access' THEN
    RAISE EXCEPTION 'foreign project deleted another owner''s data';
  END IF;
  IF (SELECT count(*) FROM public.grove_private_turns
      WHERE grove_user_id=alice AND firefly_conversation_id=conversation) <> 1 THEN
    RAISE EXCEPTION 'foreign attempt removed data';
  END IF;

  result := public.grove_private_delete_conversation(
    alice,project_a,conversation);
  IF result->>'status' <> 'deleted' OR
    (result->>'removedTurns')::int <> 1 THEN
    RAISE EXCEPTION 'explicit delete did not remove exact chat: %',result;
  END IF;
  IF EXISTS (SELECT 1 FROM public.grove_private_turns
      WHERE grove_user_id=alice AND firefly_conversation_id=conversation)
    OR EXISTS (SELECT 1 FROM public.grove_private_turn_claims
      WHERE grove_user_id=alice AND firefly_conversation_id=conversation)
    OR NOT EXISTS (SELECT 1 FROM public.grove_private_conversation_tombstones
      WHERE grove_user_id=alice AND firefly_conversation_id=conversation)
    OR (SELECT count(*) FROM public.grove_private_turns
      WHERE grove_user_id=alice AND firefly_conversation_id=other_conversation) <> 1 THEN
    RAISE EXCEPTION 'delete failed exact scope or destroyed other chat';
  END IF;

  result := public.grove_private_delete_conversation(
    alice,project_a,conversation);
  IF result->>'status' <> 'deleted' OR
    (result->>'removedTurns')::int <> 0 THEN
    RAISE EXCEPTION 'repeat explicit deletion should be idempotent';
  END IF;

  -- Old in-flight model workers cannot reinsert claims or saved replies.
  BEGIN
    INSERT INTO public.grove_private_turn_claims(
      grove_user_id,firefly_project_id,firefly_conversation_id,
      request_id,user_text_sha256,lease_expires_at
    ) VALUES(
      alice,project_a,conversation,retry_id,repeat('a',64),
      clock_timestamp()+interval '240 seconds'
    );
    RAISE EXCEPTION 'late claim resurrected deleted conversation';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.grove_private_turns(
      grove_user_id,firefly_project_id,firefly_conversation_id,
      request_id,user_text,assistant_text,reply_verification
    ) VALUES(
      alice,project_a,conversation,retry_id,
      'Late user prompt','Late model answer','unverified_model_text'
    );
    RAISE EXCEPTION 'late completion resurrected deleted transcript';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Grant revocation is NOT deletion of another saved conversation.
  UPDATE public.grove_private_ark_project_grants
    SET revoked_at=clock_timestamp()
    WHERE grove_user_id=alice AND firefly_project_id=project_a;
  IF (SELECT count(*) FROM public.grove_private_turns
      WHERE grove_user_id=alice AND firefly_conversation_id=other_conversation) <> 1 THEN
    RAISE EXCEPTION 'revocation silently purged other chat';
  END IF;
  RAISE NOTICE 'GROVE_USER_DELETE_DISPOSABLE=PASS; NO_TTL=PASS; LIVE_MIGRATION=HOLD';
END;
$deletion_acceptance$;
