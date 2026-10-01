\set ON_ERROR_STOP on

-- Catalog-level fail-closed assertions.
do $security$
declare r record;
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind='r'
      and c.relname like 'arbor_research_%'
      and not c.relrowsecurity
  ) then raise exception 'research table without RLS'; end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema='public' and table_name like 'arbor_research_%'
      and grantee in ('anon','PUBLIC')
  ) then raise exception 'anon/public research table privilege leaked'; end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema='public' and table_name like 'arbor_research_%'
      and grantee='authenticated'
      and not (
        privilege_type='SELECT'
        and table_name in ('arbor_research_sessions','arbor_research_units','arbor_research_receipts')
      )
  ) then raise exception 'authenticated raw research privilege leaked'; end if;

  if (
    select count(distinct table_name)
    from information_schema.role_table_grants
    where table_schema='public' and grantee='authenticated'
      and privilege_type='SELECT'
      and table_name in ('arbor_research_sessions','arbor_research_units','arbor_research_receipts')
  ) <> 3 then raise exception 'owner-readable session grants incomplete'; end if;

  for r in
    select c.oid, n.nspname, c.relname
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relname like 'arbor_research_%'
  loop
    if not has_table_privilege('service_role',r.oid,'SELECT')
       or not has_table_privilege('service_role',r.oid,'INSERT')
       or not has_table_privilege('service_role',r.oid,'UPDATE')
       or not has_table_privilege('service_role',r.oid,'DELETE')
    then raise exception 'service_role research privilege incomplete for %',r.relname; end if;
  end loop;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('arbor_claim_research_unit','arbor_settle_research_unit','arbor_stop_research_session')
      and p.prosecdef
  ) then raise exception 'research RPC SECURITY DEFINER regression'; end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('arbor_claim_research_unit','arbor_settle_research_unit','arbor_stop_research_session')
      and coalesce(array_to_string(p.proconfig,','),'') not like '%search_path=pg_catalog, public%'
  ) then raise exception 'research RPC search_path not pinned'; end if;

  if has_function_privilege('anon',
       'public.arbor_claim_research_unit(uuid,uuid,uuid,text,integer)','EXECUTE')
     or has_function_privilege('authenticated',
       'public.arbor_claim_research_unit(uuid,uuid,uuid,text,integer)','EXECUTE')
     or has_function_privilege('anon',
       'public.arbor_settle_research_unit(uuid,uuid,uuid,uuid,uuid,text,text,integer,text[],integer,jsonb)','EXECUTE')
     or has_function_privilege('authenticated',
       'public.arbor_stop_research_session(uuid,uuid,uuid,text,text)','EXECUTE')
  then raise exception 'research write RPC leaked to client role'; end if;

  if not has_function_privilege('service_role',
       'public.arbor_claim_research_unit(uuid,uuid,uuid,text,integer)','EXECUTE')
     or not has_function_privilege('service_role',
       'public.arbor_settle_research_unit(uuid,uuid,uuid,uuid,uuid,text,text,integer,text[],integer,jsonb)','EXECUTE')
     or not has_function_privilege('service_role',
       'public.arbor_stop_research_session(uuid,uuid,uuid,text,text)','EXECUTE')
  then raise exception 'service_role RPC execute missing'; end if;
end
$security$;

-- Prove the RPC still works as the actual service_role after removing definer elevation.
insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,max_cost_cents,
 authorized,unresolved_required_work)
values
('92000000-0000-4000-8000-000000000001',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'security invoker acceptance',now()-interval '1 minute',now()+interval '10 minutes',
 1,1,true,1);

insert into public.arbor_research_units
(id,session_id,user_id,project_id,unit_key,kind,max_cost_reservation_cents)
values
('92000000-0000-4000-8000-000000000011',
 '92000000-0000-4000-8000-000000000001',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'security-unit','security_acceptance',1);

set role service_role;
do $service$
declare c jsonb;
begin
  c := public.arbor_claim_research_unit(
    '92000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'security-worker',60
  );
  if c is null or c->>'idempotencyKey' <> 'security-unit'
  then raise exception 'service_role security-invoker claim failed: %',c; end if;
end
$service$;
reset role;

select 'RESEARCH_SECURITY_HARDENING_V5=PASS' as result;
