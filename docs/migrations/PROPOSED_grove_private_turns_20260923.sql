-- PROPOSAL ONLY. NOT in supabase/migrations; NOT applied in any project.
-- Target: The Grove Supabase project, NEVER public Firefly or ARK Preview.
-- Owner/privacy/security/retention review is required before applying.
-- Requires existing grove_private_owner_access and
-- grove_private_ark_project_grants (grove_user_id,firefly_project_id) PK.
BEGIN;

CREATE TABLE IF NOT EXISTS public.grove_private_turns (
  grove_user_id uuid NOT NULL
    REFERENCES public.grove_private_owner_access(user_id) ON DELETE CASCADE,
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
  ) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS grove_private_turns_recent
  ON public.grove_private_turns (
    grove_user_id,firefly_project_id,firefly_conversation_id,
    created_at DESC, request_id DESC
  );

ALTER TABLE public.grove_private_turns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grove_private_turns FROM anon, authenticated;
-- Supabase has broad default table grants to service_role. This private
-- transcript store needs only authenticated-by-host SELECT and INSERT;
-- revocation uses the project-grant FK's ON DELETE CASCADE, not a direct
-- client or model-issued DELETE. Keep UPDATE/DELETE unavailable to this role.
REVOKE ALL ON public.grove_private_turns FROM service_role;
GRANT SELECT, INSERT ON public.grove_private_turns TO service_role;
-- No client-facing policy. Only authorized Grove SERVER code using a
-- server-only service role after Grove JWT+invitation+bridge+explicit grant+
-- Firefly project+conversation checks can read/write.
-- A Grove JWT cannot be used as a Firefly credential.

COMMENT ON TABLE public.grove_private_turns IS
  'Private Grove-only complete model turn pairs. No ARK execution receipts. NOT Firefly public chat history. Retention/deletion policy must be approved before deployment.';

COMMIT;
