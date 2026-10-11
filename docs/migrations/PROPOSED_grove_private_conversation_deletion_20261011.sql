-- PROPOSAL ONLY; NEVER applied to any live Supabase project by this file.
-- Depends on separately approved private Grove turns and claims migrations.
-- Owner policy: no TTL, no inactivity purge; exact user-initiated deletion ONLY.
-- Browser/user/model never directly invokes this RPC: the private Grove host
-- must independently authenticate and verify Firefly conversation ownership.
BEGIN;

CREATE TABLE public.grove_private_conversation_tombstones (
  grove_user_id uuid NOT NULL,
  firefly_project_id uuid NOT NULL,
  firefly_conversation_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (grove_user_id, firefly_project_id, firefly_conversation_id),
  FOREIGN KEY (grove_user_id, firefly_project_id)
    REFERENCES public.grove_private_ark_project_grants (
      grove_user_id, firefly_project_id
    ) ON DELETE RESTRICT
);
ALTER TABLE public.grove_private_conversation_tombstones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grove_private_conversation_tombstones
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.grove_private_conversation_tombstones TO service_role;

-- A late model completion or recovered pending claim must never recreate a
-- deleted Grove transcript, even if it began before the explicit deletion.
-- This is database protection across independent Vercel workers.
CREATE FUNCTION public.grove_block_deleted_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.grove_private_conversation_tombstones
      WHERE grove_user_id=NEW.grove_user_id
        AND firefly_project_id=NEW.firefly_project_id
        AND firefly_conversation_id=NEW.firefly_conversation_id
  ) THEN
    RAISE EXCEPTION 'grove_private_conversation_deleted'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$guard$;
REVOKE ALL ON FUNCTION public.grove_block_deleted_conversation()
  FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER grove_deleted_turn_fence
  BEFORE INSERT OR UPDATE ON public.grove_private_turns
  FOR EACH ROW EXECUTE FUNCTION public.grove_block_deleted_conversation();
CREATE TRIGGER grove_deleted_claim_fence
  BEFORE INSERT OR UPDATE ON public.grove_private_turn_claims
  FOR EACH ROW EXECUTE FUNCTION public.grove_block_deleted_conversation();

-- One separately authenticated, actively granted user action.
-- Never delete the shared Firefly conversation, memories or other chats.
-- Return only a status and count, never transcript text or grant material.
CREATE FUNCTION public.grove_private_delete_conversation(
  p_grove_user_id uuid,
  p_project_id uuid,
  p_conversation_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $delete$
DECLARE
  v_deleted integer;
BEGIN
  IF p_grove_user_id IS NULL OR p_project_id IS NULL OR
     p_conversation_id IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  -- Lock the current authorization row against concurrent grant revocation.
  PERFORM 1 FROM public.grove_private_owner_access o
    JOIN public.grove_private_firefly_bridge b
      ON b.grove_user_id = o.user_id
    JOIN public.grove_private_ark_project_grants g
      ON g.grove_user_id = b.grove_user_id
  WHERE o.user_id=p_grove_user_id AND o.revoked_at IS NULL
    AND b.revoked_at IS NULL AND g.revoked_at IS NULL
    AND g.firefly_project_id=p_project_id
  FOR SHARE OF o,b,g;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_access');
  END IF;

  -- Immutable per-Grove scope tombstone. Unique-key locking serializes
  -- concurrent deletes. Once committed, the triggers fence re-creation.
  INSERT INTO public.grove_private_conversation_tombstones(
    grove_user_id,firefly_project_id,firefly_conversation_id
  ) VALUES (p_grove_user_id,p_project_id,p_conversation_id)
    ON CONFLICT DO NOTHING;

  -- Delete pending claims and completed Grove-only turns as one transaction.
  -- A concurrent completion that already won is subsequently deleted;
  -- a late completion after this transaction is rejected by the trigger.
  DELETE FROM public.grove_private_turn_claims
    WHERE grove_user_id=p_grove_user_id
      AND firefly_project_id=p_project_id
      AND firefly_conversation_id=p_conversation_id;
  DELETE FROM public.grove_private_turns
    WHERE grove_user_id=p_grove_user_id
      AND firefly_project_id=p_project_id
      AND firefly_conversation_id=p_conversation_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN jsonb_build_object('status','deleted','removedTurns',v_deleted);
END;
$delete$;
REVOKE ALL ON FUNCTION public.grove_private_delete_conversation(uuid,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grove_private_delete_conversation(uuid,uuid,uuid)
  TO service_role;
COMMENT ON TABLE public.grove_private_conversation_tombstones IS
  'Grove-only no-expiry deletion fences. Immutable until a separately approved account privacy purge; not a Firefly deletion.';
COMMENT ON FUNCTION public.grove_private_delete_conversation(uuid,uuid,uuid) IS
  'Proposed service-host-only verified user deletion: removes exact Grove transcript+claims, retains tombstone; never erases Firefly conversation.';
COMMIT;
