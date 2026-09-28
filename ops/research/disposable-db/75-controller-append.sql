\set ON_ERROR_STOP on
-- Synthetic-only acceptance for Arbor controller-driven research task expansion.
-- Requires 00-fixture.sql + PROPOSED_arbor_research_sessions.sql.
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,max_cost_cents,authorized,unresolved_required_work)
values
('75757575-7575-4757-8757-757575757575',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic controller planning acceptance',
 clock_timestamp()-interval '1 minute',
 clock_timestamp()+interval '3 hours',
 6,50,true,0);

-- First planner pulse adds two research-only units.
do $$
declare r jsonb;
begin
  r:=public.arbor_append_research_units(
    '75757575-7575-4757-8757-757575757575',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '[
      {
        "unitKey":"follow-contradiction-a",
        "kind":"research.contradiction",
        "description":"Follow one synthetic contradiction.",
        "payload":{"lead":"synthetic-a"},
        "maxCostReservationCents":2,
        "maxAttempts":3
      },
      {
        "unitKey":"timeline-crosscheck-b",
        "kind":"research.timeline",
        "description":"Cross-check one synthetic timeline edge.",
        "payload":{"lead":"synthetic-b"},
        "maxCostReservationCents":2,
        "maxAttempts":3
      }
    ]'::jsonb
  );
  if r <> '{"appended":2,"existing":0}'::jsonb then
    raise exception 'controller first append receipt wrong %',r;
  end if;
end $$;

do $$
begin
  if (select count(*) from public.arbor_research_units
      where session_id='75757575-7575-4757-8757-757575757575') <> 2
     or (select count(*) from public.arbor_research_units
         where session_id='75757575-7575-4757-8757-757575757575'
           and status='queued' and attempt_count=0) <> 2
     or (select unresolved_required_work from public.arbor_research_sessions
         where id='75757575-7575-4757-8757-757575757575') <> 2
     or (select count(*) from public.arbor_research_receipts
         where session_id='75757575-7575-4757-8757-757575757575') <> 0
  then raise exception 'controller append mutated execution/receipt state'; end if;

  if (select payload->>'plannedBy' from public.arbor_research_units
      where session_id='75757575-7575-4757-8757-757575757575'
        and unit_key='follow-contradiction-a') <> 'arbor-agency'
     or (select payload->>'controllerDescription' from public.arbor_research_units
      where session_id='75757575-7575-4757-8757-757575757575'
        and unit_key='follow-contradiction-a') <>
        'Follow one synthetic contradiction.'
  then raise exception 'controller planning provenance missing'; end if;
end $$;

-- Exact replay is idempotent.
do $$
declare r jsonb;
begin
  r:=public.arbor_append_research_units(
    '75757575-7575-4757-8757-757575757575',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '[
      {
        "unitKey":"follow-contradiction-a",
        "kind":"research.contradiction",
        "description":"Follow one synthetic contradiction.",
        "payload":{"lead":"synthetic-a"},
        "maxCostReservationCents":2,
        "maxAttempts":3
      },
      {
        "unitKey":"timeline-crosscheck-b",
        "kind":"research.timeline",
        "description":"Cross-check one synthetic timeline edge.",
        "payload":{"lead":"synthetic-b"},
        "maxCostReservationCents":2,
        "maxAttempts":3
      }
    ]'::jsonb
  );
  if r <> '{"appended":0,"existing":2}'::jsonb
     or (select count(*) from public.arbor_research_units
         where session_id='75757575-7575-4757-8757-757575757575') <> 2
  then raise exception 'controller replay was not idempotent %',r; end if;
end $$;

-- Arbitrary/non-research capabilities cannot be planned into this queue.
do $$
begin
  begin
    perform public.arbor_append_research_units(
      '75757575-7575-4757-8757-757575757575',
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '[{
        "unitKey":"bad-tool",
        "kind":"send_email",
        "description":"Must never be accepted.",
        "payload":{},
        "maxCostReservationCents":0,
        "maxAttempts":1
      }]'::jsonb
    );
    raise exception 'non-research kind was accepted';
  exception when others then
    if sqlerrm not like '%research_controller_invalid_planned_unit%' then raise; end if;
  end;
end $$;

-- Wrong owner/project scope cannot append.
do $$
begin
  begin
    perform public.arbor_append_research_units(
      '75757575-7575-4757-8757-757575757575',
      '22222222-2222-4222-8222-222222222222',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '[{
        "unitKey":"wrong-owner",
        "kind":"research.synthetic",
        "description":"Wrong owner must fail.",
        "payload":{},
        "maxCostReservationCents":0,
        "maxAttempts":1
      }]'::jsonb
    );
    raise exception 'wrong owner append was accepted';
  exception when others then
    if sqlerrm not like '%research_controller_session_not_found%' then raise; end if;
  end;
end $$;

-- Remaining-work budget is authoritative even though global pending cap is 256.
do $$
begin
  begin
    perform public.arbor_append_research_units(
      '75757575-7575-4757-8757-757575757575',
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '[
        {"unitKey":"c","kind":"research.synthetic","description":"c","payload":{},"maxCostReservationCents":0,"maxAttempts":1},
        {"unitKey":"d","kind":"research.synthetic","description":"d","payload":{},"maxCostReservationCents":0,"maxAttempts":1},
        {"unitKey":"e","kind":"research.synthetic","description":"e","payload":{},"maxCostReservationCents":0,"maxAttempts":1},
        {"unitKey":"f","kind":"research.synthetic","description":"f","payload":{},"maxCostReservationCents":0,"maxAttempts":1},
        {"unitKey":"g","kind":"research.synthetic","description":"g","payload":{},"maxCostReservationCents":0,"maxAttempts":1}
      ]'::jsonb
    );
    raise exception 'work-unit capacity overflow was accepted';
  exception when others then
    if sqlerrm not like '%research_controller_pending_unit_limit%' then raise; end if;
  end;
end $$;

-- Cancellation closes planning immediately.
update public.arbor_research_sessions
set cancellation_requested=true
where id='75757575-7575-4757-8757-757575757575';

do $$
begin
  begin
    perform public.arbor_append_research_units(
      '75757575-7575-4757-8757-757575757575',
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '[{
        "unitKey":"after-stop",
        "kind":"research.synthetic",
        "description":"Must not appear after STOP.",
        "payload":{},
        "maxCostReservationCents":0,
        "maxAttempts":1
      }]'::jsonb
    );
    raise exception 'append after cancellation was accepted';
  exception when others then
    if sqlerrm not like '%research_controller_session_not_active%' then raise; end if;
  end;
end $$;

select 'DISPOSABLE_RESEARCH_CONTROLLER_APPEND=PASS; IDEMPOTENT=TRUE; RESEARCH_ONLY=TRUE; STOP_FENCED=TRUE' as receipt;
