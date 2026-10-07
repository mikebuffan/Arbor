\set ON_ERROR_STOP on

create extension if not exists pgcrypto;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users(id uuid primary key);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth to authenticated, service_role;
grant execute on function auth.uid() to authenticated, service_role;

create table public.projects(
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique(id,user_id)
);

\ir ../../../docs/research/sql/PROPOSED_arbor_research_sessions.sql

insert into auth.users(id)
values ('11111111-1111-4111-8111-111111111111');

insert into public.projects(id,user_id)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111'
);

insert into public.arbor_research_sessions(
  id,user_id,project_id,objective,status,
  started_at,deadline_at,max_work_units,max_cost_cents,
  authorized,unresolved_required_work
) values (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'Synthetic bounded controller append acceptance',
  'queued',
  clock_timestamp()-interval '1 minute',
  clock_timestamp()+interval '30 minutes',
  20,
  100,
  true,
  1
);

set role service_role;

do $accept$
declare first_result jsonb;
        second_result jsonb;
        unresolved integer;
        unit_count integer;
begin
  first_result := public.arbor_append_research_units(
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    jsonb_build_array(
      jsonb_build_object(
        'unitKey','follow-a',
        'kind','research.synthetic',
        'description','Follow one synthetic lead.',
        'payload',jsonb_build_object('lead','a'),
        'maxCostReservationCents',2,
        'maxAttempts',3
      ),
      jsonb_build_object(
        'unitKey','follow-b',
        'kind','research.synthetic',
        'description','Follow a second synthetic lead.',
        'payload',jsonb_build_object('lead','b'),
        'maxCostReservationCents',0
      )
    )
  );

  if first_result <> '{"appended": 2, "existing": 0}'::jsonb then
    raise exception 'unexpected first append result: %', first_result;
  end if;

  select unresolved_required_work into unresolved
  from public.arbor_research_sessions
  where id='33333333-3333-4333-8333-333333333333';

  if unresolved <> 3 then
    raise exception 'unresolved work did not increase by newly appended units: %', unresolved;
  end if;

  second_result := public.arbor_append_research_units(
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    jsonb_build_array(
      jsonb_build_object(
        'unitKey','follow-a',
        'kind','research.synthetic',
        'description','Follow one synthetic lead.',
        'payload',jsonb_build_object('lead','a'),
        'maxCostReservationCents',2,
        'maxAttempts',3
      ),
      jsonb_build_object(
        'unitKey','follow-b',
        'kind','research.synthetic',
        'description','Follow a second synthetic lead.',
        'payload',jsonb_build_object('lead','b'),
        'maxCostReservationCents',0
      )
    )
  );

  if second_result <> '{"appended": 0, "existing": 2}'::jsonb then
    raise exception 'append retry was not idempotent: %', second_result;
  end if;

  select unresolved_required_work into unresolved
  from public.arbor_research_sessions
  where id='33333333-3333-4333-8333-333333333333';

  if unresolved <> 3 then
    raise exception 'idempotent retry changed unresolved work: %', unresolved;
  end if;

  select count(*) into unit_count
  from public.arbor_research_units
  where session_id='33333333-3333-4333-8333-333333333333';

  if unit_count <> 2 then
    raise exception 'unexpected durable unit count: %', unit_count;
  end if;

  begin
    perform public.arbor_append_research_units(
      '33333333-3333-4333-8333-333333333333',
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      jsonb_build_array(
        jsonb_build_object(
          'unitKey','duplicate-key',
          'kind','research.synthetic',
          'description','Duplicate one.',
          'payload','{}'::jsonb,
          'maxCostReservationCents',0
        ),
        jsonb_build_object(
          'unitKey','duplicate-key',
          'kind','research.synthetic',
          'description','Duplicate two.',
          'payload','{}'::jsonb,
          'maxCostReservationCents',0
        )
      )
    );
    raise exception 'duplicate keys unexpectedly accepted';
  exception
    when others then
      if sqlerrm not like '%duplicate_research_append_unit%' then
        raise;
      end if;
  end;
end
$accept$;

reset role;
set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  false
);

do $deny$
begin
  begin
    perform public.arbor_append_research_units(
      '33333333-3333-4333-8333-333333333333',
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      jsonb_build_array(
        jsonb_build_object(
          'unitKey','client-forbidden',
          'kind','research.synthetic',
          'description','Authenticated client must not append.',
          'payload','{}'::jsonb,
          'maxCostReservationCents',0
        )
      )
    );
    raise exception 'authenticated append unexpectedly allowed';
  exception
    when insufficient_privilege then null;
  end;
end
$deny$;

reset role;

select 'PASS: research controller append RPC is bounded, idempotent, scope-preserving, and service-role-only.' as result;
