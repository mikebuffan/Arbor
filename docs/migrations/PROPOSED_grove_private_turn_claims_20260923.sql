-- PROPOSAL ONLY: private Grove project, never public Firefly or ARK Preview.
-- Requires explicit owner approval of retention/cascade and existing approved
-- owner/bridge/project-grant tables BEFORE live application.
-- No live migrations, no scheduler, no model calls.
BEGIN;

CREATE TABLE IF NOT EXISTS public.grove_private_turn_claims (
  grove_user_id uuid NOT NULL,
  firefly_project_id uuid NOT NULL,
  firefly_conversation_id uuid NOT NULL,
  request_id uuid NOT NULL,
  user_text_sha256 text NOT NULL
    CONSTRAINT grove_private_claim_hash CHECK (user_text_sha256 ~ '^[a-f0-9]{64}$'),
  lease_token uuid NOT NULL DEFAULT gen_random_uuid(),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz NOT NULL,
  CONSTRAINT grove_private_claim_time CHECK (lease_expires_at > claimed_at),
  CONSTRAINT grove_private_turn_claims_pkey PRIMARY KEY (
    grove_user_id,firefly_project_id,firefly_conversation_id,request_id
  ),
  CONSTRAINT grove_private_claim_grant_fk FOREIGN KEY (
    grove_user_id,firefly_project_id
  ) REFERENCES public.grove_private_ark_project_grants (
    grove_user_id,firefly_project_id
  ) ON DELETE CASCADE
);
ALTER TABLE public.grove_private_turn_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grove_private_turn_claims
  FROM PUBLIC, anon, authenticated, service_role;

-- Only the SERVER service-role may call this atomic PostgreSQL transaction.
-- Browser credentials cannot claim, view or enumerate pending private turns.
-- Each request must independently pass Grove JWT+invitation+bridge, Firefly
-- conversation ownership and project grant in the TypeScript broker first.
CREATE OR REPLACE FUNCTION public.grove_private_claim_turn(
  p_grove_user_id uuid,
  p_project_id uuid,
  p_conversation_id uuid,
  p_request_id uuid,
  p_user_text_sha256 text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $grove_claim$
DECLARE
  v_token uuid := gen_random_uuid();
  v_claimed uuid;
  v_existing_hash text;
BEGIN
  IF p_user_text_sha256 IS NULL OR
      p_user_text_sha256 !~ '^[a-f0-9]{64}$' THEN
    RETURN 'invalid_hash';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.grove_private_owner_access o
      JOIN public.grove_private_firefly_bridge b
        ON b.grove_user_id = o.user_id
      JOIN public.grove_private_ark_project_grants g
        ON g.grove_user_id = b.grove_user_id
    WHERE o.user_id = p_grove_user_id AND o.revoked_at IS NULL
      AND b.revoked_at IS NULL AND g.revoked_at IS NULL
      AND g.firefly_project_id = p_project_id
  ) THEN
    RETURN 'no_access';
  END IF;

  -- Unique-key conflict locking serializes claims across ALL serverless
  -- workers. An active identical claim never renews its own lease.
  -- A prior expired lease can be reclaimed for the SAME original text only.
  INSERT INTO public.grove_private_turn_claims (
    grove_user_id,firefly_project_id,firefly_conversation_id,
    request_id,user_text_sha256,lease_token,
    claimed_at,lease_expires_at
  ) VALUES (
    p_grove_user_id,p_project_id,p_conversation_id,p_request_id,
    p_user_text_sha256,v_token,clock_timestamp(),
    clock_timestamp()+interval '240 seconds'
  )
  ON CONFLICT (
    grove_user_id,firefly_project_id,firefly_conversation_id,request_id
  ) DO UPDATE SET
    lease_token=EXCLUDED.lease_token,
    claimed_at=EXCLUDED.claimed_at,
    lease_expires_at=EXCLUDED.lease_expires_at
  WHERE public.grove_private_turn_claims.user_text_sha256 =
        EXCLUDED.user_text_sha256
    AND public.grove_private_turn_claims.lease_expires_at <
        clock_timestamp()
  RETURNING lease_token INTO v_claimed;

  IF v_claimed IS NOT NULL THEN
    RETURN 'claimed';
  END IF;
  SELECT user_text_sha256 INTO v_existing_hash
    FROM public.grove_private_turn_claims
    WHERE grove_user_id=p_grove_user_id
      AND firefly_project_id=p_project_id
      AND firefly_conversation_id=p_conversation_id
      AND request_id=p_request_id;

  IF v_existing_hash IS NOT NULL AND
      v_existing_hash <> p_user_text_sha256 THEN
    RETURN 'conflict';
  END IF;
  RETURN 'in_progress';
END;
$grove_claim$;

REVOKE ALL ON FUNCTION public.grove_private_claim_turn(
  uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grove_private_claim_turn(
  uuid,uuid,uuid,uuid,text) TO service_role;

COMMENT ON TABLE public.grove_private_turn_claims IS
  'PROPOSED Grove-only model-call lease. Hash-only pending text; no executed work receipt. Owner retention and grant-revocation cascade review required.';
COMMENT ON FUNCTION public.grove_private_claim_turn(
  uuid,uuid,uuid,uuid,text) IS
  'Server-only atomic claim, 240s after which a retry MAY duplicate an already-running inference. Not exactly-once inference.';
COMMIT;
