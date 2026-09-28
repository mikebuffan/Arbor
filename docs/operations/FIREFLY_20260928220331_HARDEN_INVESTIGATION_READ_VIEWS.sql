-- APPLIED LIVE to Firefly Supabase on 2026-09-28.
-- Live migration ledger name:
--   20260928220331_harden_investigation_read_views
--
-- This is a recovery/source receipt because current GitHub main does not yet
-- reproduce the complete live migration history that created these views.
-- DO NOT copy this file into supabase/migrations or replay it blindly.
-- Reconcile the live migration ledger first; future schema changes must be
-- forward-only.

alter view public.arbor_investigation_evidence_read set (security_invoker = true);
alter view public.arbor_investigation_claim_read set (security_invoker = true);
alter view public.arbor_investigation_timeline_read set (security_invoker = true);
alter view public.arbor_investigation_relationship_read set (security_invoker = true);
alter view public.arbor_investigation_finding_read set (security_invoker = true);

revoke all on table
  public.arbor_investigation_evidence_read,
  public.arbor_investigation_claim_read,
  public.arbor_investigation_timeline_read,
  public.arbor_investigation_relationship_read,
  public.arbor_investigation_finding_read
from public, anon, authenticated;

grant select on table
  public.arbor_investigation_evidence_read,
  public.arbor_investigation_claim_read,
  public.arbor_investigation_timeline_read,
  public.arbor_investigation_relationship_read,
  public.arbor_investigation_finding_read
to service_role;
