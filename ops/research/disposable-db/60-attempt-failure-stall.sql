\set ON_ERROR_STOP on
-- Synthetic-only disposable PostgreSQL acceptance for master item 45.
-- Run ONLY after 00-fixture.sql and PROPOSED_arbor_research_sessions.sql.
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
 max_cost_cents,authorized,unresolved_required_work)
values
('45454545-4545-4454-8454-454545454545',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic attempt/failure/stall matrix',now()-interval '1 minute',now()+interval '20 minutes',
 10,20,true,3);

insert into public.arbor_research_units
(id,session_id,user_id,project_id,unit_key,kind,max_cost_reservation_cents,max_attempts)
values
('45111111-1111-4111-8111-111111111111','45454545-4545-4454-8454-454545454545',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'attempt-cap','synthetic',2,2),
('45222222-2222-4222-8222-222222222222','45454545-4545-4454-8454-454545454545',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'stalled-lease','synthetic',2,3),
('45333333-3333-4333-8333-333333333333','45454545-4545-4454-8454-454545454545',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'later-work','synthetic',2,3);

-- Failed work below its cap records a receipt, costs once, and is delayed/requeued.
do $$
declare c jsonb; v text; t uuid;
begin
 c := public.arbor_claim_research_unit('45454545-4545-4454-8454-454545454545',
   '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','worker-a',30);
 if c->>'idempotencyKey' <> 'attempt-cap' then raise exception 'wrong first claim %',c; end if;
 t := (c->>'leaseToken')::uuid;
 v := public.arbor_settle_research_unit('45454545-4545-4454-8454-454545454545',
   '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '45111111-1111-4111-8111-111111111111',t,'attempt-cap','failed',1,'{}'::text[],3,
   '{"error":"synthetic first failure"}'::jsonb);
 if v <> 'committed' then raise exception 'first failure settle %',v; end if;
 if (select status from public.arbor_research_units where id='45111111-1111-4111-8111-111111111111') <> 'queued'
    or (select attempt_count from public.arbor_research_units where id='45111111-1111-4111-8111-111111111111') <> 1
    or (select count(*) from public.arbor_research_receipts where unit_id='45111111-1111-4111-8111-111111111111' and status='failed') <> 1
 then raise exception 'failed receipt/requeue state wrong'; end if;
 if public.arbor_claim_research_unit('45454545-4545-4454-8454-454545454545',
   '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','worker-too-soon',30)->>'idempotencyKey' = 'attempt-cap'
 then raise exception 'failed unit ignored retry delay'; end if;
end $$;

-- Force only synthetic test timestamps to model retry eligibility, then hit max_attempts.
update public.arbor_research_units set available_at=clock_timestamp()-interval '1 second'
 where id='45111111-1111-4111-8111-111111111111';
-- Keep other units out of the way for deterministic ordering.
update public.arbor_research_units set available_at=clock_timestamp()+interval '5 minutes'
 where id in ('45222222-2222-4222-8222-222222222222','45333333-3333-4333-8333-333333333333');
do $$
declare c jsonb; v text; t uuid;
begin
 c := public.arbor_claim_research_unit('45454545-4545-4454-8454-454545454545',
   '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','worker-b',30);
 if c->>'idempotencyKey' <> 'attempt-cap' then raise exception 'retry claim missing %',c; end if;
 t := (c->>'leaseToken')::uuid;
 v := public.arbor_settle_research_unit('45454545-4545-4454-8454-454545454545',
   '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '45111111-1111-4111-8111-111111111111',t,'attempt-cap','failed',1,'{}'::text[],3,
   '{"error":"synthetic terminal failure"}'::jsonb);
 if v <> 'committed' then raise exception 'terminal failure settle %',v; end if;
 if (select status from public.arbor_research_units where id='45111111-1111-4111-8111-111111111111') <> 'failed'
    or (select attempt_count from public.arbor_research_units where id='45111111-1111-4111-8111-111111111111') <> 2
    or (select count(*) from public.arbor_research_receipts where unit_id='45111111-1111-4111-8111-111111111111') <> 2
 then raise exception 'attempt cap did not become terminal'; end if;
end $$;

-- A stalled lease blocks another claim while live, then is reclaimable after expiry.
update public.arbor_research_units set available_at=clock_timestamp()-interval '1 second'
 where id='45222222-2222-4222-8222-222222222222';
do $$
declare c jsonb;
begin
 c := public.arbor_claim_research_unit('45454545-4545-4454-8454-454545454545',
   '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','stalled-worker',30);
 if c->>'idempotencyKey' <> 'stalled-lease' then raise exception 'stalled lease claim missing %',c; end if;
 if public.arbor_claim_research_unit('45454545-4545-4454-8454-454545454545',
   '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','blocked-worker',30) is not null
 then raise exception 'active stalled lease did not fence concurrent work'; end if;
end $$;
update public.arbor_research_units set lease_expires_at=clock_timestamp()-interval '1 second'
 where id='45222222-2222-4222-8222-222222222222';
do $$
declare c jsonb;
begin
 c := public.arbor_claim_research_unit('45454545-4545-4454-8454-454545454545',
   '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','recovery-worker',30);
 if c->>'idempotencyKey' <> 'stalled-lease' then raise exception 'expired stalled lease not reclaimed %',c; end if;
 if (select attempt_count from public.arbor_research_units where id='45222222-2222-4222-8222-222222222222') <> 2
 then raise exception 'reclaim did not consume bounded attempt'; end if;
end $$;

-- No false completion: failures/reclaims do not consume completed-work units.
do $$
begin
 if (select consumed_work_units from public.arbor_research_sessions where id='45454545-4545-4454-8454-454545454545') <> 0
    or (select committed_cost_cents from public.arbor_research_sessions where id='45454545-4545-4454-8454-454545454545') <> 2
    or (select status from public.arbor_research_sessions where id='45454545-4545-4454-8454-454545454545') = 'completed'
 then raise exception 'failure/recovery falsely counted completion or cost'; end if;
end $$;
select 'DISPOSABLE_DB_ATTEMPT_FAILURE_STALL=PASS' as receipt;
