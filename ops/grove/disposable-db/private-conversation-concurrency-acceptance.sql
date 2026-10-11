-- ISOLATED DISPOSABLE POSTGRES ONLY. Synthetic IDs; no live database.
\set ON_ERROR_STOP on
\ir private-conversation-deletion-acceptance.sql
CREATE EXTENSION dblink;
UPDATE public.grove_private_ark_project_grants SET revoked_at=NULL
WHERE grove_user_id='00000000-0000-4000-8000-000000000001'
  AND firefly_project_id='00000000-0000-4000-8000-000000000003';
INSERT INTO public.grove_private_turns(
 grove_user_id,firefly_project_id,firefly_conversation_id,
 request_id,user_text,assistant_text,reply_verification)
VALUES(
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000003',
 '00000000-0000-4000-8000-000000000021',
 '00000000-0000-4000-8000-000000000022',
 'Previously saved synthetic','Before delete','unverified_model_text');
CREATE FUNCTION public.grove_test_pause_target_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $pause$
BEGIN
 IF OLD.firefly_conversation_id='00000000-0000-4000-8000-000000000021'::uuid
   AND OLD.request_id='00000000-0000-4000-8000-000000000022'::uuid THEN
   PERFORM pg_catalog.pg_sleep(5);
 END IF;
 RETURN OLD;
END;
$pause$;
CREATE TRIGGER grove_test_pause_target_delete
 BEFORE DELETE ON public.grove_private_turns
 FOR EACH ROW EXECUTE FUNCTION public.grove_test_pause_target_delete();

DO $concurrency_test$
DECLARE
  i integer;
  paused boolean := false;
  accepted integer;
  result jsonb;
BEGIN
  PERFORM public.dblink_connect('deleter',
    'dbname=postgres user=postgres application_name=grove_delete_worker');
  PERFORM public.dblink_connect('writer',
    'dbname=postgres user=postgres application_name=grove_late_writer');
  -- B starts deleting and waits inside BEFORE DELETE after the statement
  -- snapshot exists, while its tombstone is still uncommitted.
  PERFORM public.dblink_send_query('deleter', $q$
    SELECT public.grove_private_delete_conversation(
      '00000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000003'::uuid,
      '00000000-0000-4000-8000-000000000021'::uuid)
  $q$);
  FOR i IN 1..100 LOOP
    SELECT EXISTS(SELECT 1 FROM pg_catalog.pg_stat_activity
      WHERE application_name='grove_delete_worker'
        AND wait_event='PgSleep') INTO paused;
    EXIT WHEN paused;
    PERFORM pg_catalog.pg_sleep(0.05);
  END LOOP;
  IF NOT paused THEN
    RAISE EXCEPTION 'could not synchronize DELETE at test trigger';
  END IF;
  -- A tries inserting a NEW row after B's DELETE snapshot.
  PERFORM public.dblink_send_query('writer', $q$
    INSERT INTO public.grove_private_turns(
      grove_user_id,firefly_project_id,firefly_conversation_id,
      request_id,user_text,assistant_text,reply_verification)
    VALUES (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000023',
      'Late synthetic message','Must be rejected','unverified_model_text')
    RETURNING 1
  $q$);
  SELECT was_accepted INTO accepted
    FROM public.dblink_get_result('writer',false)
      AS accepted_record(was_accepted integer);
  SELECT deletion_response INTO result
    FROM public.dblink_get_result('deleter')
      AS delete_record(deletion_response jsonb);
  IF accepted IS NOT NULL THEN
    RAISE EXCEPTION 'concurrent late model turn committed';
  END IF;
  IF result->>'status' <> 'deleted' THEN
    RAISE EXCEPTION 'owner deletion was not confirmed';
  END IF;
  PERFORM public.dblink_disconnect('writer');
  PERFORM public.dblink_disconnect('deleter');
END;
$concurrency_test$;

DO $check$
BEGIN
 IF EXISTS (SELECT 1 FROM public.grove_private_turns
      WHERE grove_user_id='00000000-0000-4000-8000-000000000001'
        AND firefly_conversation_id=
            '00000000-0000-4000-8000-000000000021') THEN
   RAISE EXCEPTION 'a deleted conversation resurrected during concurrency';
 END IF;
 IF (SELECT count(*) FROM public.grove_private_turns
      WHERE grove_user_id='00000000-0000-4000-8000-000000000001'
        AND firefly_conversation_id=
            '00000000-0000-4000-8000-000000000009') <> 1 THEN
   RAISE EXCEPTION 'deleting one conversation damaged another';
 END IF;
 RAISE NOTICE 'GROVE_DELETE_TWO_SESSION_CONCURRENCY=PASS; LIVE_MIGRATION=HOLD';
END;
$check$;
