# Grove / Firefly read bridge — manual SQL Editor application receipt

Checked September 21 PDT / September 22 UTC. Only the dedicated Supabase project named **The Grove** was used. No owner, provider account or Firefly record was created or copied.

## What happened
- Supabase integration's `apply_migration` attempt was blocked **before it returned a success result**.
- Danelle explicitly ran a copy/paste SQL block in **The Grove → SQL Editor** and reported success.
- Follow-up connected Supabase `list_tables` and privilege query independently verified that `public.grove_private_firefly_bridge` and `public.grove_private_ark_project_grants` now exist.
- Both have RLS **enabled and forced**; `anon` and `authenticated` have no SELECT, INSERT, UPDATE or DELETE privileges.
- Direct SQL count: owner grants **0**, account mappings **0**, project grants **0**.
- The existing `grove_private_owner_access` still has forced RLS, own-row SELECT for authenticated users and no client writes.
- Security advisor shows two **INFO** lints (`rls_enabled_no_policy`) on the new mapping tables. This is deliberate deny-all for clients; backend service-role access is separately restricted. Do not silence by adding a permissive policy.

## Migration-history discrepancy / IMPORTANT

Source-of-truth intended SQL file: [20260922042500_grove_private_firefly_read_grants.sql](../../supabase/grove/migrations/20260922042500_grove_private_firefly_read_grants.sql).

Because the SQL Editor rather than Supabase `apply_migration` executed the SQL, the migration-history list **does not record** `grove_private_firefly_read_grants`. Only `20260922035539_grove_private_owner_access` is recorded. The manually applied SQL has the same structural DDL/security grants as the source file, but its comments differ. Treat the bridge schema as **applied manually, history unreconciled**. Do not blindly rerun or merge automatic migrations until a separate migration-baseline review resolves this. Do not claim the Supabase migration registry shows the second migration.

## Engineering status
The draft broker file at `apps/backend/lib/grove/privateReadBroker.ts` is now wired in source to `apps/backend/app/api/grove/ark/status/route.ts` and the private Flutter reader selects `/api/grove/ark/status`, while original Firefly selects `/api/ark/status`. Twenty synthetic backend cases and one Flutter route regression case have been committed. **Exact code head `a39dd78123f8b80d4981c2fd56c079e482e17501` passed GitHub Actions [Grove verification run 35687588013](https://github.com/mikebuffan/Arbor/actions/runs/35687588013): backend tests, TypeScript, backend build, Flutter analyze and Flutter tests all green.** Previous head failed the new typecheck due to a database row type cast; this was corrected before the green run. **No protected Grove API deployment, configured credentials, hosted LM, invited owner or real private→Firefly read has been verified.** The previous connector route/Flutter write block was resolved by retrying smaller, targeted writes; do not repeat that task manually.

Before a read can succeed, separately verify the invitation and matching Grove owner grant; provision a reviewed revocable Grove-user → Firefly-user mapping and per-project grants; protect backend credentials and private deployment; verify JWT signature/issuer/audience, RLS and Firefly ownership; implement and test the route, client path, revocation and cross-account isolation. Do not paste service keys into ChatGPT, client builds, or GitHub.
