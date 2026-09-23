\set ON_ERROR_STOP on
-- Ephemeral CI only; deterministic synthetic boundary cases without clock sleeps.
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$
declare
 u constant uuid := '11111111-1111-4111-8111-111111111111';
 p constant uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 s uuid; unit uuid; c jsonb; t uuid; result text;
begin
 -- Pre-start claim must not change status or lease.
 s := gen_random_uuid(); unit := gen_random_uuid();
 insert into public.arbor_research_sessions
 (id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
  max_cost_cents,authorized,unresolved_required_work)
 values(s,u,p,'future synthetic',clock_timestamp()+interval '2 minutes',
        clock_timestamp()+interval '12 minutes',1,1,true,1);
 insert into public.arbor_research_units
 (id,session_id,user_id,project_id,unit_key,kind)
 values(unit,s,u,p,'future-unit','synthetic');
 if public.arbor_claim_research_unit(s,u,p,'worker') is not null
 then raise exception 'prestart claim accepted'; end if;
 if (select status from public.arbor_research_units where id=unit)<>'queued'
 then raise exception 'prestart modified unit'; end if;

 -- Deadline claim rejection and terminal status.
 s := gen_random_uuid(); unit := gen_random_uuid();
 insert into public.arbor_research_sessions
 (id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
  max_cost_cents,authorized,unresolved_required_work)
 values(s,u,p,'expired synthetic',clock_timestamp()-interval '10 minutes',
        clock_timestamp()-interval '1 minute',1,1,true,1);
 insert into public.arbor_research_units
 (id,session_id,user_id,project_id,unit_key,kind)
 values(unit,s,u,p,'expired-unit','synthetic');
 if public.arbor_claim_research_unit(s,u,p,'worker') is not null
 then raise exception 'expired claim accepted'; end if;
 if (select status from public.arbor_research_sessions where id=s)<>'timebox_ended'
 then raise exception 'deadline not terminal'; end if;

 -- Expired lease must not settle; no phantom spend.
 s := gen_random_uuid(); unit := gen_random_uuid();
 insert into public.arbor_research_sessions
 (id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
  max_cost_cents,authorized,unresolved_required_work)
 values(s,u,p,'lease expiry synthetic',clock_timestamp()-interval '1 minute',
        clock_timestamp()+interval '10 minutes',1,1,true,1);
 insert into public.arbor_research_units
 (id,session_id,user_id,project_id,unit_key,kind)
 values(unit,s,u,p,'lease-unit','synthetic');
 c:=public.arbor_claim_research_unit(s,u,p,'worker');
 if c is null then raise exception 'lease setup failed'; end if;
 t:=(c->>'leaseToken')::uuid;
 update public.arbor_research_units
 set lease_expires_at=clock_timestamp()-interval '1 second'
 where id=unit;
 result:=public.arbor_settle_research_unit(
 s,u,p,unit,t,'lease-unit','completed',1,array['synthetic:lease'],0,'{}');
 if result<>'lease_lost' then raise exception 'expired lease settled %',result; end if;
 if (select committed_cost_cents from public.arbor_research_sessions where id=s)<>0
 then raise exception 'expired lease spent'; end if;
 c:=public.arbor_claim_research_unit(s,u,p,'new-worker');
 if c is null or (c->>'leaseToken')::uuid=t
 then raise exception 'lease fencing/reclaim failed'; end if;
 result:=public.arbor_settle_research_unit(
 s,u,p,unit,t,'lease-unit','completed',1,array['synthetic:old'],0,'{}');
 if result<>'lease_lost' then raise exception 'stale worker settled'; end if;

 -- STOP after claim fences late settlement and future claims.
 s:=gen_random_uuid(); unit:=gen_random_uuid();
 insert into public.arbor_research_sessions
 (id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
  max_cost_cents,authorized,unresolved_required_work)
 values(s,u,p,'STOP synthetic',clock_timestamp()-interval '1 minute',
        clock_timestamp()+interval '10 minutes',1,1,true,1);
 insert into public.arbor_research_units
 (id,session_id,user_id,project_id,unit_key,kind)
 values(unit,s,u,p,'stop-unit','synthetic');
 c:=public.arbor_claim_research_unit(s,u,p,'worker');
 if c is null then raise exception 'STOP setup failed'; end if;
 t:=(c->>'leaseToken')::uuid;
 if not public.arbor_stop_research_session(s,u,p,'cancelled','synthetic stop')
 then raise exception 'STOP failed'; end if;
 result:=public.arbor_settle_research_unit(
 s,u,p,unit,t,'stop-unit','completed',1,array['synthetic:stop'],0,'{}');
 if result<>'lease_lost' then raise exception 'settlement after STOP'; end if;
 if public.arbor_claim_research_unit(s,u,p,'worker') is not null
 then raise exception 'claim after STOP'; end if;

 -- Revocation and budget guard; no receipt or cost after revoke.
 s:=gen_random_uuid(); unit:=gen_random_uuid();
 insert into public.arbor_research_sessions
 (id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
  max_cost_cents,authorized,unresolved_required_work)
 values(s,u,p,'revocation synthetic',clock_timestamp()-interval '1 minute',
        clock_timestamp()+interval '10 minutes',1,1,true,1);
 insert into public.arbor_research_units
 (id,session_id,user_id,project_id,unit_key,kind)
 values(unit,s,u,p,'revoke-unit','synthetic');
 c:=public.arbor_claim_research_unit(s,u,p,'worker');
 if c is null then raise exception 'revocation setup failed'; end if;
 t:=(c->>'leaseToken')::uuid;
 update public.arbor_research_sessions set authorized=false where id=s;
 result:=public.arbor_settle_research_unit(
 s,u,p,unit,t,'revoke-unit','completed',1,array['synthetic:revoke'],0,'{}');
 if result<>'lease_lost' then raise exception 'settlement after revoke'; end if;
 if (select count(*) from public.arbor_research_receipts where session_id=s)<>0
 then raise exception 'receipt after revoke'; end if;

 -- Cannot claim a unit whose reservation exceeds remaining budget.
 s:=gen_random_uuid(); unit:=gen_random_uuid();
 insert into public.arbor_research_sessions
 (id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
  max_cost_cents,authorized,unresolved_required_work)
 values(s,u,p,'cost cap synthetic',clock_timestamp()-interval '1 minute',
        clock_timestamp()+interval '10 minutes',1,1,true,1);
 insert into public.arbor_research_units
 (id,session_id,user_id,project_id,unit_key,kind,max_cost_reservation_cents)
 values(unit,s,u,p,'overbudget-unit','synthetic',2);
 if public.arbor_claim_research_unit(s,u,p,'worker') is not null
 then raise exception 'overbudget unit claimed'; end if;
end $$;
select 'DISPOSABLE_DB_BOUNDARIES=PASS' as receipt;
