-- Ephemeral Postgres only: owner isolation, idempotency, targeted claim,
-- persisted checkpoint, lease ownership, verifier gate. NO external tool runs.
do $ark_layer$
declare
  u1 uuid := '11111111-1111-1111-1111-111111111111';
  u2 uuid := '22222222-2222-2222-2222-222222222222';
  p1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  p2 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab';
  p3 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  started timestamptz := now();
  tasks jsonb := jsonb_build_array(jsonb_build_object(
    'task_key', 'read', 'kind', 'synthetic.read',
    'description', 'synthetic read only canary',
    'dependencies', '[]'::jsonb, 'payload', '{}'::jsonb,
    'max_attempts', 3, 'idempotency_key', 'read:one'
  ));
  objective jsonb;
  replay jsonb;
  other_project jsonb;
  other_owner jsonb;
  claim jsonb;
  later jsonb;
  completed jsonb;
  verified jsonb;
  task_id uuid;
  old_lease uuid;
begin
  insert into auth.users(id) values (u1), (u2);
  insert into public.projects(id,user_id) values
    (p1,u1), (p2,u1), (p3,u2);

  objective := public.ark_enqueue_objective(
    u1,p1,'bounded continuity canary',0,'{}'::jsonb,'same-idempotency',tasks
  );
  replay := public.ark_enqueue_objective(
    u1,p1,'bounded continuity canary',0,'{}'::jsonb,'same-idempotency',tasks
  );
  if objective->>'id' <> replay->>'id' then
    raise exception 'idempotent enqueue created a duplicate';
  end if;
  if (select count(*) from public.ark_tasks
      where objective_id = (objective->>'id')::uuid) <> 1 then
    raise exception 'idempotent replay added a task';
  end if;
  begin
    perform public.ark_enqueue_objective(
      u1,p1,'different goal',0,'{}'::jsonb,'same-idempotency',tasks
    );
    raise exception 'changed payload reused an idempotency key';
  exception when invalid_parameter_value then null;
  end;

  other_project := public.ark_enqueue_objective(
    u1,p2,'bounded continuity canary',0,'{}'::jsonb,'same-idempotency',tasks
  );
  other_owner := public.ark_enqueue_objective(
    u2,p3,'bounded continuity canary',0,'{}'::jsonb,'same-idempotency',tasks
  );
  if objective->>'id' = other_project->>'id'
     or objective->>'id' = other_owner->>'id' then
    raise exception 'idempotency identity leaked across ownership scope';
  end if;

  begin
    perform public.ark_enqueue_objective(
      u1,p3,'foreign project',0,'{}'::jsonb,'foreign-project',tasks
    );
    raise exception 'foreign project enqueue was accepted';
  exception when insufficient_privilege then null;
  end;

  claim := public.ark_claim_next_task(
    'worker-one',1000,started,'{}'::uuid[],(objective->>'id')::uuid
  );
  if (claim->'objective'->>'id') <> objective->>'id'
     or claim->'task'->>'lease_owner' <> 'worker-one' then
    raise exception 'targeted claim did not preserve objective identity';
  end if;
  if (select count(*) from public.ark_tasks
      where objective_id = (other_project->>'id')::uuid
        and status <> 'queued') <> 0 then
    raise exception 'targeted claim consumed a second project';
  end if;
  task_id := (claim->'task'->>'id')::uuid;
  old_lease := (claim->'task'->>'lease_token')::uuid;

  begin
    perform public.ark_verify_objective(
      (objective->>'id')::uuid,true,'{"proof":"premature"}'::jsonb,
      '{}'::text[],started
    );
    raise exception 'unfinished objective was marked complete';
  exception when serialization_failure then null;
  end;

  perform public.ark_checkpoint_task(
    task_id,'worker-one',old_lease,1,'{"cursor":7}'::jsonb,
    'resume cursor 7','interruption',
    started + interval '500 milliseconds',
    started + interval '100 milliseconds'
  );
  if (select count(*) from public.ark_checkpoints
      where objective_id = (objective->>'id')::uuid
        and sequence = 1 and next_action = 'resume cursor 7'
        and state->>'cursor' = '7') <> 1 then
    raise exception 'durable checkpoint receipt missing';
  end if;

  later := public.ark_claim_next_task(
    'worker-two',1000,started + interval '1 second',
    '{}'::uuid[],(objective->>'id')::uuid
  );
  if later->'task'->>'id' <> task_id::text
     or (later->'task'->>'attempt_count')::integer <> 2
     or (later->'task'->>'checkpoint_sequence')::integer <> 1 then
    raise exception 'checkpoint resume did not retain task identity';
  end if;

  begin
    perform public.ark_complete_task(
      task_id,'worker-one',old_lease,'{"verified":true}'::jsonb,
      started + interval '1 second'
    );
    raise exception 'stale lease completed after handoff';
  exception when serialization_failure then null;
  end;

  completed := public.ark_complete_task(
    task_id,'worker-two',(later->'task'->>'lease_token')::uuid,
    '{"verified":true,"capability":"synthetic.read"}'::jsonb,
    started + interval '1 second'
  );
  if completed->'objective'->>'status' <> 'awaiting_verification' then
    raise exception 'task completion bypassed verifier gate';
  end if;

  verified := public.ark_verify_objective(
    (objective->>'id')::uuid,true,
    '{"gate":"isolated-ark-layer-continuity"}'::jsonb,
    '{}'::text[],started + interval '1 second'
  );
  if verified->>'status' <> 'completed'
     or verified->'completion_evidence'->>'gate'
         <> 'isolated-ark-layer-continuity' then
    raise exception 'completion was not evidenced';
  end if;
  if public.ark_claim_next_task(
    'worker-three',1000,started + interval '2 seconds',
    '{}'::uuid[],(objective->>'id')::uuid
  ) is not null then
    raise exception 'completed work was claimed a second time';
  end if;

  if (select count(*) from public.ark_events
      where objective_id = (objective->>'id')::uuid
        and event_type = 'objective_completed') <> 1 then
    raise exception 'completion event absent or duplicated';
  end if;
  raise notice 'isolated ARK continuity: enqueue, scope, checkpoint, lease and verifier passed';
end
$ark_layer$;

-- RLS uses the real authenticated database role and the JWT subject.
set role authenticated;
set "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
do $owner_one$
begin
  if (select count(*) from public.ark_objectives) <> 2
     or (select count(*) from public.ark_tasks) <> 2 then
    raise exception 'owner one cannot read exactly its own two projects';
  end if;
  if (select count(*) from public.ark_objectives
      where user_id = '22222222-2222-2222-2222-222222222222') <> 0 then
    raise exception 'RLS leaked second owner objectives';
  end if;
end
$owner_one$;
reset role;

set role authenticated;
set "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
do $owner_two$
begin
  if (select count(*) from public.ark_objectives) <> 1
     or (select count(*) from public.ark_tasks) <> 1 then
    raise exception 'owner two cannot read exactly its own project';
  end if;
  if (select count(*) from public.ark_checkpoints) <> 0 then
    raise exception 'RLS leaked foreign owner checkpoint';
  end if;
end
$owner_two$;
reset role;
select 'isolated_ark_layer_continuity_smoke_passed' as acceptance;
