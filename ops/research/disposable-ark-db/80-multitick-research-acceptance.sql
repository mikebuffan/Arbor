\set ON_ERROR_STOP on
-- Synthetic-only disposable PostgreSQL acceptance for shared ARK multi-tick research.
-- Loads the real checked-in ARK schema/functions, then the source-review proposal.
-- NO Preview/production database, external source, private data, or publication.

-- Objective A: one research.session.tick task with max_attempts=2.
-- Valid persisted research checkpoints must reopen the retry window so 4+ ticks
-- can occur without pretending checkpointed work is a failed attempt.
insert into public.ark_objectives
(id,user_id,project_id,goal,status,priority,budget,idempotency_key,request_hash)
values
('81818181-8181-4181-8181-818181818181',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic multi-tick research acceptance',
 'queued',0,
 '{"maxTasksPerCycle":1,"maxRuntimeMs":20000,"maxAttemptsPerTask":2}'::jsonb,
 'synthetic-multitick-objective',
 '11111111111111111111111111111111');

insert into public.ark_tasks
(id,objective_id,user_id,project_id,task_key,kind,description,status,payload,max_attempts,idempotency_key,available_at)
values
('81111111-1111-4111-8111-111111111111',
 '81818181-8181-4181-8181-818181818181',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'research','research.session.tick',
 'Synthetic bounded research session tick',
 'queued','{"sessionId":"synthetic-multitick"}'::jsonb,2,
 'synthetic-multitick-task',clock_timestamp()-interval '1 second');

-- Two successful ticks before a client restart.
do $$
declare
  i integer;
  c jsonb;
  lease uuid;
  n timestamptz;
begin
  for i in 1..2 loop
    n := clock_timestamp();
    c := public.ark_claim_next_task(
      'research-worker-'||i,30000,n,'{}'::uuid[],
      '81818181-8181-4181-8181-818181818181'::uuid
    );
    if c is null
       or c->'task'->>'id' <> '81111111-1111-4111-8111-111111111111'
       or (c->'task'->>'attempt_count')::integer <> 1
    then raise exception 'multi-tick claim % failed: %',i,c; end if;
    lease := (c->'task'->>'lease_token')::uuid;

    perform public.ark_checkpoint_task(
      '81111111-1111-4111-8111-111111111111'::uuid,
      'research-worker-'||i,lease,i,
      jsonb_build_object(
        'kind','research_session_reference',
        'sessionId','synthetic-multitick',
        'authorizationVersion','v1',
        'latestEvidenceRefs',jsonb_build_array('synthetic:evidence:'||i),
        'unresolvedRequiredWork',10-i,
        'independentReviewVerified',false
      ),
      'Resume next synthetic research tick',
      'executor',n,n
    );

    if (select attempt_count from public.ark_tasks
        where id='81111111-1111-4111-8111-111111111111') <> 0
       or (select checkpoint_sequence from public.ark_tasks
           where id='81111111-1111-4111-8111-111111111111') <> i
       or (select status from public.ark_tasks
           where id='81111111-1111-4111-8111-111111111111') <> 'checkpointed'
    then raise exception 'successful research checkpoint % did not reopen retry window',i; end if;
  end loop;
end $$;

-- Simulate a fresh worker/client connection. Only persisted DB state survives.
\connect arbor_synthetic

-- Objective B is unrelated stale work. A targeted claim for A must NOT sweep it.
insert into public.ark_objectives
(id,user_id,project_id,goal,status,priority,budget,idempotency_key,request_hash)
values
('82828282-8282-4282-8282-828282828282',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic unrelated stale objective',
 'running',0,
 '{"maxTasksPerCycle":1,"maxRuntimeMs":20000,"maxAttemptsPerTask":2}'::jsonb,
 'synthetic-unrelated-objective',
 '22222222222222222222222222222222');

insert into public.ark_tasks
(id,objective_id,user_id,project_id,task_key,kind,description,status,attempt_count,max_attempts,idempotency_key,available_at,lease_owner,lease_token,lease_expires_at,heartbeat_at)
values
('82222222-2222-4222-8222-222222222222',
 '82828282-8282-4282-8282-828282828282',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'stale','synthetic.stale','Synthetic unrelated expired lease',
 'running',2,2,'synthetic-unrelated-task',
 clock_timestamp()-interval '1 minute','other-worker',gen_random_uuid(),
 clock_timestamp()-interval '1 second',clock_timestamp()-interval '1 minute');

