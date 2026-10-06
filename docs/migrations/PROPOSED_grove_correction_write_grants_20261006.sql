-- PROPOSAL ONLY: dedicated Grove database. Never automatically apply or seed.
-- Existing writer changes three GLOBAL behavior keys in Firefly. Grant review
-- must explicitly approve this cross-conversation effect. No ARK/runtime grant.
BEGIN;
CREATE TABLE IF NOT EXISTS public.grove_private_correction_write_grants (
  grove_user_id uuid NOT NULL,
  firefly_user_id uuid NOT NULL,
  firefly_project_id uuid NOT NULL,
  firefly_conversation_id uuid NOT NULL,
  purpose text NOT NULL CHECK (purpose = 'global_behavior_calibration'),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL CHECK (expires_at > granted_at),
  revoked_at timestamptz,
  PRIMARY KEY (grove_user_id,firefly_project_id,firefly_conversation_id),
  FOREIGN KEY (grove_user_id,firefly_project_id)
    REFERENCES public.grove_private_ark_project_grants(grove_user_id,firefly_project_id) ON DELETE CASCADE
);
ALTER TABLE public.grove_private_correction_write_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grove_private_correction_write_grants FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.grove_private_correction_write_grants FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.grove_private_correction_write_grants TO service_role;
COMMENT ON TABLE public.grove_private_correction_write_grants IS
  'Explicit expiring mapped-owner permission for GLOBAL behavior calibration only. No client policy, no seeded grants, no model/runtime/ARK writes. Cross-database revocation is checked at request boundaries, not atomically distributed.';
COMMIT;
