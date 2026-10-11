-- REVIEW ONLY: never applied to hosted Supabase by this workflow.
-- Existing public.annabelle_workspace_state and public.annabelle_workspace_revisions.
-- Only run with explicit approval after real disposable Postgres acceptance and
-- full reconciliation of legacy write + restore callers.
BEGIN;
ALTER TABLE public.annabelle_workspace_state
  ADD COLUMN IF NOT EXISTS edit_version bigint NOT NULL DEFAULT 0;
ALTER TABLE public.annabelle_workspace_revisions
  ADD COLUMN IF NOT EXISTS resulting_version bigint,
  ADD COLUMN IF NOT EXISTS request_fingerprint text;
-- New calls use the existing revision UUID primary key as durable request ID.
CREATE OR REPLACE FUNCTION public.annabelle_save_workspace_atomic(
  p_project_id uuid, p_request_id uuid, p_expected_version bigint,
  p_canon jsonb, p_locked_passages jsonb, p_scene_state jsonb,
  p_unresolved_decisions jsonb, p_working_delta text, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old public.annabelle_workspace_state%ROWTYPE;
  v_receipt public.annabelle_workspace_revisions%ROWTYPE;
  v_exists boolean;
  v_version bigint;
  v_fingerprint text;
  v_snapshot jsonb;
BEGIN
  IF v_uid IS NULL OR p_project_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'annabelle_atomic_auth_or_request_missing' USING ERRCODE='42501';
  END IF;
  IF p_expected_version IS NULL OR p_expected_version < 0 THEN
    RAISE EXCEPTION 'annabelle_atomic_expected_version_invalid' USING ERRCODE='22023';
  END IF;
  IF p_canon IS NULL OR jsonb_typeof(p_canon)<>'array'
     OR p_locked_passages IS NULL OR jsonb_typeof(p_locked_passages)<>'array'
     OR p_scene_state IS NULL OR jsonb_typeof(p_scene_state)<>'array'
     OR p_unresolved_decisions IS NULL OR jsonb_typeof(p_unresolved_decisions)<>'array'
     OR p_reason IS NULL OR length(btrim(p_reason))=0
     OR length(p_reason)>500 OR coalesce(length(p_working_delta),0)>250000
  THEN
    RAISE EXCEPTION 'annabelle_atomic_payload_invalid' USING ERRCODE='22023';
  END IF;
  -- SECURITY INVOKER means the existing caller RLS remains enforced.
  PERFORM 1 FROM public.projects WHERE id=p_project_id AND user_id=v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'annabelle_atomic_project_not_owned' USING ERRCODE='42501';
  END IF;
  -- An xact lock works across separate PostgreSQL server connections.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_uid::text || ':' || p_project_id::text,0));
  v_fingerprint := pg_catalog.md5(pg_catalog.jsonb_build_object(
    'expectedVersion',p_expected_version,
    'canon',p_canon,'lockedPassages',p_locked_passages,
    'sceneState',p_scene_state,'unresolvedDecisions',p_unresolved_decisions,
    'workingDelta',p_working_delta,'reason',p_reason)::text);
  -- Process durable replay BEFORE checking current version: older retries
  -- never overwrite an intervening newer edit.
  SELECT * INTO v_receipt FROM public.annabelle_workspace_revisions
    WHERE id=p_request_id AND user_id=v_uid AND project_id=p_project_id;
  IF FOUND THEN
    IF v_receipt.request_fingerprint IS DISTINCT FROM v_fingerprint
       OR v_receipt.resulting_version IS NULL THEN
      RAISE EXCEPTION 'annabelle_atomic_request_id_conflict' USING ERRCODE='P0001';
    END IF;
    RETURN pg_catalog.jsonb_build_object(
      'status','replayed','editVersion',v_receipt.resulting_version);
  END IF;
  SELECT * INTO v_old FROM public.annabelle_workspace_state
    WHERE user_id=v_uid AND project_id=p_project_id FOR UPDATE;
  v_exists := FOUND;
  v_version := CASE WHEN v_exists THEN v_old.edit_version ELSE 0 END;
  IF v_version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'annabelle_atomic_version_conflict' USING ERRCODE='P0001';
  END IF;
  v_snapshot := CASE WHEN v_exists THEN pg_catalog.jsonb_build_object(
    'canon',v_old.canon,'lockedPassages',v_old.locked_passages,
    'sceneState',v_old.scene_state,'unresolvedDecisions',v_old.unresolved_decisions,
    'workingDelta',v_old.working_delta)
    ELSE pg_catalog.jsonb_build_object(
    'canon','[]'::jsonb,'lockedPassages','[]'::jsonb,'sceneState','[]'::jsonb,
    'unresolvedDecisions','[]'::jsonb,'workingDelta',NULL)
    END;
  INSERT INTO public.annabelle_workspace_revisions
    (id,user_id,project_id,snapshot,reason,resulting_version,request_fingerprint)
  VALUES (p_request_id,v_uid,p_project_id,v_snapshot,p_reason,v_version+1,v_fingerprint);
  IF v_exists THEN
    UPDATE public.annabelle_workspace_state SET
      canon=p_canon,locked_passages=p_locked_passages,scene_state=p_scene_state,
      unresolved_decisions=p_unresolved_decisions,working_delta=p_working_delta,
      edit_version=v_version+1,updated_at=pg_catalog.clock_timestamp()
    WHERE user_id=v_uid AND project_id=p_project_id AND edit_version=v_version;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'annabelle_atomic_version_conflict' USING ERRCODE='P0001';
    END IF;
  ELSE
    INSERT INTO public.annabelle_workspace_state
      (user_id,project_id,canon,locked_passages,scene_state,unresolved_decisions,
       working_delta,edit_version,updated_at)
    VALUES (v_uid,p_project_id,p_canon,p_locked_passages,p_scene_state,
      p_unresolved_decisions,p_working_delta,1,pg_catalog.clock_timestamp());
  END IF;
  RETURN pg_catalog.jsonb_build_object('status','committed','editVersion',v_version+1);
END;
$$;
-- PostgreSQL grants function EXECUTE to PUBLIC by default. Close that.
REVOKE ALL ON FUNCTION public.annabelle_save_workspace_atomic(
 uuid,uuid,bigint,jsonb,jsonb,jsonb,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.annabelle_save_workspace_atomic(
 uuid,uuid,bigint,jsonb,jsonb,jsonb,jsonb,text,text) TO authenticated;
COMMIT;
-- RELEASE BLOCK: legacy direct upserts/restores MUST be retired or moved to
-- this transaction first. RLS alone does not enforce edit-version preconditions.
-- Test standalone auth/project access, concurrent clients, rollback and
-- security privileges in disposable PostgreSQL BEFORE any hosted migration.