-- Tick 3: targeted claim A must leave objective/task B untouched.
do $$
declare c jsonb; lease uuid; n timestamptz;
begin
  n:=clock_timestamp();
  c:=public.ark_claim_next_task(
    'research-worker-3',30000,n,'{}'::uuid[],
    '81818181-8181-4181-8181-818181818181'::uuid
  );
  if c is null or c->'task'->>'id' <> '81111111-1111-4111-8111-111111111111'
     or (c->'task'->>'attempt_count')::integer <> 1
  then raise exception 'post-restart tick 3 claim failed %',c; end if;

  if (select status from public.ark_tasks where id='82222222-2222-4222-8222-222222222222') <> 'running'
     or (select status from public.ark_objectives where id='82828282-8282-4282-8282-828282828282') <> 'running'
  then raise exception 'targeted claim swept unrelated expired objective'; end if;

  lease:=(c->'task'->>'lease_token')::uuid;
  perform public.ark_checkpoint_task(
    '81111111-1111-4111-8111-111111111111'::uuid,
    'research-worker-3',lease,3,
    '{"kind":"research_session_reference","sessionId":"synthetic-multitick","authorizationVersion":"v1","latestEvidenceRefs":["synthetic:evidence:3"],"unresolvedRequiredWork":7,"independentReviewVerified":false}'::jsonb,
    'Resume next synthetic research tick','executor',n,n
  );
end $$;

-- When B itself is targeted, its expired/exhausted lease is cleaned up and its
-- own objective fails, without touching A.
do $$
declare c jsonb;
begin
  c:=public.ark_claim_next_task(
    'scope-cleaner-b',30000,clock_timestamp(),'{}'::uuid[],
    '82828282-8282-4282-8282-828282828282'::uuid
  );
  if c is not null then raise exception 'exhausted stale objective unexpectedly claimed %',c; end if;
  if (select status from public.ark_tasks where id='82222222-2222-4222-8222-222222222222') <> 'failed'
     or (select status from public.ark_objectives where id='82828282-8282-4282-8282-828282828282') <> 'failed'
     or (select status from public.ark_objectives where id='81818181-8181-4181-8181-818181818181') <> 'checkpointed'
  then raise exception 'targeted stale cleanup scope wrong'; end if;
end $$;

-- Tick 4 proves more successful resumptions than max_attempts=2 are possible.
do $$
declare c jsonb; lease uuid; n timestamptz;
begin
  n:=clock_timestamp();
  c:=public.ark_claim_next_task(
    'research-worker-4',30000,n,'{}'::uuid[],
    '81818181-8181-4181-8181-818181818181'::uuid
  );
  if c is null or (c->'task'->>'attempt_count')::integer <> 1
  then raise exception 'tick 4 claim failed %',c; end if;
  lease:=(c->'task'->>'lease_token')::uuid;
  perform public.ark_checkpoint_task(
    '81111111-1111-4111-8111-111111111111'::uuid,
    'research-worker-4',lease,4,
    '{"kind":"research_session_reference","sessionId":"synthetic-multitick","authorizationVersion":"v1","latestEvidenceRefs":["synthetic:evidence:4"],"unresolvedRequiredWork":6,"independentReviewVerified":false}'::jsonb,
    'Resume next synthetic research tick','executor',n,n
  );
  if (select count(*) from public.ark_checkpoints
      where task_id='81111111-1111-4111-8111-111111111111') <> 4
     or (select attempt_count from public.ark_tasks
         where id='81111111-1111-4111-8111-111111111111') <> 0
  then raise exception '4-tick persisted checkpoint evidence wrong'; end if;
end $$;

-- A real failure consumes an attempt. A later successful persisted checkpoint
-- reopens the window; two consecutive failures after that still exhaust max=2.
do $$
declare c jsonb; lease uuid; n timestamptz;
begin
  n:=clock_timestamp();
  c:=public.ark_claim_next_task('failure-window-1',30000,n,'{}'::uuid[],
    '81818181-8181-4181-8181-818181818181'::uuid);
  lease:=(c->'task'->>'lease_token')::uuid;
  perform public.ark_fail_task(
    '81111111-1111-4111-8111-111111111111'::uuid,
    'failure-window-1',lease,'synthetic injected failure',
    n+interval '1 minute',n
  );
  if (select status from public.ark_tasks where id='81111111-1111-4111-8111-111111111111') <> 'queued'
     or (select attempt_count from public.ark_tasks where id='81111111-1111-4111-8111-111111111111') <> 1
  then raise exception 'first injected failure did not consume one attempt'; end if;
