\set ON_ERROR_STOP on

insert into public.arbor_research_integration_state(owner_id,project_id)
values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,max_cost_cents,authorized,unresolved_required_work)
values
('93000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner one session A',now()-interval '1 minute',now()+interval '10 minutes',2,2,true,1),
('93000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner one session B',now()-interval '1 minute',now()+interval '10 minutes',2,2,true,1),
('93000000-0000-4000-8000-000000000003','22222222-2222-4222-8222-222222222222',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','owner two session',now()-interval '1 minute',now()+interval '10 minutes',2,2,true,1);

insert into public.arbor_research_session_handoffs
(owner_id,project_id,handoff_key,from_session_id,to_session_id,reason,evidence_refs)
values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'handoff-owner-one','93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002',
 'bounded continuation after checkpoint','["receipt:1"]'::jsonb);

do $cross_owner$
begin
  begin
    insert into public.arbor_research_session_handoffs
    (owner_id,project_id,handoff_key,from_session_id,to_session_id,reason,evidence_refs)
    values
    ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     'bad-cross-owner','93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000003',
     'must fail','[]'::jsonb);
    raise exception 'cross-owner session handoff succeeded';
  exception when foreign_key_violation then null;
  end;

  begin
    update public.arbor_research_integration_state
       set execution_enabled=true
     where owner_id='11111111-1111-4111-8111-111111111111'
       and project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'fail-closed execution flag opened';
  exception when check_violation then null;
  end;
end
$cross_owner$;

-- Owner one can read only its own preview status/session/handoff.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $owner_one$
begin
  if (select count(*) from public.arbor_research_integration_state) <> 1
  then raise exception 'owner-one integration-state isolation failed'; end if;
  if (select count(*) from public.arbor_research_sessions
      where id in ('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000003')) <> 2
  then raise exception 'owner-one session isolation failed'; end if;
  if (select count(*) from public.arbor_research_session_handoffs) <> 1
  then raise exception 'owner-one handoff isolation failed'; end if;
  if has_table_privilege('authenticated','public.arbor_research_session_handoffs','INSERT')
  then raise exception 'authenticated handoff write privilege leaked'; end if;
end
$owner_one$;
reset role;

-- Owner two sees only its own state/session and zero owner-one handoffs.
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $owner_two$
begin
  if (select count(*) from public.arbor_research_integration_state) <> 1
  then raise exception 'owner-two integration-state isolation failed'; end if;
  if (select count(*) from public.arbor_research_sessions
      where id in ('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000003')) <> 1
  then raise exception 'owner-two session isolation failed'; end if;
  if (select count(*) from public.arbor_research_session_handoffs) <> 0
  then raise exception 'owner-two saw foreign handoff'; end if;
end
$owner_two$;
reset role;

do $catalog$
begin
  if exists(
    select 1 from public.arbor_research_integration_state
    where execution_enabled or scheduler_enabled or real_source_ingestion_enabled or publication_enabled
  ) then raise exception 'preview integration gate is not fail-closed'; end if;

  if (select count(*) from public.arbor_research_session_handoffs where status='recorded_no_execution') <> 1
  then raise exception 'handoff receipt persistence mismatch'; end if;
end
$catalog$;

select 'PREVIEW_INTEGRATION_V6=PASS' as result;
