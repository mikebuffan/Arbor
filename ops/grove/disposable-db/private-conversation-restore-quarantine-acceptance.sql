-- OFFLINE/DISPOSABLE PostgreSQL fixture only. NEVER a live restore script.
-- Source-only rehearsal for quarantined restoration of user-deleted conversations.
-- Synthetic "external" deletion data below is HARDCODED TEST INPUT, NOT
-- independently authenticated custody. A real restore remains blocked.
\set ON_ERROR_STOP on

DO $quarantine_replay$
DECLARE
  owner_id uuid := '00000000-0000-4000-8000-000000000001';
  project_id uuid := '00000000-0000-4000-8000-000000000003';
  deleted_conversation uuid := '00000000-0000-4000-8000-000000000021';
  saved_other_conversation uuid := '00000000-0000-4000-8000-000000000009';
  recovered_request uuid := '00000000-0000-4000-8000-000000000032';
  rehearsal_completed boolean := false;
BEGIN
  -- Previous two-session deletion + backup fixture must have established the
  -- tombstone and an unrelated saved conversation before this check starts.
  IF NOT EXISTS(
    SELECT 1 FROM public.grove_private_conversation_tombstones
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=deleted_conversation
  ) OR (SELECT count(*) FROM public.grove_private_turns
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=saved_other_conversation) <> 1 THEN
    RAISE EXCEPTION 'quarantine rehearsal prerequisites absent';
  END IF;

  -- PostgreSQL EXCEPTION block creates a savepoint. The test deliberately
  -- rolls the *entire* simulated restore back after validation, preserving
  -- existing state for the main source fixture and proving no live write.
  BEGIN
    -- An old full snapshot would have neither the recent deletion tombstone
    -- nor the latest user deletion. In production this state MUST stay
    -- physically quarantined and offline, with ZERO serving endpoints.
    DELETE FROM public.grove_private_conversation_tombstones
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=deleted_conversation;
    INSERT INTO public.grove_private_turns(
      grove_user_id,firefly_project_id,firefly_conversation_id,
      request_id,user_text,assistant_text,reply_verification
    ) VALUES (
      owner_id,project_id,deleted_conversation,recovered_request,
      'Old synthetic user message','Old synthetic reply',
      'unverified_model_text'
    );
    IF (SELECT count(*) FROM public.grove_private_turns
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=deleted_conversation) <> 1 THEN
      RAISE EXCEPTION 'old snapshot corruption simulation failed';
    END IF;

    -- Only after a hypothetical independently verified post-snapshot
    -- deletion record, quarantine reapplication is allowed to proceed.
    -- This fixture cannot attest ledger authenticity/completeness/freshness.
    INSERT INTO public.grove_private_conversation_tombstones(
      grove_user_id,firefly_project_id,firefly_conversation_id
    ) VALUES(owner_id,project_id,deleted_conversation);
    DELETE FROM public.grove_private_turn_claims
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=deleted_conversation;
    DELETE FROM public.grove_private_turns
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=deleted_conversation;

    IF EXISTS (
      SELECT 1 FROM public.grove_private_turns
        WHERE grove_user_id=owner_id AND firefly_project_id=project_id
          AND firefly_conversation_id=deleted_conversation
    ) OR EXISTS (
      SELECT 1 FROM public.grove_private_turn_claims
        WHERE grove_user_id=owner_id AND firefly_project_id=project_id
          AND firefly_conversation_id=deleted_conversation
    ) OR NOT EXISTS (
      SELECT 1 FROM public.grove_private_conversation_tombstones
        WHERE grove_user_id=owner_id AND firefly_project_id=project_id
          AND firefly_conversation_id=deleted_conversation
    ) OR (SELECT count(*) FROM public.grove_private_turns
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=saved_other_conversation) <> 1 THEN
      RAISE EXCEPTION 'quarantine deletion replay did not reconcile';
    END IF;
    rehearsal_completed := true;
    RAISE EXCEPTION 'roll back synthetic quarantined snapshot reapplication'
      USING ERRCODE='P0001';
  EXCEPTION WHEN raise_exception THEN
    IF NOT rehearsal_completed THEN
      RAISE EXCEPTION 'quarantine rehearsal aborted without proof';
    END IF;
  END;

  -- SQL savepoint rollback MUST preserve the original deletion state and
  -- original independent, unrelated saved conversation after the rehearsal.
  IF NOT EXISTS (
    SELECT 1 FROM public.grove_private_conversation_tombstones
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=deleted_conversation
  ) OR EXISTS (
    SELECT 1 FROM public.grove_private_turns
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=deleted_conversation
  ) OR (SELECT count(*) FROM public.grove_private_turns
      WHERE grove_user_id=owner_id AND firefly_project_id=project_id
        AND firefly_conversation_id=saved_other_conversation) <> 1 THEN
    RAISE EXCEPTION 'quarantine test leaked restored state';
  END IF;

  RAISE NOTICE
    'GROVE_RESTORE_QUARANTINE_SYNTHETIC_REAPPLY=PASS; EXTERNAL_CUSTODY_UNVERIFIED; HOST_SERVE=HOLD';
END;
$quarantine_replay$;
