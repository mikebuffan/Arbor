-- Stage 1 is a separate database connection from stages 2 and 3.
do $$
declare
 u uuid := '11111111-1111-4111-8111-111111111111';
 p uuid := '22222222-2222-4222-8222-222222222222';
 t0 timestamptz;
 target jsonb; unrelated jsonb; claim jsonb; other_claim jsonb; result jsonb;
 task_a uuid;
begin
 -- Synthetic clock is intentionally ahead of creation timestamps, so new task rows are eligible.
 update public.ark_disposable_recovery_clock set t0 = clock_timestamp() + interval '10 seconds';
 select c.t0 into strict t0 from public.ark_disposable_recovery_clock c;
 target := public.ark_enqueue_objective(
  u,p,'Disposable dependent checkpoint recovery',0,
  '{"maxTasksPerCycle":2,"maxRuntimeMs":10000,"maxAttemptsPerTask":3}'::jsonb,
  'disposable:checkpoint-recovery',
  jsonb_build_array(
   jsonb_build_object('task_key','checkpoint-a','kind','ark.preview-checkpoint',
    'description','Synthetic A','dependencies','[]'::jsonb,'max_attempts',3,'idempotency_key','disposable:a'),
   jsonb_build_object('task_key','checkpoint-b','kind','ark.preview-checkpoint',
    'description','Synthetic B','dependencies','["checkpoint-a"]'::jsonb,'max_attempts',3,'idempotency_key','disposable:b')
  )
 );
 unrelated := public.ark_enqueue_objective(
  u,p,'Disposable unrelated lease isolation',0,'{}'::jsonb,
  'disposable:unrelated',
  jsonb_build_array(jsonb_build_object('task_key','unrelated','kind','canary.read',
   'description','Do not sweep this lease from the pinned worker',
   'dependencies','[]'::jsonb,'max_attempts',1,'idempotency_key','disposable:unrelated-task'))
 );
 other_claim := public.ark_claim_next_task(
  'unrelated-worker',1000,t0,'{}'::uuid[],(unrelated->>'id')::uuid
 );
 if other_claim is null then raise exception 'unrelated setup claim failed'; end if;
 claim := public.ark_claim_next_task(
  'worker-one',60000,t0,'{}'::uuid[],(target->>'id')::uuid
 );
 if claim is null or claim->'task'->>'task_key' <> 'checkpoint-a'
   or (claim->'task'->>'attempt_count')::integer <> 1 then
   raise exception 'first dependent claim failed: %', claim;
 end if;
 task_a := (claim->'task'->>'id')::uuid;
 if not public.ark_heartbeat_task(task_a,'worker-one',
    (claim->'task'->>'lease_token')::uuid,60000,t0) then
   raise exception 'first lease heartbeat failed';
 end if;
 result := public.ark_checkpoint_task(
   task_a,'worker-one',(claim->'task'->>'lease_token')::uuid,
   1,'{"phase":"waiting_for_new_worker"}'::jsonb,
   'Resume synthetic A','interruption',t0+interval '60 seconds',t0
 );
 if result->>'status' <> 'checkpointed'
   or (result->>'checkpoint_sequence')::integer <> 1 then
   raise exception 'A checkpoint did not persist';
 end if;
 if not exists (
   select 1 from public.ark_tasks
   where objective_id=(target->>'id')::uuid and task_key='checkpoint-b'
    and status='queued' and attempt_count=0
 ) then raise exception 'B incorrectly ran before A'; end if;
 if not exists (
   select 1 from public.ark_checkpoints
   where task_id=task_a and sequence=1 and state->>'phase'='waiting_for_new_worker'
 ) then raise exception 'durable A checkpoint missing'; end if;
 if (select status from public.ark_objectives where id=(target->>'id')::uuid) = 'completed' then
   raise exception 'premature objective completion';
 end if;
 raise notice 'PASS STAGE ONE: A checkpointed; B untouched';
end $$;
