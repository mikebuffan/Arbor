-- The Grove: read-only bridge schema/security verification.
-- Execute against the *dedicated Grove* project only. No DDL, writes,
-- credentials, personal identifiers, or grants are created by this file.
-- The two bridge tables intentionally have ZERO client-side RLS policies;
-- do not "fix" that informational linter by granting browser access.

with expected (table_name, authenticated_select_expected, policies_expected) as (
  values
    ('grove_private_owner_access', true, 1),
    ('grove_private_firefly_bridge', false, 0),
    ('grove_private_ark_project_grants', false, 0)
),
actual as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced,
    has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
    has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
    has_table_privilege('authenticated', c.oid, 'INSERT, UPDATE, DELETE') as authenticated_write,
    has_table_privilege('service_role', c.oid, 'SELECT') as service_select,
    (select count(*) from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.relname)
      as policy_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (select table_name from expected)
)
select
  e.table_name,
  a.table_name is not null as table_exists,
  a.rls_enabled,
  a.rls_forced,
  a.anon_select,
  a.authenticated_select,
  a.authenticated_write,
  a.service_select,
  a.policy_count,
  coalesce(
    a.rls_enabled and a.rls_forced
    and not a.anon_select
    and a.authenticated_select = e.authenticated_select_expected
    and not a.authenticated_write
    and a.service_select
    and a.policy_count = e.policies_expected,
    false
  ) as expected_access_contract
from expected e
left join actual a using (table_name)
order by e.table_name;

-- See migration_ledger_readonly_audit.sql for a separate result set.
