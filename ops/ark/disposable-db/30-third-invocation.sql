-- Third independent database connection; only this stage may verify completed.
do $$
declare
 t0 timestamptz;
 target_id uuid;
 unrelated_id uuid;
 claim jsonb; completion jsonb; verified jsonb;
begin
 select c.t0 into strict t0 from public.ark_disposable_recovery_clock c;
 select id into strict target_id from public.ark_objectives
  where idempotency_key='disposable:checkpoint-recovery';
 select id into strict unrelated_id from public.ark_objectives
  where idempotency_key='disposable:unrelated';
 claim := public.ark_claim_next_task(
  'worker-three',60000,t0+interval '130 seconds','{}'::uuid[],target_id
 );
 if claim is null or claim->'task'->>'task_key' <> 'checkpoint-b'
   or (claim->'task'->>'attempt_count')::integer <> 2
   or (claim->'task'->>'checkpoint_sequence')::integer <> 1 then
   raise exception 'B did not resume: %',claim;
 end if;
 completion := public.ark_complete_task(
  (claim->'task'->>'id')::uuid,'worker-three',(claim->'task'->>'lease_token')::uuid,
  '{"verified":true,"capability":"ark.preview-checkpoint","attempts":2,"checkpointSequence":1}'::jsonb,
  t0+interval '130 seconds'
 );
 if completion->'objective'->>'status' <> 'awaiting_verification' then
   raise exception 'objective never reached verification';
 end if;
 if (select count(*) from public.ark_tasks where objective_id=target_id
    and status='completed' and attempt_count=2 and checkpoint_sequence=1
    and result->>'verified'='true'
    and lease_owner is null and lease_token is null) <> 2 then
   raise exception 'two verified recovered tasks not persisted';
 end if;
 if (select count(*) from public.ark_checkpoints where objective_id=target_id) <> 2
    or (select count(*) from public.ark_events where objective_id=target_id
       and event_type='task_checkpointed') <> 2
    or (select count(*) from public.ark_events where objective_id=target_id
       and event_type='task_completed') <> 2 then
   raise exception 'immutable checkpoint/completion event trail incorrect';
 end if;
 verified := public.ark_verify_objective(
   target_id,true,
   '{"gate":"disposable-three-independent-process-checkpoint-acceptance"}'::jsonb,
   '{}'::text[],t0+interval '130 seconds'
 );
 if verified->>'status' <> 'completed' or verified->'completion_evidence'->>'gate'
    <> 'disposable-three-independent-process-checkpoint-acceptance' then
   raise exception 'independent verification receipt missing';
 end if;
 if not exists (select 1 from public.ark_tasks where objective_id=unrelated_id
   and status='running' and attempt_count=1 and lease_owner='unrelated-worker') then
   raise exception 'unrelated lease mutated by pinned worker';
 end if;
 if (select count(*) from public.ark_events
    where objective_id=target_id and event_type='objective_completed')<>1 then
   raise exception 'objective completion event missing or duplicated';
 end if;
 if public.ark_claim_next_task(
    'worker-four',60000,t0+interval '131 seconds','{}'::uuid[],target_id
 ) is not null then
   raise exception 'completed objective was claimed twice';
 end if;
 raise notice 'PASS STAGE THREE: recovered tasks verified once; side objectives untouched';
end $$;