end $$;

update public.ark_tasks set available_at=clock_timestamp()-interval '1 second'
where id='81111111-1111-4111-8111-111111111111';

do $$
declare c jsonb; lease uuid; n timestamptz;
begin
  n:=clock_timestamp();
  c:=public.ark_claim_next_task('failure-recovery',30000,n,'{}'::uuid[],
    '81818181-8181-4181-8181-818181818181'::uuid);
  if (c->'task'->>'attempt_count')::integer <> 2
  then raise exception 'failure recovery did not retain consumed attempt %',c; end if;
  lease:=(c->'task'->>'lease_token')::uuid;
  perform public.ark_checkpoint_task(
    '81111111-1111-4111-8111-111111111111'::uuid,
    'failure-recovery',lease,5,
    '{"kind":"research_session_reference","sessionId":"synthetic-multitick","authorizationVersion":"v1","latestEvidenceRefs":["synthetic:evidence:5"],"unresolvedRequiredWork":5,"independentReviewVerified":false}'::jsonb,
    'Resume after persisted recovery receipt','executor',n,n
  );
  if (select attempt_count from public.ark_tasks where id='81111111-1111-4111-8111-111111111111') <> 0
  then raise exception 'successful recovery checkpoint did not reset retry window'; end if;
end $$;

-- Consecutive failures with no successful persisted checkpoint still terminate.
do $$
declare c jsonb; lease uuid; n timestamptz;
begin
  n:=clock_timestamp();
  c:=public.ark_claim_next_task('terminal-failure-1',30000,n,'{}'::uuid[],
    '81818181-8181-4181-8181-818181818181'::uuid);
  lease:=(c->'task'->>'lease_token')::uuid;
  perform public.ark_fail_task(
    '81111111-1111-4111-8111-111111111111'::uuid,
    'terminal-failure-1',lease,'synthetic failure one',
    n+interval '1 minute',n
  );
end $$;
update public.ark_tasks set available_at=clock_timestamp()-interval '1 second'
where id='81111111-1111-4111-8111-111111111111';

do $$
declare c jsonb; lease uuid; n timestamptz;
begin
  n:=clock_timestamp();
  c:=public.ark_claim_next_task('terminal-failure-2',30000,n,'{}'::uuid[],
    '81818181-8181-4181-8181-818181818181'::uuid);
  if (c->'task'->>'attempt_count')::integer <> 2
  then raise exception 'terminal second attempt missing %',c; end if;
  lease:=(c->'task'->>'lease_token')::uuid;
  perform public.ark_fail_task(
    '81111111-1111-4111-8111-111111111111'::uuid,
    'terminal-failure-2',lease,'synthetic failure two',
    n+interval '1 minute',n
  );
  if (select status from public.ark_tasks where id='81111111-1111-4111-8111-111111111111') <> 'failed'
     or (select status from public.ark_objectives where id='81818181-8181-4181-8181-818181818181') <> 'failed'
  then raise exception 'consecutive real failures did not exhaust bounded retry budget'; end if;
end $$;

-- Negative control: a normal budget checkpoint does NOT receive the special
-- research persisted-receipt retry reset.
insert into public.ark_objectives
(id,user_id,project_id,goal,status,priority,budget,idempotency_key,request_hash)
values
('84848484-8484-4484-8484-848484848484',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic checkpoint reset negative control','queued',0,
 '{"maxTasksPerCycle":1,"maxRuntimeMs":20000,"maxAttemptsPerTask":2}'::jsonb,
 'synthetic-negative-reset-objective','44444444444444444444444444444444');
insert into public.ark_tasks
(id,objective_id,user_id,project_id,task_key,kind,description,status,max_attempts,idempotency_key,available_at)
values
('84444444-4444-4444-8444-444444444444',
 '84848484-8484-4484-8484-848484848484',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'negative','research.session.tick','Synthetic negative reset control',
 'queued',2,'synthetic-negative-reset-task',clock_timestamp()-interval '1 second');

