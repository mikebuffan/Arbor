\set ON_ERROR_STOP on
-- Synthetic-only acceptance for atomic "hand Arbor the reins" run contracts.
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

do $$
declare first jsonb;
        replay jsonb;
        binding jsonb;
        v_run_id uuid;
        v_session_id uuid;
        v_objective_id uuid;
begin
  first:=public.arbor_start_research_reins_run(
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '90909090-9090-4090-8090-909090909090',
    'Synthetic three-hour Arbor reins goal',
    180,
    40,
    100
  );

  if first->>'accepted' <> 'true'
     or first->>'replayed' <> 'false'
     or first->>'executionStarted' <> 'false'
     or first->>'sourceScope' <> 'project_history'
     or first->>'authorizationVersion' <> 'reins-project-history-v1'
  then
    raise exception 'first reins run receipt invalid: %',first;
  end if;

  v_run_id:=(first->>'runId')::uuid;
  v_session_id:=(first->>'sessionId')::uuid;
  v_objective_id:=(first->>'objectiveId')::uuid;

  if (select count(*) from public.arbor_research_sessions
      where id=v_session_id
        and user_id='11111111-1111-4111-8111-111111111111'
        and project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        and authorized
        and not cancellation_requested
        and deadline_at > started_at
        and deadline_at <= started_at+interval '4 hours') <> 1
  then raise exception 'bounded research session not created'; end if;

  if (select count(*) from public.ark_objectives
      where id=v_objective_id
        and user_id='11111111-1111-4111-8111-111111111111'
        and project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        and status='queued') <> 1
  then raise exception 'ARK reins objective not created'; end if;

  if (select count(*) from public.ark_tasks
      where v_objective_id=v_objective_id
        and task_key='controller'
        and kind='research.controller.tick'
        and status='queued'
        and attempt_count=0
        and max_attempts=12
        and payload->>'sessionId'=v_session_id::text) <> 1
  then raise exception 'exactly one queued ARK controller task not created'; end if;

  if (select count(*) from public.ark_checkpoints
      where v_objective_id=v_objective_id) <> 0
  then raise exception 'starting a reins run unexpectedly began execution'; end if;

  replay:=public.arbor_start_research_reins_run(
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '90909090-9090-4090-8090-909090909090',
    'Synthetic three-hour Arbor reins goal',
    180,
    40,
    100
  );

  if replay->>'replayed' <> 'true'
     or (replay->>'runId')::uuid <> v_run_id
     or (replay->>'sessionId')::uuid <> v_session_id
     or (replay->>'objectiveId')::uuid <> v_objective_id
     or (select count(*) from public.arbor_research_reins_runs
         where client_request_id='90909090-9090-4090-8090-909090909090') <> 1
     or (select count(*) from public.ark_tasks
         where v_objective_id=v_objective_id) <> 1
  then raise exception 'reins run replay was not idempotent: %',replay; end if;

  binding:=public.arbor_load_research_reins_binding(v_run_id);
  if binding->>'userId' <> '11111111-1111-4111-8111-111111111111'
     or binding->>'projectId' <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     or (binding->>'sessionId')::uuid <> v_session_id
     or (binding->>'objectiveId')::uuid <> v_objective_id
     or binding->>'taskStatus' <> 'queued'
     or binding->>'objectiveStatus' <> 'queued'
     or binding->>'sourceScope' <> 'project_history'
     or binding->>'sessionAuthorized' <> 'true'
     or binding->>'cancellationRequested' <> 'false'
  then raise exception 'trusted reins binding readback invalid: %',binding; end if;

  begin
    perform public.arbor_start_research_reins_run(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '90909090-9090-4090-8090-909090909090',
      'Changed goal under the same request id',
      180,40,100
    );
    raise exception 'idempotency payload mismatch was accepted';
  exception when others then
    if sqlerrm not like '%research_reins_idempotency_payload_mismatch%' then
      raise;
    end if;
  end;
end $$;

-- Prove transaction rollback if the underlying ARK idempotency contract rejects.
select public.ark_enqueue_objective(
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Preexisting incompatible ARK request',
  0,
  '{"maxTasksPerCycle":1,"maxRuntimeMs":20000,"maxAttemptsPerTask":12}'::jsonb,
  'research-reins:91919191-9191-4191-8191-919191919191',
  '[{
    "task_key":"different",
    "kind":"research.controller.tick",
    "description":"Incompatible preexisting task",
    "dependencies":[],
    "payload":{"sessionId":"00000000-0000-4000-8000-000000000000"},
    "max_attempts":12,
    "idempotency_key":"incompatible-task"
  }]'::jsonb
);

do $$
begin
  begin
    perform public.arbor_start_research_reins_run(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '91919191-9191-4191-8191-919191919191',
      'Atomic rollback target',
      60,10,10
    );
    raise exception 'incompatible ARK idempotency request was accepted';
  exception when others then
    if sqlerrm not like '%ark_idempotency_payload_mismatch%' then
      raise;
    end if;
  end;

  if (select count(*) from public.arbor_research_sessions
      where objective='Atomic rollback target') <> 0
     or (select count(*) from public.arbor_research_reins_runs
         where client_request_id='91919191-9191-4191-8191-919191919191') <> 0
  then raise exception 'failed ARK enqueue left a partial reins run'; end if;
end $$;

select 'DISPOSABLE_RESEARCH_REINS_RUN=PASS; ATOMIC=TRUE; IDEMPOTENT=TRUE; EXECUTION_STARTED=FALSE' as receipt;
