-- Disposable PostgreSQL 17.6 ONLY. Never run on a real Grove database.
-- Explicitly tests old backup rows replayed AFTER owner deletion. Also proves
-- full snapshot restoration without independently preserved tombstones is
-- UNSAFE; the unsafe synthetic transaction is intentionally rolled back.
\set ON_ERROR_STOP on
\ir private-conversation-concurrency-acceptance.sql

DO $restore_replay_acceptance$
DECLARE
  owner_id uuid := '00000000-0000-4000-8000-000000000001';
  project_id uuid := '00000000-0000-4000-8000-000000000003';
  deleted_conversation uuid := '00000000-0000-4000-8000-000000000021';
  unrelated_conversation uuid := '00000000-0000-4000-8000-000000000009';
  old_request uuid := '00000000-0000-4000-8000-000000000024';
  unsafe_insert_would_succeed boolean := false;
BEGIN
  -- A deletion marker MUST survive ordinary scoped restore/import.
  IF NOT EXISTS (
    SELECT 1 FROM public.grove_private_conversation_tombstones
    WHERE grove_user_id=owner_id AND firefly_project_id=project_id
      AND firefly_conversation_id=deleted_conversation
  ) THEN
    RAISE EXCEPTION 'deleted conversation lacks a durable tombstone';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.grove_private_turns
    WHERE grove_user_id=owner_id AND firefly_project_id=project_id
      AND firefly_conversation_id=deleted_conversation
  ) THEN
    RAISE EXCEPTION 'deleted conversation reappeared before restore';
  END IF;

  -- Emulate importing a backed-up completed turn into a CURRENT database
  -- with its tombstone intact: SQL trigger MUST reject it.
  BEGIN
    INSERT INTO public.grove_private_turns(
      grove_user_id,firefly_project_id,firefly_conversation_id,
      request_id,user_text,assistant_text,reply_verification
    ) VALUES(
      owner_id,project_id,deleted_conversation,old_request,
      'Old backed-up synthetic question',
      'Old backed-up synthetic reply','unverified_model_text'
    );
    RAISE EXCEPTION 'backup replay bypassed deletion tombstone';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Likewise, backed-up pending claim import cannot reactivate inference.
  BEGIN
    INSERT INTO public.grove_private_turn_claims(
      grove_user_id,firefly_project_id,firefly_conversation_id,
      request_id,user_text_sha256,lease_expires_at
    ) VALUES(
      owner_id,project_id,deleted_conversation,old_request,
      repeat('a',64),clock_timestamp()+interval '240 seconds'
    );
    RAISE EXCEPTION 'backup replay restored deleted pending model claim';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Demonstrate WHY restoring an ENTIRE older database is NOT accepted.
  -- A privileged old snapshot without the newer tombstone would let the
  -- same saved row through; rollback the entire demonstration deliberately.
  BEGIN
    DELETE FROM public.grove_private_conversation_tombstones
    WHERE grove_user_id=owner_id AND firefly_project_id=project_id
      AND firefly_conversation_id=deleted_conversation;
    INSERT INTO public.grove_private_turns(
      grove_user_id,firefly_project_id,firefly_conversation_id,
      request_id,user_text,assistant_text,reply_verification
    ) VALUES(
      owner_id,project_id,deleted_conversation,old_request,
      'Unsafe physical restore synthetic question',
      'Unsafe physical restore synthetic reply','unverified_model_text'
    );
    unsafe_insert_would_succeed := true;
    RAISE EXCEPTION 'rollback simulated unsafe physical restore'
      USING ERRCODE='P0001';
  EXCEPTION WHEN raise_exception THEN
    IF NOT unsafe_insert_would_succeed THEN
      RAISE EXCEPTION 'unsafe full-backup restoration risk was not reproduced';
    END IF;
  END;

  -- The exception subtransaction restores our original deletion marker.
  IF NOT EXISTS (
    SELECT 1 FROM public.grove_private_conversation_tombstones
    WHERE grove_user_id=owner_id AND firefly_project_id=project_id
      AND firefly_conversation_id=deleted_conversation
  ) OR EXISTS (
    SELECT 1 FROM public.grove_private_turns
    WHERE grove_user_id=owner_id AND firefly_project_id=project_id
      AND firefly_conversation_id=deleted_conversation
  ) OR EXISTS (
    SELECT 1 FROM public.grove_private_turn_claims
    WHERE grove_user_id=owner_id AND firefly_project_id=project_id
      AND firefly_conversation_id=deleted_conversation
  ) THEN
    RAISE EXCEPTION 'restore rehearsal altered deletion state';
  END IF;
  IF (SELECT count(*) FROM public.grove_private_turns
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=unrelated_conversation) <> 1 THEN
    RAISE EXCEPTION 'restore replay damaged unrelated saved conversation';
  END IF;
  RAISE NOTICE
    'GROVE_LOGICAL_REPLAY_WITH_TOMBSTONE=PASS; FULL_SNAPSHOT_WITHOUT_TOMBSTONE=UNSAFE; LIVE_RESTORE=HOLD';
END;
$restore_replay_acceptance$;
