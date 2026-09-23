\set ON_ERROR_STOP on
-- Item 42 DRAFT: disposable privilege/security acceptance only.
-- Requires 00-fixture.sql and PROPOSED_arbor_research_sessions.sql.
-- No production DB, no real users, no network access.

-- Catalog-level privilege checks: client roles and PUBLIC must not execute worker RPCs.
do $$
declare sig text;
begin
 foreach sig in array array[
   'public.arbor_claim_research_unit(uuid,uuid,uuid,text,integer)',
   'public.arbor_settle_research_unit(uuid,uuid,uuid,uuid,uuid,text,text,integer,text[],integer,jsonb)',
   'public.arbor_stop_research_session(uuid,uuid,uuid,text,text)'
 ] loop
   if has_function_privilege('anon',sig,'EXECUTE')
      or has_function_privilege('authenticated',sig,'EXECUTE') then
     raise exception 'client execute leaked for %',sig;
   end if;
   if exists (
     select 1
     from pg_proc p
     cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
     where p.oid=to_regprocedure(sig) and a.grantee=0 and a.privilege_type='EXECUTE'
   ) then
     raise exception 'PUBLIC execute leaked for %',sig;
   end if;
   if not has_function_privilege('service_role',sig,'EXECUTE') then
     raise exception 'service_role execute missing for %',sig;
   end if;
 end loop;
end $$;

-- No unexpected overloaded worker RPC may exist under the same public names.
do $
declare claim_count integer; settle_count integer; stop_count integer;
begin
 select count(*) into claim_count from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='arbor_claim_research_unit';
 select count(*) into settle_count from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='arbor_settle_research_unit';
 select count(*) into stop_count from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='arbor_stop_research_session';
 if claim_count<>1 or settle_count<>1 or stop_count<>1 then
   raise exception 'unexpected research RPC overload count claim=% settle=% stop=%',
     claim_count,settle_count,stop_count;
 end if;
end $;

-- Client roles must not be able to create shadow objects in public/auth schemas.
do $
begin
 if has_schema_privilege('anon','public','CREATE')
    or has_schema_privilege('authenticated','public','CREATE')
    or has_schema_privilege('anon','auth','CREATE')
    or has_schema_privilege('authenticated','auth','CREATE') then
   raise exception 'client schema CREATE privilege leaked';
 end if;
end $;

-- Authenticated clients are read-only at table-grant level; anon has no table access.
do $$
declare rel text;
begin
 foreach rel in array array[
   'public.arbor_research_sessions',
   'public.arbor_research_units',
   'public.arbor_research_receipts'
 ] loop
   if not has_table_privilege('authenticated',rel,'SELECT')
      or has_table_privilege('authenticated',rel,'INSERT')
      or has_table_privilege('authenticated',rel,'UPDATE')
      or has_table_privilege('authenticated',rel,'DELETE') then
     raise exception 'authenticated table grant wrong for %',rel;
   end if;
   if has_table_privilege('anon',rel,'SELECT')
      or has_table_privilege('anon',rel,'INSERT')
      or has_table_privilege('anon',rel,'UPDATE')
      or has_table_privilege('anon',rel,'DELETE') then
     raise exception 'anon table grant leaked for %',rel;
   end if;
 end loop;
end $$;

-- SECURITY DEFINER functions must pin search_path, and must not be owned by client roles.
do $$
declare bad_count integer;
begin
 select count(*) into bad_count
 from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace
 join pg_roles r on r.oid=p.proowner
 where n.nspname='public'
   and p.proname in (
     'arbor_claim_research_unit',
     'arbor_settle_research_unit',
     'arbor_stop_research_session'
   )
   and (
     not p.prosecdef
     or coalesce(array_to_string(p.proconfig,','),'') <> 'search_path=public, pg_temp'
     or r.rolname in ('public','anon','authenticated')
   );
 if bad_count <> 0 then
   raise exception 'SECURITY DEFINER owner/search_path contract failed for % function(s)',bad_count;
 end if;
end $$;

-- RLS must be enabled and forced client visibility stays owner-scoped.
do $$
declare bad_count integer;
begin
 select count(*) into bad_count
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public'
   and c.relname in ('arbor_research_sessions','arbor_research_units','arbor_research_receipts')
   and not c.relrowsecurity;
 if bad_count <> 0 then raise exception 'RLS disabled on research table(s)'; end if;
end $$;

-- Create two synthetic owner rows as service-role setup.
set request.jwt.claim.role = 'service_role';
insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,max_cost_cents,authorized,unresolved_required_work)
values
('42424242-4242-4242-8242-424242424241','11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','security owner one',
 clock_timestamp()-interval '1 minute',clock_timestamp()+interval '10 minutes',1,1,true,1),
('42424242-4242-4242-8242-424242424242','22222222-2222-4222-8222-222222222222',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','security owner two',
 clock_timestamp()-interval '1 minute',clock_timestamp()+interval '10 minutes',1,1,true,1);

-- Authenticated role can see only its own session, and cannot execute RPC even if it
-- spoofs the request.jwt.claim.role setting. EXECUTE grants are the outer fence.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claim.role','service_role',false);
do $$
declare visible integer;
begin
 select count(*) into visible
 from public.arbor_research_sessions
 where id in (
   '42424242-4242-4242-8242-424242424241',
   '42424242-4242-4242-8242-424242424242'
 );
 if visible <> 1 then raise exception 'owner RLS visibility wrong: %',visible; end if;

 begin
   perform public.arbor_claim_research_unit(
     '42424242-4242-4242-8242-424242424241',
     '11111111-1111-4111-8111-111111111111',
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','spoofed-client',30
   );
   raise exception 'authenticated spoof unexpectedly executed worker RPC';
 exception
   when insufficient_privilege then null;
 end;
end $$;
reset role;

select 'DISPOSABLE_DB_SECURITY_PRIVILEGE_MATRIX=PASS' as receipt;
