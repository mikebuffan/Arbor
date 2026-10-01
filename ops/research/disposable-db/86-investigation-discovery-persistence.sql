\set ON_ERROR_STOP on
-- Disposable PostgreSQL acceptance for discovery observations and identity gating.
-- Synthetic only. Never connects to Preview/production or real investigation material.

set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.arbor_investigation_entities
(id,user_id,project_id,entity_ref,display_label,entity_kind,identity_status,identity_basis_refs)
values
(
 '93939393-9393-4393-8393-939393939391',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic:resolved:bridge',
 'Synthetic Bridge Entity',
 'company',
 'resolved',
 array[
   '85858585-8585-4585-8585-858585858581',
   '85858585-8585-4585-8585-858585858582'
 ]::text[]
),
(
 '93939393-9393-4393-8393-939393939392',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic:unresolved:same-name:a',
 'Same Name',
 'person',
 'unresolved',
 array['85858585-8585-4585-8585-858585858581']::text[]
),
(
 '93939393-9393-4393-8393-939393939393',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'synthetic:unresolved:same-name:b',
 'Same Name',
 'person',
 'unresolved',
 array['85858585-8585-4585-8585-858585858582']::text[]
);

insert into public.arbor_investigation_observations
(id,user_id,project_id,evidence_id,document_family,occurred_at,event_tags)
values
(
 '94949494-9494-4494-8494-949494949491',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '85858585-8585-4585-8585-858585858581',
 'calendar',
 '2026-01-01T10:00:00Z',
 array['scheduled']::text[]
),
(
 '94949494-9494-4494-8494-949494949492',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '85858585-8585-4585-8585-858585858581',
 'property',
 '2026-01-02T10:00:00Z',
 array['ownership']::text[]
),
(
 '94949494-9494-4494-8494-949494949493',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '85858585-8585-4585-8585-858585858582',
 'payment',
 '2026-01-03T10:00:00Z',
 array['payment']::text[]
);

insert into public.arbor_investigation_observation_entities
(observation_id,entity_id,user_id,project_id)
values
('94949494-9494-4494-8494-949494949491','93939393-9393-4393-8393-939393939391','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('94949494-9494-4494-8494-949494949492','93939393-9393-4393-8393-939393939391','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('94949494-9494-4494-8494-949494949493','93939393-9393-4393-8393-939393939391','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('94949494-9494-4494-8494-949494949491','93939393-9393-4393-8393-939393939392','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('94949494-9494-4494-8494-949494949493','93939393-9393-4393-8393-939393939393','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- Trusted loader preserves lineages/document families while excluding unresolved
-- same-name entities from discovery. Those mentions remain stored for later
-- identity resolution but cannot become a false bridge node.
do $block$
declare r jsonb;
declare item jsonb;
begin
  r := public.arbor_load_investigation_observations(
    array[
      '85858585-8585-4585-8585-858585858581',
      '85858585-8585-4585-8585-858585858582'
    ]::uuid[],
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

  if jsonb_array_length(r) <> 3 then
    raise exception 'discovery loader observation count wrong: %',r;
  end if;

  for item in select value from jsonb_array_elements(r)
  loop
    if jsonb_array_length(item->'entities') <> 1
       or item#>>'{entities,0,id}' <> 'synthetic:resolved:bridge'
       or item#>>'{entities,0,label}' <> 'Synthetic Bridge Entity'
       or item#>>'{entities,0,kind}' <> 'company'
    then
      raise exception 'unresolved identity leaked into discovery graph: %',item;
    end if;
  end loop;

  if not exists (
    select 1
    from jsonb_array_elements(r) x
    where x->>'documentFamily'='calendar'
      and x->>'lineageKey'='synthetic:court-record:1'
  ) then
    raise exception 'calendar lineage missing from discovery loader: %',r;
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(r) x
    where x->>'documentFamily'='payment'
      and x->>'lineageKey'='synthetic:counter-record:1'
  ) then
    raise exception 'payment lineage missing from discovery loader: %',r;
  end if;
end
$block$;

-- Wrong owner/project returns no observations.
do $block$
declare r jsonb;
begin
  r := public.arbor_load_investigation_observations(
    array['85858585-8585-4585-8585-858585858581']::uuid[],
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  );
  if jsonb_array_length(r) <> 0 then
    raise exception 'cross-owner discovery loader leak: %',r;
  end if;
end
$block$;

-- Discovery persistence is append-only.
do $block$
begin
  begin
    update public.arbor_investigation_entities
      set display_label='tampered'
      where id='93939393-9393-4393-8393-939393939391';
    raise exception 'discovery immutable entity update unexpectedly succeeded';
  exception when others then
    if sqlerrm not like '%investigation_discovery_records_are_append_only%' then
      raise;
    end if;
  end;
end
$block$;

-- Ordinary service/client roles cannot update/delete discovery records.
do $block$
declare rel text;
begin
  foreach rel in array array[
    'public.arbor_investigation_entities',
    'public.arbor_investigation_observations',
    'public.arbor_investigation_observation_entities'
  ] loop
    if has_table_privilege('service_role',rel,'UPDATE')
       or has_table_privilege('service_role',rel,'DELETE')
       or has_table_privilege('authenticated',rel,'INSERT')
       or has_table_privilege('authenticated',rel,'UPDATE')
       or has_table_privilege('authenticated',rel,'DELETE')
       or has_table_privilege('anon',rel,'SELECT')
       or has_table_privilege('anon',rel,'INSERT')
       or has_table_privilege('anon',rel,'UPDATE')
       or has_table_privilege('anon',rel,'DELETE')
    then
      raise exception 'discovery mutation privilege leaked for %',rel;
    end if;
  end loop;
end
$block$;

-- Authenticated owner can read its rows but cannot execute the trusted loader.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claim.role','authenticated',false);

do $block$
declare visible integer;
begin
  select count(*) into visible
  from public.arbor_investigation_entities
  where project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if visible <> 3 then
    raise exception 'owner entity RLS visibility wrong: %',visible;
  end if;

  select count(*) into visible
  from public.arbor_investigation_entities
  where user_id='22222222-2222-4222-8222-222222222222';
  if visible <> 0 then
    raise exception 'cross-owner entity RLS leak: %',visible;
  end if;

  begin
    perform public.arbor_load_investigation_observations(
      array['85858585-8585-4585-8585-858585858581']::uuid[],
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    );
    raise exception 'authenticated client unexpectedly executed discovery loader';
  exception
    when insufficient_privilege then null;
  end;
end
$block$;

reset role;
set request.jwt.claim.role = 'service_role';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select 'DISPOSABLE_INVESTIGATION_DISCOVERY_PERSISTENCE=PASS; UNRESOLVED_IDENTITY_EXCLUDED=PASS; OWNER_SCOPE=PASS; APPEND_ONLY=PASS' as receipt;
