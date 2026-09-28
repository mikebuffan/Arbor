-- APPLIED LIVE to The Grove Supabase on 2026-09-28.
-- Live migration ledger:
--   20260928231600_reconcile_grove_private_firefly_read_grants
--
-- Purpose: reconcile a manually-applied bridge schema with migration history
-- WITHOUT replaying its CREATE/GRANT DDL or seeding any owner/project rows.
-- This migration is assertion-only. It fails if the live schema no longer
-- matches the reviewed source contract.

do $reconcile$
declare
  bridge_oid oid := to_regclass('public.grove_private_firefly_bridge');
  grants_oid oid := to_regclass('public.grove_private_ark_project_grants');
begin
  if bridge_oid is null or grants_oid is null then
    raise exception 'grove_private_bridge_schema_missing';
  end if;

  if not exists (
    select 1 from pg_class
    where oid=bridge_oid and relrowsecurity and relforcerowsecurity
  ) then
    raise exception 'grove_private_firefly_bridge_rls_not_forced';
  end if;

  if not exists (
    select 1 from pg_class
    where oid=grants_oid and relrowsecurity and relforcerowsecurity
  ) then
    raise exception 'grove_private_project_grants_rls_not_forced';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename in (
        'grove_private_firefly_bridge',
        'grove_private_ark_project_grants'
      )
  ) then
    raise exception 'grove_private_bridge_client_policy_unexpected';
  end if;

  if has_table_privilege('anon', bridge_oid, 'SELECT')
     or has_table_privilege('anon', bridge_oid, 'INSERT')
     or has_table_privilege('anon', bridge_oid, 'UPDATE')
     or has_table_privilege('anon', bridge_oid, 'DELETE')
     or has_table_privilege('authenticated', bridge_oid, 'SELECT')
     or has_table_privilege('authenticated', bridge_oid, 'INSERT')
     or has_table_privilege('authenticated', bridge_oid, 'UPDATE')
     or has_table_privilege('authenticated', bridge_oid, 'DELETE')
     or has_table_privilege('anon', grants_oid, 'SELECT')
     or has_table_privilege('anon', grants_oid, 'INSERT')
     or has_table_privilege('anon', grants_oid, 'UPDATE')
     or has_table_privilege('anon', grants_oid, 'DELETE')
     or has_table_privilege('authenticated', grants_oid, 'SELECT')
     or has_table_privilege('authenticated', grants_oid, 'INSERT')
     or has_table_privilege('authenticated', grants_oid, 'UPDATE')
     or has_table_privilege('authenticated', grants_oid, 'DELETE')
  then
    raise exception 'grove_private_bridge_client_privilege_unexpected';
  end if;

  if not has_table_privilege('service_role', bridge_oid, 'SELECT')
     or not has_table_privilege('service_role', bridge_oid, 'INSERT')
     or not has_table_privilege('service_role', bridge_oid, 'UPDATE')
     or not has_table_privilege('service_role', bridge_oid, 'DELETE')
     or not has_table_privilege('service_role', grants_oid, 'SELECT')
     or not has_table_privilege('service_role', grants_oid, 'INSERT')
     or not has_table_privilege('service_role', grants_oid, 'UPDATE')
     or not has_table_privilege('service_role', grants_oid, 'DELETE')
  then
    raise exception 'grove_private_bridge_service_privilege_missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid=bridge_oid and contype='f'
      and confrelid='public.grove_private_owner_access'::regclass
      and confdeltype='c'
  ) then
    raise exception 'grove_private_bridge_owner_cascade_missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid=grants_oid and contype='f'
      and confrelid=bridge_oid and confdeltype='c'
  ) then
    raise exception 'grove_private_project_grant_bridge_cascade_missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid=bridge_oid and contype='p'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid=grants_oid and contype='p'
  ) then
    raise exception 'grove_private_bridge_primary_key_missing';
  end if;
end
$reconcile$;
