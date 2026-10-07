-- Disposable PostgreSQL acceptance for PROPOSED Grove runtime/ARK grants.
-- NEVER apply this fixture or its synthetic identities to a live database.
\set ON_ERROR_STOP on

-- Reuse the already-reviewed disposable bootstrap so roles, auth.users and the
-- real owner/bridge/project migrations are exercised before these proposals.
\ir 00-private-transcript-acceptance.sql

\ir ../../../docs/migrations/PROPOSED_grove_runtime_capture_grants_20261006.sql
\ir ../../../docs/migrations/PROPOSED_grove_runtime_goal_write_grants_20261006.sql
\ir ../../../docs/migrations/PROPOSED_grove_ark_objective_run_grants_20261006.sql

DO $acceptance$
DECLARE
  owner_id uuid := '00000000-0000-4000-8000-000000000010';
  project_id uuid := '00000000-0000-4000-8000-000000000011';
  conversation_id uuid := '00000000-0000-4000-8000-000000000012';
  objective_id uuid := '00000000-0000-4000-8000-000000000013';
  foreign_project uuid := '00000000-0000-4000-8000-000000000014';
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'grove_private_runtime_capture_grants',
    'grove_private_runtime_goal_write_grants',
    'grove_private_ark_objective_run_grants'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NULL THEN
      RAISE EXCEPTION 'proposal table missing: %', table_name;
    END IF;
    IF NOT (SELECT relrowsecurity AND relforcerowsecurity
      FROM pg_class WHERE oid=('public.' || table_name)::regclass) THEN
      RAISE EXCEPTION 'RLS + FORCE RLS required: %', table_name;
    END IF;
    IF EXISTS(
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=table_name
    ) THEN
      RAISE EXCEPTION 'client policy unexpectedly exists: %', table_name;
    END IF;
    IF has_table_privilege('anon','public.' || table_name,'SELECT')
      OR has_table_privilege('anon','public.' || table_name,'INSERT')
      OR has_table_privilege('authenticated','public.' || table_name,'SELECT')
      OR has_table_privilege('authenticated','public.' || table_name,'INSERT')
      OR has_table_privilege('authenticated','public.' || table_name,'UPDATE')
      OR has_table_privilege('authenticated','public.' || table_name,'DELETE') THEN
      RAISE EXCEPTION 'client role can access proposal table: %', table_name;
    END IF;
    IF NOT has_table_privilege('service_role','public.' || table_name,'SELECT')
      OR NOT has_table_privilege('service_role','public.' || table_name,'INSERT')
      OR NOT has_table_privilege('service_role','public.' || table_name,'UPDATE')
      OR NOT has_table_privilege('service_role','public.' || table_name,'DELETE') THEN
      RAISE EXCEPTION 'service role lacks required proposal-table access: %', table_name;
    END IF;
  END LOOP;

  IF (SELECT count(*) FROM public.grove_private_runtime_capture_grants) <> 0
    OR (SELECT count(*) FROM public.grove_private_runtime_goal_write_grants) <> 0
    OR (SELECT count(*) FROM public.grove_private_ark_objective_run_grants) <> 0 THEN
    RAISE EXCEPTION 'proposal must seed no runtime/ARK grant';
  END IF;

  INSERT INTO auth.users(id) VALUES(owner_id);
  INSERT INTO public.grove_private_owner_access(user_id) VALUES(owner_id);
  INSERT INTO public.grove_private_firefly_bridge(grove_user_id,firefly_user_id)
    VALUES(owner_id,owner_id);
  INSERT INTO public.grove_private_ark_project_grants(
    grove_user_id,firefly_project_id
  ) VALUES(owner_id,project_id);

  BEGIN
    INSERT INTO public.grove_private_runtime_capture_grants(
      grove_user_id,firefly_user_id,firefly_project_id,
      firefly_conversation_id,purpose,expires_at
    ) VALUES(
      owner_id,owner_id,project_id,conversation_id,
      'conversation_runtime_goal',now()+interval '1 hour'
    );
    RAISE EXCEPTION 'runtime capture accepted wrong purpose';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.grove_private_runtime_goal_write_grants(
      grove_user_id,firefly_user_id,firefly_project_id,
      firefly_conversation_id,purpose,expires_at
    ) VALUES(
      owner_id,owner_id,project_id,conversation_id,
      'conversation_runtime_goal',now()-interval '1 hour'
    );
    RAISE EXCEPTION 'runtime goal accepted expired-at-creation grant';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.grove_private_ark_objective_run_grants(
      grove_user_id,firefly_user_id,firefly_project_id,
      firefly_conversation_id,ark_objective_id,purpose,expires_at
    ) VALUES(
      owner_id,owner_id,foreign_project,conversation_id,
      objective_id,'bounded_objective_execution',now()+interval '1 hour'
    );
    RAISE EXCEPTION 'ARK run accepted ungranted project';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  INSERT INTO public.grove_private_runtime_capture_grants(
    grove_user_id,firefly_user_id,firefly_project_id,
    firefly_conversation_id,purpose,expires_at
  ) VALUES(
    owner_id,owner_id,project_id,conversation_id,
    'conversation_runtime_capture',now()+interval '1 hour'
  );
  INSERT INTO public.grove_private_runtime_goal_write_grants(
    grove_user_id,firefly_user_id,firefly_project_id,
    firefly_conversation_id,purpose,expires_at
  ) VALUES(
    owner_id,owner_id,project_id,conversation_id,
    'conversation_runtime_goal',now()+interval '1 hour'
  );
  INSERT INTO public.grove_private_ark_objective_run_grants(
    grove_user_id,firefly_user_id,firefly_project_id,
    firefly_conversation_id,ark_objective_id,purpose,expires_at
  ) VALUES(
    owner_id,owner_id,project_id,conversation_id,
    objective_id,'bounded_objective_execution',now()+interval '1 hour'
  );

  UPDATE public.grove_private_runtime_capture_grants
    SET revoked_at=clock_timestamp()
    WHERE grove_user_id=owner_id AND firefly_project_id=project_id;
  IF NOT EXISTS(
    SELECT 1 FROM public.grove_private_runtime_capture_grants
    WHERE grove_user_id=owner_id AND firefly_project_id=project_id
      AND revoked_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'runtime capture revocation state not preserved';
  END IF;

  DELETE FROM public.grove_private_ark_project_grants
    WHERE grove_user_id=owner_id AND firefly_project_id=project_id;

  IF EXISTS(
    SELECT 1 FROM public.grove_private_runtime_capture_grants
    WHERE grove_user_id=owner_id
  ) OR EXISTS(
    SELECT 1 FROM public.grove_private_runtime_goal_write_grants
    WHERE grove_user_id=owner_id
  ) OR EXISTS(
    SELECT 1 FROM public.grove_private_ark_objective_run_grants
    WHERE grove_user_id=owner_id
  ) THEN
    RAISE EXCEPTION 'project-grant deletion did not cascade bounded grants';
  END IF;

  RAISE NOTICE 'GROVE_ARK_SPINE_GRANT_PROPOSALS=PASS; LIVE_GRANTS=NONE';
END
$acceptance$;
