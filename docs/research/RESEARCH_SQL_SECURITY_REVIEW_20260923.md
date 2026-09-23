# Research SQL security review — staged evidence (2026-09-23)

Scope: proposed research-session SQL and disposable synthetic PostgreSQL fixture only. This is **not** production approval.

## Source-level observations

Reviewed `docs/research/sql/PROPOSED_arbor_research_sessions.sql` at the current research lineage.

- Research session/unit/receipt tables enable RLS.
- `anon` and `authenticated` are revoked before authenticated read-only SELECT is granted.
- Service-role gets table access for the proposed worker path.
- `arbor_claim_research_unit`, `arbor_settle_research_unit`, and `arbor_stop_research_session` are SECURITY DEFINER and explicitly pin `search_path = public, pg_temp`.
- RPC EXECUTE is revoked from PUBLIC/anon/authenticated and granted to service_role.
- RPC predicates bind session + user + project, and unit settlement additionally binds unit + session + user + project + lease token.
- Owner-facing reads rely on RLS policies comparing persisted `user_id` to `auth.uid()`.

These observations are necessary but do not prove effective deployed privileges.

## New disposable acceptance staged

`ops/research/disposable-db/65-security-privilege-matrix.sql` adds synthetic assertions for:

1. PUBLIC, anon, and authenticated cannot EXECUTE any research worker RPC.
2. service_role retains expected EXECUTE.
3. authenticated is table-read-only and anon has no table privileges.
4. SECURITY DEFINER is set, search_path remains pinned, and client roles do not own the functions.
5. RLS is enabled on all three research tables.
6. Two synthetic owners remain isolated under authenticated RLS.
7. An authenticated client that changes the request JWT-role setting to `service_role` still cannot call a worker RPC because PostgreSQL EXECUTE privileges remain an outer fence.

## Still required before production

- Execute the matrix in the disposable PostgreSQL environment and retain exact-head logs.
- Confirm the effective function owner and deployment role in the actual target Supabase project.
- Confirm Supabase role membership/default grants do not differ from the synthetic fixture.
- Review schema CREATE/USAGE privileges and extension/function name-resolution assumptions in the target environment.
- Review service-role secret custody and host-side owner/project binding; DB service role intentionally bypasses RLS.
- Verify no alternate overloaded RPC signature inherits PUBLIC EXECUTE.
- Re-check privileges after any migration tooling transforms the SQL.
- Separate production migration/deployment authorization remains required.

Status: **PARTIAL / staged, not executed**.
