\set ON_ERROR_STOP on
-- Synthetic-only durable resume-state round trip.
-- Proves a checkpointed research unit can carry executor state across a fresh lease.
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.arbor_research_sessions
(id,user_id,project_id,objective,status,started_at,deadline_at,
 max_work_units,max_cost_cents,authorized,unresolved_required_work)
values
('86868686-8686-4686-8686-868686868686',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic resumable pattern-hop receipt',
 'queued',
 clock_timestamp()-interval '1 minute',
 clock_timestamp()+interval '3 hours',
 4,10,true,1);

insert into public.arbor_research_units
(id,session_id,user_id,project_id,unit_key,kind,payload,status,
 max_cost_reservation_cents,max_attempts,available_at)
values
('86666666-6666-4666-8666-666666666666',
 '86868686-8686-4686-8686-868686868686',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'pattern-hop-resume',
 'research.pattern_hop',
 '{"seed":"synthetic resume evidence","maxDepth":2,"maxHopsPerAttempt":2}'::jsonb,
 'queued',0,4,clock_timestamp()-interval '1 second');

do $$
declare c jsonb;
        lease uuid;
        settled text;
begin
  c:=public.arbor_claim_research_unit(
    '86868686-8686-4686-8686-868686868686',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'resume-worker-1',
    240
  );

  if c is null
     or c->>'unitId' <> '86666666-6666-4666-8666-666666666666'
     or c->'lastResult' is distinct from 'null'::jsonb then
    raise exception 'first claim did not start without prior result: %',c;
  end if;

  lease:=(c->>'leaseToken')::uuid;
  settled:=public.arbor_settle_research_unit(
    '86868686-8686-4686-8686-868686868686',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '86666666-6666-4666-8666-666666666666',
    lease,
    'pattern-hop-resume',
    'checkpointed',
    0,
    array['synthetic:evidence:checkpoint'],
    1,
    '{
      "patternHopRunId":"pattern-run-1",
      "patternHopStatus":"active",
      "frontierRemaining":3,
      "independentlyVerifiedFinding":false
    }'::jsonb
  );

  if settled <> 'committed' then
    raise exception 'checkpoint settlement failed: %',settled;
  end if;

  if (select last_result->>'patternHopRunId'
      from public.arbor_research_units
      where id='86666666-6666-4666-8666-666666666666') <> 'pattern-run-1'
  then
    raise exception 'structured checkpoint result was not persisted';
  end if;
end $$;

-- Synthetic time advance so the same durable unit can be leased again.
update public.arbor_research_units
set available_at=clock_timestamp()-interval '1 second'
where id='86666666-6666-4666-8666-666666666666';

do $$
declare c jsonb;
begin
  c:=public.arbor_claim_research_unit(
    '86868686-8686-4686-8686-868686868686',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'resume-worker-2',
    240
  );

  if c is null
     or c->'lastResult'->>'patternHopRunId' <> 'pattern-run-1'
     or c->'lastResult'->>'patternHopStatus' <> 'active'
     or (select attempt_count from public.arbor_research_units
         where id='86666666-6666-4666-8666-666666666666') <> 2
  then
    raise exception 'resumed claim did not receive persisted executor state: %',c;
  end if;
end $$;

select 'DISPOSABLE_RESEARCH_RESUME_RESULT=PASS; LAST_RESULT_ROUNDTRIP=TRUE; FRESH_LEASE=TRUE' as receipt;