do $$
declare c jsonb; lease uuid; n timestamptz;
begin
  n:=clock_timestamp();
  c:=public.ark_claim_next_task('negative-reset-worker',30000,n,'{}'::uuid[],
    '84848484-8484-4484-8484-848484848484'::uuid);
  lease:=(c->'task'->>'lease_token')::uuid;
  perform public.ark_checkpoint_task(
    '84444444-4444-4444-8444-444444444444'::uuid,
    'negative-reset-worker',lease,1,
    '{"kind":"research_session_reference","authorizationVersion":"v1","latestEvidenceRefs":["synthetic:negative"]}'::jsonb,
    'Ordinary budget checkpoint','budget',n,n
  );
  if (select attempt_count from public.ark_tasks where id='84444444-4444-4444-8444-444444444444') <> 1
  then raise exception 'non-executor checkpoint incorrectly reset retry budget'; end if;
end $$;

-- STOP/no-settle: once an authoritative objective is cancelled, a stale worker
-- holding a still-valid lease cannot heartbeat or settle over that STOP state.
insert into public.ark_objectives
(id,user_id,project_id,goal,status,priority,budget,idempotency_key,request_hash)
values
('83838383-8383-4383-8383-838383838383',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic STOP no-settle acceptance','queued',0,
 '{"maxTasksPerCycle":1,"maxRuntimeMs":20000,"maxAttemptsPerTask":3}'::jsonb,
 'synthetic-stop-objective','33333333333333333333333333333333');
insert into public.ark_tasks
(id,objective_id,user_id,project_id,task_key,kind,description,status,max_attempts,idempotency_key,available_at)
values
('83333333-3333-4333-8333-333333333333',
 '83838383-8383-4383-8383-838383838383',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'stop','research.session.tick','Synthetic stopped leased tick',
 'queued',3,'synthetic-stop-task',clock_timestamp()-interval '1 second');

do $$
declare c jsonb; lease uuid; n timestamptz; settlement_events integer;
begin
  n:=clock_timestamp();
  c:=public.ark_claim_next_task('stale-stop-worker',30000,n,'{}'::uuid[],
    '83838383-8383-4383-8383-838383838383'::uuid);
  lease:=(c->'task'->>'lease_token')::uuid;

  update public.ark_objectives set status='cancelled',updated_at=clock_timestamp()
  where id='83838383-8383-4383-8383-838383838383';

  if public.ark_heartbeat_task(
      '83333333-3333-4333-8333-333333333333'::uuid,
      'stale-stop-worker',lease,30000,clock_timestamp())
  then raise exception 'stale worker heartbeat survived authoritative STOP'; end if;

  begin
    perform public.ark_checkpoint_task(
      '83333333-3333-4333-8333-333333333333'::uuid,
      'stale-stop-worker',lease,1,
      '{"kind":"research_session_reference","authorizationVersion":"v1","latestEvidenceRefs":["synthetic:should-not-settle"]}'::jsonb,
      'must not settle','executor',clock_timestamp(),clock_timestamp());
    raise exception 'checkpoint settled after STOP';
  exception when sqlstate '40001' then null; end;

  begin
    perform public.ark_complete_task(
      '83333333-3333-4333-8333-333333333333'::uuid,
      'stale-stop-worker',lease,'{"verified":false}'::jsonb,clock_timestamp());
    raise exception 'completion settled after STOP';
  exception when sqlstate '40001' then null; end;

  begin
    perform public.ark_block_task(
      '83333333-3333-4333-8333-333333333333'::uuid,
      'stale-stop-worker',lease,'{"kind":"synthetic"}'::jsonb,clock_timestamp());
    raise exception 'block settled after STOP';
  exception when sqlstate '40001' then null; end;

  begin
    perform public.ark_fail_task(
      '83333333-3333-4333-8333-333333333333'::uuid,
      'stale-stop-worker',lease,'synthetic stale failure',
      clock_timestamp()+interval '1 minute',clock_timestamp());
    raise exception 'failure settled after STOP';
  exception when sqlstate '40001' then null; end;

  if (select status from public.ark_objectives where id='83838383-8383-4383-8383-838383838383') <> 'cancelled'
     or (select status from public.ark_tasks where id='83333333-3333-4333-8333-333333333333') <> 'running'
     or (select count(*) from public.ark_checkpoints where task_id='83333333-3333-4333-8333-333333333333') <> 0
  then raise exception 'STOP state was overwritten by stale settlement'; end if;

  select count(*) into settlement_events from public.ark_events
  where task_id='83333333-3333-4333-8333-333333333333'
    and event_type <> 'task_claimed';
  if settlement_events <> 0 then
    raise exception 'stale settlement event persisted after STOP: %',settlement_events;
  end if;
