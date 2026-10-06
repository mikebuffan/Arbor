-- Disposable fixture companion only; original fixture has already run.
\set ON_ERROR_STOP on
\ir ../../../docs/migrations/PROPOSED_grove_correction_write_grants_20261006.sql
DO $test$
BEGIN
 IF (SELECT count(*) FROM public.grove_private_correction_write_grants) <> 0 THEN
   RAISE EXCEPTION 'proposal must seed no grant';
 END IF;
 IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
   WHERE oid='public.grove_private_correction_write_grants'::regclass) THEN
   RAISE EXCEPTION 'RLS required';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='grove_private_correction_write_grants')
 OR has_table_privilege('anon','grove_private_correction_write_grants','SELECT')
 OR has_table_privilege('authenticated','grove_private_correction_write_grants','INSERT') THEN
   RAISE EXCEPTION 'client access must be denied';
 END IF;
 BEGIN
   INSERT INTO grove_private_correction_write_grants(grove_user_id,firefly_user_id,firefly_project_id,
     firefly_conversation_id,purpose,expires_at)
   VALUES('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',
     '00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000005','ark_execute',now()+interval '1 hour');
   RAISE EXCEPTION 'wrong-purpose grant accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 RAISE NOTICE 'GROVE_CORRECTION_GRANT_PROPOSAL=PASS; LIVE_GRANTS=NONE';
END;
$test$;
