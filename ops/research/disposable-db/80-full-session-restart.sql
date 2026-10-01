\set ON_ERROR_STOP on
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
 max_cost_cents,authorized,unresolved_required_work)
values
('90000000-0000-4000-8000-000000000001',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'deterministic persisted multi-worker session rehearsal',
 now()-interval '1 minute',now()+interval '20 minutes',
 3,3,true,3);

insert into public.arbor_research_units
(id,session_id,user_id,project_id,unit_key,kind,max_cost_reservation_cents,max_attempts,available_at)
values
('90000000-0000-4000-8000-000000000011',
 '90000000-0000-4000-8000-000000000001',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','full-a','synthetic_full_session',1,3,now()),
('90000000-0000-4000-8000-000000000012',
 '90000000-0000-4000-8000-000000000001',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','full-b','synthetic_full_session',1,3,now()+interval '1 second'),
('90000000-0000-4000-8000-000000000013',
 '90000000-0000-4000-8000-000000000001',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','full-c','synthetic_full_session',1,3,now()+interval '2 seconds');

-- Worker invocation 1 claims unit A and crashes before settlement.
do $run1$
declare c jsonb;
begin
 c := public.arbor_claim_research_unit(
   '90000000-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','worker-process-1',30);
 if c is null or c->>'idempotencyKey' <> 'full-a'
 then raise exception 'full session invocation 1 wrong claim: %',c; end if;
end
$run1$;

-- Simulate durable time passing after process death. No receipt exists.
update public.arbor_research_units
 set lease_expires_at=clock_timestamp()-interval '1 second'
 where session_id='90000000-0000-4000-8000-000000000001'
   and unit_key='full-a' and status='leased';

-- Worker invocation 2 is a distinct process and reclaims A.
do $run2$
declare c jsonb; result text;
begin
 c := public.arbor_claim_research_unit(
   '90000000-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','worker-process-2',30);
 if c is null or c->>'idempotencyKey' <> 'full-a'
 then raise exception 'full session invocation 2 did not reclaim A: %',c; end if;
 result := public.arbor_settle_research_unit(
   '90000000-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   (c->>'unitId')::uuid,(c->>'leaseToken')::uuid,c->>'idempotencyKey',
   'completed',1,array['synthetic:full:a'],2,
   jsonb_build_object('worker','process-2','phase','reclaimed'));
 if result <> 'committed' then raise exception 'full A settlement: %',result; end if;
end
$run2$;

-- Make B eligible without sleeping; a new invocation claims only B.
update public.arbor_research_units set available_at=clock_timestamp()-interval '1 second'
 where session_id='90000000-0000-4000-8000-000000000001' and unit_key='full-b';
do $run3$
declare c jsonb; result text;
begin
 c := public.arbor_claim_research_unit(
   '90000000-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','worker-process-3',30);
 if c is null or c->>'idempotencyKey' <> 'full-b'
 then raise exception 'full session invocation 3 wrong claim: %',c; end if;
 result := public.arbor_settle_research_unit(
   '90000000-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   (c->>'unitId')::uuid,(c->>'leaseToken')::uuid,c->>'idempotencyKey',
   'completed',1,array['synthetic:full:b'],1,
   jsonb_build_object('worker','process-3'));
 if result <> 'committed' then raise exception 'full B settlement: %',result; end if;
end
$run3$;

update public.arbor_research_units set available_at=clock_timestamp()-interval '1 second'
 where session_id='90000000-0000-4000-8000-000000000001' and unit_key='full-c';
do $run4$
declare c jsonb; result text;
begin
 c := public.arbor_claim_research_unit(
   '90000000-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','worker-process-4',30);
 if c is null or c->>'idempotencyKey' <> 'full-c'
 then raise exception 'full session invocation 4 wrong claim: %',c; end if;
 result := public.arbor_settle_research_unit(
   '90000000-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   (c->>'unitId')::uuid,(c->>'leaseToken')::uuid,c->>'idempotencyKey',
   'completed',1,array['synthetic:full:c'],0,
   jsonb_build_object('worker','process-4'));
 if result <> 'committed' then raise exception 'full C settlement: %',result; end if;
end
$run4$;

do $assert$
declare s public.arbor_research_sessions%rowtype;
begin
 select * into s from public.arbor_research_sessions
 where id='90000000-0000-4000-8000-000000000001';

 if s.consumed_work_units <> 3
    or s.committed_cost_cents <> 3
    or s.unresolved_required_work <> 0
    or s.completed_evidence_refs <> array['synthetic:full:a','synthetic:full:b','synthetic:full:c']::text[]
 then raise exception 'persisted full-session aggregate mismatch: %',row_to_json(s); end if;

 if (select count(*) from public.arbor_research_receipts
     where session_id=s.id and status='completed') <> 3
 then raise exception 'persisted full-session receipt count mismatch'; end if;

 if (select attempt_count from public.arbor_research_units
     where session_id=s.id and unit_key='full-a') <> 2
 then raise exception 'abandoned lease was not durably reclaimed exactly once'; end if;

 if exists(select 1 from public.arbor_research_units
     where session_id=s.id and status <> 'completed')
 then raise exception 'persisted full-session unit left incomplete'; end if;

 if public.arbor_claim_research_unit(
   s.id,s.user_id,s.project_id,'worker-process-5',30) is not null
 then raise exception 'zero-unresolved session issued extra work'; end if;

 -- Completion remains a separate evidence-verification action.
 if s.status='completed' then raise exception 'session self-completed without verifier'; end if;
end
$assert$;

select 'PERSISTED_FULL_SESSION_RESTART_ACCEPTANCE=PASS' as result;
