-- This invocation simulates a new worker process 65 seconds later.
do $$
declare
 t0 timestamptz;
 target_id uuid;
 unrelated_id uuid;
 claim jsonb; completion jsonb; checkpoint jsonb;
begin
 select c.t0 into strict t0 from public.ark_disposable_recovery_clock c;
 select id into strict target_id from public.ark_objectives
  where idempotency_key='disposable:checkpoint-recovery';
 select id into strict unrelated_id from public.ark_objectives
  where idempotency_key='disposable:unrelated';
 claim := public.ark_claim_next_task(
   'worker-two',60000,t0+interval '65 seconds','{}'::uuid[],target_id
 );
 if claim is null or claim->'task'->>'task_key' <> 'checkpoint-a'
   or (claim->'task'->>'attempt_count')::integer <> 2
   or (claim->'task'->>'checkpoint_sequence')::integer <> 1 then
   raise exception 'A did not resume from persisted checkpoint: %',claim;
 end if;
 completion := public.ark_complete_task(
   (claim->'task'->>'id')::uuid,'worker-two',(claim->'task'->>'lease_token')::uuid,
   '{"verified":true,"capability":"ark.preview-checkpoint","attempts":2,"checkpointSequence":1}'::jsonb,
   t0+interval '65 seconds'
 );
 if completion->'objective'->>'status' = 'completed' then
   raise exception 'A alone incorrectly completed objective';
 end if;
 claim := public.ark_claim_next_task(
   'worker-two',60000,t0+interval '65 seconds','{}'::uuid[],target_id
 );
 if claim is null or claim->'task'->>'task_key' <> 'checkpoint-b'
   or (claim->'task'->>'attempt_count')::integer <> 1 then
   raise exception 'dependent B did not unlock after A: %',claim;
 end if;
 checkpoint := public.ark_checkpoint_task(
   (claim->'task'->>'id')::uuid,'worker-two',(claim->'task'->>'lease_token')::uuid,
   1,'{"phase":"waiting_for_new_worker"}'::jsonb,
   'Resume synthetic B','interruption',t0+interval '125 seconds',
   t0+interval '65 seconds'
 );
 if checkpoint->>'status' <> 'checkpointed' then
   raise exception 'B checkpoint missing';
 end if;
 if not exists (
   select 1 from public.ark_tasks where objective_id=unrelated_id
   and task_key='unrelated' and status='running' and attempt_count=1
   and lease_owner='unrelated-worker'
 ) then raise exception 'targeted recovery swept unrelated expired lease'; end if;
 if (select status from public.ark_objectives where id=target_id)='completed' then
   raise exception 'objective completed before B resumed';
 end if;
 raise notice 'PASS STAGE TWO: A resumed; B checkpointed; unrelated lease isolated';
end $$;
