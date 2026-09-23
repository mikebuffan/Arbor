\set ON_ERROR_STOP on
-- Item 52 DRAFT: deterministic persisted-session acceptance, synthetic disposable DB ONLY.
-- Requires 00-fixture.sql and PROPOSED_arbor_research_sessions.sql.
-- Separate psql connection via \connect below checks that state survives a client restart.
-- Do not add to CI until item 45 exact-head DB acceptance is verified and disposable-DB execution is approved.
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,max_cost_cents,authorized,unresolved_required_work)
values
('52525252-5252-4252-8252-525252525252','11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','synthetic persisted restart rehearsal',
 clock_timestamp()-interval '1 minute',clock_timestamp()+interval '20 minutes',3,10,true,2);

insert into public.arbor_research_units
(id,session_id,user_id,project_id,unit_key,kind,max_cost_reservation_cents,available_at)
values
('52111111-1111-4111-8111-111111111111','52525252-5252-4252-8252-525252525252',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'first','synthetic',2,clock_timestamp()-interval '1 second'),
('52222222-2222-4222-8222-222222222222','52525252-5252-4252-8252-525252525252',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'second','synthetic',2,clock_timestamp()+interval '5 minutes');

-- First unit checkpoints, without pretending that a checkpoint is completed work.
do $$
declare c jsonb; v text; t uuid;
begin
 c:=public.arbor_claim_research_unit('52525252-5252-4252-8252-525252525252',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','session-worker-a',30);
 if c->>'idempotencyKey' <> 'first' then raise exception 'first claim missing %',c; end if;
 t:=(c->>'leaseToken')::uuid;
 v:=public.arbor_settle_research_unit('52525252-5252-4252-8252-525252525252',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '52111111-1111-4111-8111-111111111111',t,'first','checkpointed',1,'{}'::text[],2,
 '{"synthetic":"checkpoint"}'::jsonb);
 if v <> 'committed' then raise exception 'checkpoint settle %',v; end if;
 if public.arbor_settle_research_unit('52525252-5252-4252-8252-525252525252',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '52111111-1111-4111-8111-111111111111',t,'first','checkpointed',1,'{}'::text[],2,
 '{"synthetic":"checkpoint"}'::jsonb) <> 'duplicate'
 then raise exception 'checkpoint replay not idempotent'; end if;
end $$;

-- Simulate a new client process/connection, retaining only database state.
\connect arbor_synthetic postgres localhost 5432
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$
begin
 if (select consumed_work_units from public.arbor_research_sessions
     where id='52525252-5252-4252-8252-525252525252') <> 0
 or (select committed_cost_cents from public.arbor_research_sessions
     where id='52525252-5252-4252-8252-525252525252') <> 1
 or (select count(*) from public.arbor_research_receipts
     where session_id='52525252-5252-4252-8252-525252525252' and status='checkpointed') <> 1
 then raise exception 'persisted checkpoint missing or double charged'; end if;
 if public.arbor_claim_research_unit('52525252-5252-4252-8252-525252525252',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'too-early',30) is not null
 then raise exception 'restart bypassed checkpoint retry delay'; end if;
end $$;

update public.arbor_research_units set available_at=clock_timestamp()-interval '1 second'
where id='52111111-1111-4111-8111-111111111111';
do $$
declare c jsonb; v text;
begin
 c:=public.arbor_claim_research_unit('52525252-5252-4252-8252-525252525252',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'session-worker-b',30);
 if c->>'idempotencyKey' <> 'first' then raise exception 'checkpoint resume wrong unit %',c; end if;
 v:=public.arbor_settle_research_unit('52525252-5252-4252-8252-525252525252',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '52111111-1111-4111-8111-111111111111',(c->>'leaseToken')::uuid,
 'first','completed',1,array['synthetic-evidence:first'],1,'{"synthetic":"reviewed-first"}'::jsonb);
 if v <> 'committed' then raise exception 'resumed completion %',v; end if;
end $$;

update public.arbor_research_units set available_at=clock_timestamp()-interval '1 second'
where id='52222222-2222-4222-8222-222222222222';
do $$
declare c jsonb; v text;
begin
 c:=public.arbor_claim_research_unit('52525252-5252-4252-8252-525252525252',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'session-worker-c',30);
 if c->>'idempotencyKey' <> 'second' then raise exception 'second claim missing %',c; end if;
 v:=public.arbor_settle_research_unit('52525252-5252-4252-8252-525252525252',
 '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '52222222-2222-4222-8222-222222222222',(c->>'leaseToken')::uuid,
 'second','completed',1,array['synthetic-evidence:second'],0,'{"synthetic":"reviewed-second"}'::jsonb);
 if v <> 'committed' then raise exception 'second completion %',v; end if;
end $$;

do $$
declare s public.arbor_research_sessions%rowtype;
begin
 select * into s from public.arbor_research_sessions where id='52525252-5252-4252-8252-525252525252';
 if s.consumed_work_units <> 2 or s.committed_cost_cents <> 3
 or s.unresolved_required_work <> 0
 or s.completed_evidence_refs <> array['synthetic-evidence:first','synthetic-evidence:second']
 or s.status='completed'
 or (select count(*) from public.arbor_research_receipts where session_id=s.id) <> 3
 then raise exception 'persisted session receipt/cost/completion state wrong'; end if;
 if public.arbor_claim_research_unit(s.id,s.user_id,s.project_id,'after-objective',30) is not null
 then raise exception 'empty objective incorrectly claimed more work'; end if;
end $$;
select 'DISPOSABLE_PERSISTED_SESSION_SIMULATION=PASS; INDEPENDENT_COMPLETION_REVIEW=HOLD' as receipt;