end $$;


-- Controller checkpoints receive a fresh retry window ONLY after a persisted
-- research receipt. Wait/no-claim controller checkpoints keep cumulative attempts.
insert into public.ark_objectives
(id,user_id,project_id,goal,status,priority,budget,idempotency_key,request_hash)
values
('85858585-8585-4585-8585-858585858585',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic controller retry-window acceptance',
 'queued',0,
 '{"maxTasksPerCycle":1,"maxRuntimeMs":20000,"maxAttemptsPerTask":2}'::jsonb,
 'synthetic-controller-retry-objective',
 '55555555555555555555555555555555');

insert into public.ark_tasks
(id,objective_id,user_id,project_id,task_key,kind,description,status,max_attempts,idempotency_key,available_at)
values
('85555555-5555-4555-8555-555555555555',
 '85858585-8585-4585-8585-858585858585',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'controller','research.controller.tick',
 'Synthetic Arbor reins controller pulse',
 'queued',2,'synthetic-controller-retry-task',
 clock_timestamp()-interval '1 second');

do $$
declare c jsonb; lease uuid; n timestamptz;
begin
  n:=clock_timestamp();
  c:=public.ark_claim_next_task(
    'controller-progress-worker',30000,n,'{}'::uuid[],
    '85858585-8585-4585-8585-858585858585'::uuid
  );
  if c is null or (c->'task'->>'attempt_count')::integer <> 1 then
    raise exception 'controller progress claim failed %',c;
  end if;
  lease:=(c->'task'->>'lease_token')::uuid;

  perform public.ark_checkpoint_task(
    '85555555-5555-4555-8555-555555555555'::uuid,
    'controller-progress-worker',lease,1,
    '{
      "kind":"research_controller_reference",
      "authorizationVersion":"synthetic-v1",
      "receiptPersisted":true,
      "latestEvidenceRefs":["synthetic:controller:evidence"],
      "unresolvedRequiredWork":3,
      "independentReviewVerified":false
    }'::jsonb,
    'Resume controller after persisted research receipt',
    'executor',n,n
  );

  if (select attempt_count from public.ark_tasks
      where id='85555555-5555-4555-8555-555555555555') <> 0
  then raise exception 'persisted controller progress did not reopen retry window'; end if;
end $$;

do $$
declare c jsonb; lease uuid; n timestamptz;
begin
  n:=clock_timestamp();
  c:=public.ark_claim_next_task(
    'controller-wait-worker',30000,n,'{}'::uuid[],
    '85858585-8585-4585-8585-858585858585'::uuid
  );
  if c is null or (c->'task'->>'attempt_count')::integer <> 1 then
    raise exception 'controller wait claim failed %',c;
  end if;
  lease:=(c->'task'->>'lease_token')::uuid;

  perform public.ark_checkpoint_task(
    '85555555-5555-4555-8555-555555555555'::uuid,
    'controller-wait-worker',lease,2,
    '{
      "kind":"research_controller_wait_reference",
      "authorizationVersion":"synthetic-v1",
      "receiptPersisted":false,
      "latestEvidenceRefs":[],
      "unresolvedRequiredWork":3,
      "independentReviewVerified":false
    }'::jsonb,
    'Wait before another controller attempt',
    'dependency',n,n
  );

  if (select attempt_count from public.ark_tasks
      where id='85555555-5555-4555-8555-555555555555') <> 1
  then raise exception 'controller no-progress checkpoint incorrectly reset attempts'; end if;
end $$;

select 'DISPOSABLE_ARK_MULTITICK_RESEARCH=PASS; TICKS=5+; RESTART=PASS; TARGET_SCOPE=PASS; RETRY_BUDGET=PASS; STOP_NO_SETTLE=PASS; CONTROLLER_RETRY_WINDOW=PASS' as receipt;
