-- PROPOSAL ONLY. NOT in supabase/migrations; NOT applied in any project.
-- Target: The Grove Supabase project, NEVER public Firefly or ARK Preview.
-- Owner/privacy/security/retention review is required before applying.
-- Requires existing grove_private_owner_access and
-- grove_private_ark_project_grants (grove_user_id,firefly_project_id) PK.
BEGIN;

-- A single transaction-ordered scope lock for BOTH model writes and deletes.
-- Deliberate hash collisions serialize extra scopes, never grant access.
-- Put it in the turns proposal so claim/complete fixtures also have it.
CREATE FUNCTION public.grove_private_lock_conversation(
  p_grove_user_id uuid, p_project_id uuid, p_conversation_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $scope_lock$
BEGIN
  IF p_grove_user_id IS NULL OR p_project_id IS NULL OR
     p_conversation_id IS NULL THEN
    RAISE EXCEPTION 'grove_private_scope_invalid' USING ERRCODE='23514';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_grove_user_id::text || '/' || p_project_id::text || '/' ||
      p_conversation_id::text, 0::bigint
    )
  );
END;
$scope_lock$;
REVOKE ALL ON FUNCTION public.grove_private_lock_conversation(uuid,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grove_private_lock_conversation(uuid,uuid,uuid)
  TO service_role;

CREATE TABLE IF NOT EXISTS public.grove_private_turns (
  grove_user_id uuid NOT NULL
    REFERENCES public.grove_private_owner_access(user_id) ON DELETE RESTRICT,
  firefly_project_id uuid NOT NULL,
  firefly_conversation_id uuid NOT NULL,
  request_id uuid NOT NULL,
  user_text text NOT NULL
    CONSTRAINT grove_private_user_text_bound
      CHECK (length(trim(user_text)) BETWEEN 1 AND 3000),
  assistant_text text NOT NULL
    CONSTRAINT grove_private_assistant_text_bound
      CHECK (length(trim(assistant_text)) BETWEEN 1 AND 20000),
  reply_verification text NOT NULL
    CONSTRAINT grove_private_reply_status_bound
      CHECK (reply_verification IN
        ('unverified_model_text','known_action_claim_filtered')),
  ark_connected boolean NOT NULL DEFAULT false,
  continuity_fetched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grove_private_turns_pkey
    PRIMARY KEY (
      grove_user_id,firefly_project_id,firefly_conversation_id,request_id
    ),
  CONSTRAINT grove_private_turns_project_grant_fk FOREIGN KEY (
    grove_user_id,firefly_project_id
  ) REFERENCES public.grove_private_ark_project_grants(
    grove_user_id,firefly_project_id
  ) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS grove_private_turns_recent
  ON public.grove_private_turns (
    grove_user_id,firefly_project_id,firefly_conversation_id,
    created_at DESC, request_id DESC
  );

ALTER TABLE public.grove_private_turns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grove_private_turns FROM anon, authenticated;
-- No direct INSERT for service_role: only the separately approved
-- grove_private_complete_turn fenced SECURITY DEFINER function may persist
-- after current claim-token and active grant checks. Client and model have
-- no write privileges. Revoking owner/bridge/project via revoked_at
-- immediately denies server access while retaining completed history.
-- Hard deletion of owner/grant requires an explicit prior transcript purge;
-- FK RESTRICT prevents a routine admin grant deletion from silently erasing it.
REVOKE ALL ON public.grove_private_turns FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.grove_private_turns TO service_role;
-- No client-facing policy. Only authorized Grove SERVER code using a
-- server-only service role after Grove JWT+invitation+bridge+explicit grant+
-- Firefly project+conversation checks can read; only approved fenced RPC can write.
-- A Grove JWT cannot be used as a Firefly credential.

COMMENT ON TABLE public.grove_private_turns IS
  'Grove-only complete model turn pairs, no ARK execution receipts. Retain on soft revocation; block hard owner/grant removal until explicitly authorized transcript purge. Proposal only.';

COMMIT;
