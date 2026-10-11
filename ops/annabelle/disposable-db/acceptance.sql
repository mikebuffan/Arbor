-- ISOLATED PostgreSQL acceptance only. All identities and text synthetic.
-- Executed in postgres:17.6 --network none. Never on hosted Supabase.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.projects (id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id));
CREATE TABLE public.annabelle_workspace_state (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  canon jsonb NOT NULL DEFAULT '[]'::jsonb,
  locked_passages jsonb NOT NULL DEFAULT '[]'::jsonb,
  scene_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  unresolved_decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  working_delta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,project_id)
);
CREATE TABLE public.annabelle_workspace_revisions (
  id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  snapshot jsonb NOT NULL,reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annabelle_workspace_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annabelle_workspace_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_read_own ON public.projects FOR SELECT TO authenticated
  USING (auth.uid()=user_id);
CREATE POLICY state_read_own ON public.annabelle_workspace_state FOR SELECT TO authenticated
  USING (auth.uid()=user_id);
CREATE POLICY state_insert_own ON public.annabelle_workspace_state FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=user_id);
CREATE POLICY state_update_own ON public.annabelle_workspace_state FOR UPDATE TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY revision_read_own ON public.annabelle_workspace_revisions FOR SELECT TO authenticated
  USING (auth.uid()=user_id);
CREATE POLICY revision_insert_own ON public.annabelle_workspace_revisions FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=user_id);
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.annabelle_workspace_state TO authenticated;
GRANT SELECT,INSERT ON public.annabelle_workspace_revisions TO authenticated;
INSERT INTO auth.users(id) VALUES
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');
INSERT INTO public.projects(id,user_id) VALUES
  ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000002');

-- Execute the same staged SQL proposed for review, not a fake reimplementation.
\ir ../../../docs/migrations/PROPOSED_annabelle_atomic_workspace_save.sql

DO $check_grants$
BEGIN
 IF has_function_privilege('anon',
    'public.annabelle_save_workspace_atomic(uuid,uuid,bigint,jsonb,jsonb,jsonb,jsonb,text,text)',
    'EXECUTE')
    OR NOT has_function_privilege('authenticated',
    'public.annabelle_save_workspace_atomic(uuid,uuid,bigint,jsonb,jsonb,jsonb,jsonb,text,text)',
    'EXECUTE') THEN
   RAISE EXCEPTION 'annabelle_function_grants_invalid';
 END IF;
END $check_grants$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);

DO $accept$
DECLARE
  p uuid := '00000000-0000-4000-8000-000000000011';
  req uuid := '00000000-0000-4000-8000-000000000031';
  result jsonb;
BEGIN
 result:=public.annabelle_save_workspace_atomic(
   p,req,0,'["synthetic canon"]','[]','[]','[]','draft A','create');
 IF result->>'status'<>'committed' OR (result->>'editVersion')::int<>1 THEN
   RAISE EXCEPTION 'initial save failed: %',result;
 END IF;
 IF (SELECT count(*) FROM public.annabelle_workspace_revisions)<>1 THEN
   RAISE EXCEPTION 'initial revision missing';
 END IF;
 result:=public.annabelle_save_workspace_atomic(
   p,req,0,'["synthetic canon"]','[]','[]','[]','draft A','create');
 IF result->>'status'<>'replayed' OR
   (SELECT count(*) FROM public.annabelle_workspace_revisions)<>1 THEN
   RAISE EXCEPTION 'idempotent request duplicated revision';
 END IF;
 BEGIN
   PERFORM public.annabelle_save_workspace_atomic(
     p,req,0,'[]','[]','[]','[]','changed payload','create');
   RAISE EXCEPTION 'changed request UUID payload wrongly accepted';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN
   IF SQLERRM<>'annabelle_atomic_request_id_conflict' THEN RAISE; END IF;
 END;
 BEGIN
   PERFORM public.annabelle_save_workspace_atomic(
     p,'00000000-0000-4000-8000-000000000032',0,'[]','[]','[]','[]','stale','create');
   RAISE EXCEPTION 'stale edit accepted';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN
   IF SQLERRM<>'annabelle_atomic_version_conflict' THEN RAISE; END IF;
 END;
 result:=public.annabelle_save_workspace_atomic(
   p,'00000000-0000-4000-8000-000000000033',1,
   '["synthetic canon"]','[]','[]','[]','draft B','update');
 IF result->>'status'<>'committed' OR (result->>'editVersion')::int<>2 THEN
   RAISE EXCEPTION 'second save failed';
 END IF;
 IF (SELECT working_delta FROM public.annabelle_workspace_state WHERE project_id=p)
    <>'draft B'
    OR (SELECT count(*) FROM public.annabelle_workspace_revisions)<>2 THEN
   RAISE EXCEPTION 'state/revision transaction failed';
 END IF;
 result:=public.annabelle_save_workspace_atomic(
   p,req,0,'["synthetic canon"]','[]','[]','[]','draft A','create');
 IF result->>'status'<>'replayed'
    OR (SELECT working_delta FROM public.annabelle_workspace_state WHERE project_id=p)
       <>'draft B' THEN
   RAISE EXCEPTION 'old retry overwrote newer draft';
 END IF;
 BEGIN
   PERFORM public.annabelle_save_workspace_atomic(
     '00000000-0000-4000-8000-000000000022',
     '00000000-0000-4000-8000-000000000034',0,
     '[]','[]','[]','[]','wrong owner','create');
   RAISE EXCEPTION 'foreign project accepted';
 EXCEPTION WHEN SQLSTATE '42501' THEN
   IF SQLERRM<>'annabelle_atomic_project_not_owned' THEN RAISE; END IF;
 END;
 BEGIN
   PERFORM public.annabelle_save_workspace_atomic(
     p,'00000000-0000-4000-8000-000000000035',2,
     '"not a list"'::jsonb,'[]','[]','[]','invalid','create');
   RAISE EXCEPTION 'invalid payload accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN
   IF SQLERRM<>'annabelle_atomic_payload_invalid' THEN RAISE; END IF;
 END;
END $accept$;
RESET ROLE;
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.annabelle_workspace_state)<>1 OR
    (SELECT COUNT(*) FROM public.annabelle_workspace_revisions)<>2 OR
    (SELECT edit_version FROM public.annabelle_workspace_state
      WHERE project_id='00000000-0000-4000-8000-000000000011')<>2
 THEN RAISE EXCEPTION 'post-transaction state invalid'; END IF;
 RAISE NOTICE 'ANNABELLE_DISPOSABLE_SQL=PASS; HOSTED_DATABASE_UNCHANGED';
END $verify$;
