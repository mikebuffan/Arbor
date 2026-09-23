\set ON_ERROR_STOP on
-- Run ONLY after 00-fixture.sql and PROPOSED_arbor_research_sessions.sql
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
 max_cost_cents,authorized,unresolved_required_work)
values
('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic acceptance',now()-interval '1 minute',now()+interval '20 minutes',
 2,2,true,2),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 '22222222-2222-4222-8222-222222222222',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 'other owner synthetic',now()-interval '1 minute',now()+interval '20 minutes',
 2,2,true,1);
insert into public.arbor_research_units
(id,session_id,user_id,project_id,unit_key,kind,max_cost_reservation_cents)
values
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','synthetic-unit','test',1),
('ffffffff-ffff-4fff-8fff-ffffffffffff',
 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 '22222222-2222-4222-8222-222222222222',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','other-unit','test',1);

do $$
declare c jsonb; t uuid; v text;
begin
  if public.arbor_claim_research_unit(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','worker') is not null
  then raise exception 'cross-owner claim succeeded'; end if;
  c := public.arbor_claim_research_unit(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','worker');
  if c is null then raise exception 'valid claim failed'; end if;
  t := (c->>'leaseToken')::uuid;
  if public.arbor_claim_research_unit(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','worker-2') is not null
  then raise exception 'simultaneous active reservation'; end if;
  v := public.arbor_settle_research_unit(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',t,'synthetic-unit',
    'completed',1,array['synthetic:1'],1,'{}'::jsonb);
  if v <> 'committed' then raise exception 'settlement %',v; end if;
  v := public.arbor_settle_research_unit(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',t,'synthetic-unit',
    'completed',1,array['synthetic:1'],1,'{}'::jsonb);
  if v <> 'duplicate' then raise exception 'idempotency %',v; end if;
  if (select committed_cost_cents from public.arbor_research_sessions
      where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>1
     or (select count(*) from public.arbor_research_receipts
      where session_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>1
  then raise exception 'duplicate spend or receipt'; end if;
end $$;

-- Actual RLS check under non-bypass authenticated role.
set role authenticated;
set request.jwt.claim.role = 'authenticated';
select set_config('request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',false);
do $$
begin
 if (select count(*) from public.arbor_research_sessions) <> 1
 or (select count(*) from public.arbor_research_units) <> 1
 or (select count(*) from public.arbor_research_receipts) <> 1
 then raise exception 'owner RLS isolation failed'; end if;
end $$;
reset role;
set request.jwt.claim.role = 'service_role';
do $$
begin
 if not public.arbor_stop_research_session(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cancelled','synthetic STOP')
 then raise exception 'STOP failed'; end if;
 if public.arbor_claim_research_unit(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','worker') is not null
 then raise exception 'claim after STOP'; end if;
end $$;
select 'DISPOSABLE_DB_SYNTHETIC_ACCEPTANCE=PASS' as receipt;
