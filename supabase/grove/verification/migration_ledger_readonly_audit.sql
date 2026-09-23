-- The Grove: read-only applied migration versions, with no history writes.
-- Check migration ledger separately. The historical bridge DDL was applied
-- manually through SQL Editor, and the ledger did NOT record that migration.
-- Inspect source + schema and obtain review before any ledger reconciliation.
select version, name
from supabase_migrations.schema_migrations
where version in ('20260922035539', '20260922042500')
order by version;
