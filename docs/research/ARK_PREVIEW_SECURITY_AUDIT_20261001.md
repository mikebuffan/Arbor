# Firefly ARK Preview — read-only security baseline

Date: 2026-10-01

Scope: connected **Firefly ARK Preview** Supabase project only. This audit was read-only. No production Firefly/Grove mutation, no Preview DDL, no grants changed, no auth setting changed.

## Current Supabase guidance used

- Exposed-schema tables require both least-privilege grants and RLS.
- RLS policies and grants are separate gates; policies do not revoke broad grants.
- Prefer SECURITY INVOKER. SECURITY DEFINER requires special care, pinned/empty search_path, and should not be exposed casually.
- Public-schema views require security-invoker behavior or equivalent protection.

References:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions

## Observed Preview state

### RLS
All public tables returned by the connected table inventory reported RLS enabled.

Supabase Security Advisor reported 20 `rls_enabled_no_policy` INFO findings. These tables are deny-by-default to ordinary client roles when no policy exists, but broad grants still violate least-privilege expectations and make intent unclear.

Advisor also reported:
- `vector` extension installed in `public` (WARN).
- leaked-password protection disabled (WARN).

### Anonymous visibility check
A read-only transaction under the actual `anon` database role returned zero visible rows for:
- `public.projects`
- `public.ark_objectives`
- `public.ark_tasks`
- `public.ark_events`
- `public.arbor_conversation_state`
- `public.arbor_pattern_hop_runs`

This is evidence that current RLS fences those sampled rows. It is not a proof that every policy/table/function is correct.

### Public-schema CREATE
Catalog checks returned:
- anon CREATE on public: false
- authenticated CREATE on public: false
- service_role CREATE on public: false
- anon/authenticated USAGE on public: true

This reduces public-schema object-injection risk for invoker functions.

### ARK / Arbor database functions
The inspected `ar_*`, `arbor_*`, and `ark_*` functions were not SECURITY DEFINER.

The worker/ARK queue functions were explicitly executable only by postgres/service_role.

Several older client-facing helper functions were SECURITY INVOKER but still had broad EXECUTE grants to anon/authenticated, including functions that accept an explicit `p_user_id`. RLS currently remains the row-authorization boundary for those functions.

Two `ar_*` write helpers target RLS-enabled tables with no client policy while still being executable by client roles. That combination appears functionally service-only today and should be made explicit rather than relying on a later RLS failure.

### Table grants
Many older public tables retain broad default privileges for anon/authenticated even though RLS narrows or entirely denies row access.

ARK queue tables are already materially tighter: service_role has write privileges while client roles are read-only, and their SELECT policies are scoped to authenticated ownership.

## Security conclusions

1. **No sampled anonymous row leak was observed.**
2. **Broad grants are still unnecessary attack surface and operational ambiguity.**
3. The proposed research-session RPCs should not use SECURITY DEFINER at all; service_role already has the required privileges and bypasses RLS.
4. Raw Epstein research/evidence tables should be service-role-only until a deliberately reviewed human-review API is introduced.
5. Owner-readable session status can remain SELECT-only for authenticated owners.
6. `vector` should not be moved blindly: first inventory all vector-typed columns, functions, indexes and SQL references because changing extension schema can break qualified references.
7. Leaked-password protection is an Auth project setting and should be enabled separately after owner approval.
8. Existing legacy grant tightening should be staged and regression-tested; changing grants can change API error behavior even when RLS already returns no rows.

## v5 implementation response

The v5 GitHub child:
- converts proposed research RPCs from SECURITY DEFINER to SECURITY INVOKER;
- removes the unnecessary pgcrypto extension creation;
- pins the research RPC search path;
- explicitly revokes client privileges from raw research tables;
- preserves authenticated owner SELECT only for bounded session/status tables;
- grants research writes/RPC execution only to service_role;
- adds catalog-level disposable CI assertions for RLS, table grants, function elevation, function search_path and EXECUTE privileges;
- proves an actual service_role can still claim a bounded research unit after elevation is removed.

No Preview SQL is applied by this branch.
