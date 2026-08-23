# Firefly Supabase migration-canon bootstrap

Status: **canonical local artifacts verified; Firefly unchanged; remote history
bootstrap and migration execution not approved**.

## Tooling and source

- Supabase CLI: `2.115.0`, invoked with
  `corepack pnpm dlx supabase@2.115.0`.
- Docker Desktop: local WSL 2 engine verified with `hello-world`.
- Firefly project: `ncpdlyakrzfvobmwzbon`, PostgreSQL `17.6.1.063`.
- Read-only capture date: 2026-08-23.
- Canonical executable history: repository-root `supabase/migrations/`.
- Design, rollback, audit, and E2E material: `docs/migrations/`.

`supabase db dump --linked` was used instead of `supabase db pull`. A pull
would record a remote applied migration, which is outside the current approval
gate. The raw review dumps remain ignored under `supabase/.temp/` and contain no
row data or credential-like material.

## Ordered canonical artifacts

| Order | Artifact | SHA-256 | Purpose |
| --- | --- | --- | --- |
| 1 | `supabase/migrations/20260823175536_firefly_public_baseline.sql` | `126323DB0D707E40A23D436AA6EECE60EB2034125BCABAFB66D5A88A5B9F0C69` | Complete live `public` schema baseline |
| 2 | `supabase/migrations/20260823175539_firefly_storage_attachment_policies_baseline.sql` | `0730BDB431BBDF208526D32DF6DAEABF21F62E872130C23B27D4DDE0706562BA` | Eight live Arbor attachment policies only |
| 3 | `supabase/migrations/20260823175543_milestone_1b_attachment_scope.sql` | `9154E5281125CE5F5C13C3C93897BB2ACF2395E480B6FC0D64CC05B4E886E0F5` | Approved attachment hardening transaction |

The third artifact is byte-identical to
`docs/migrations/PROPOSED_milestone_1b_attachment_scope.sql`.

## Baseline review and reconciliation

The public raw dump SHA-256 is
`A7ABA9126E7888629FFB14A7EB041AE92F06694A8A3EC1D39C9E4DDA21E35065`.
It contains 33 public tables, three enums, nine functions, one view, 67 indexes,
40 policies, 33 RLS-enabled tables, and the live grants/default privileges. It
contains no row `INSERT`/`COPY`, `DROP`, extension mutation, publication change,
or credential-like material.

The dump referenced `public.vector` but omitted extension DDL. The live catalog
has `vector 0.8.0` in `public`, so the public baseline includes a conditional,
unversioned extension placement block. It creates `vector` in `public` when
absent or relocates a fresh local default there. No extension version is pinned.

The full Storage raw dump SHA-256 is
`2A5CA92A55A3A0571D20D0FC12FB42ADFA87F265C01099DBED367D9E58DC4EDE`.
It contains Supabase-managed Storage tables, a type, 17 functions, ownership,
indexes, and grants; those objects are deliberately excluded from Arbor's
ledger. The Storage baseline contains only the eight live Arbor
`chat attachments%` policies, and every normalized policy statement matches
the raw dump exactly. The private bucket definition is recorded in
`supabase/config.toml`: 10 MiB, non-public, with the six captured MIME types.

At the end of the two baseline migrations, local and live per-object catalog
fingerprints matched exactly for `projects`, `conversations`, `messages`,
`chat_attachments`, and the eight attachment Storage policies. The fingerprints
cover columns/types/defaults, owner, RLS/FORCE RLS, ACLs including PostgreSQL 17
`MAINTAIN`, constraints, indexes, and policy expressions.

## Local reset verification

`supabase db reset --local --version 20260823175539` succeeded and reconstructed
the live pre-Milestone state:

- 33 public tables;
- `vector 0.8.0` in `public`;
- four permissive attachment metadata policies;
- eight attachment Storage policies;
- all eight PostgreSQL 17 table privileges for each of `anon`, `authenticated`,
  and `service_role` on `public.chat_attachments`;
- owner `postgres`, RLS enabled, FORCE RLS false;
- the private 10 MiB attachment bucket and captured MIME allowlist.

A subsequent full `supabase db reset --local` also succeeded. The final local
target has:

- one permissive, authenticated, scoped metadata `SELECT` policy;
- no direct authenticated attachment Storage policy;
- no `anon` table privilege;
- `authenticated`: `SELECT` only;
- `service_role`: `SELECT, UPDATE` only;
- owner/RLS/FORCE RLS and bucket configuration unchanged.

The only reset warning is the expected absence of `supabase/seed.sql`; no seed
data was created or captured.

`supabase db lint --local --schema public,storage --level warning --fail-on
error` reproduced one inherited live public-schema error:
`public.update_memory_strength(double precision, uuid)` writes
`memory_items.strength`, but `public.memory_items` has no `strength` column.
A read-only Firefly query confirmed the same function body and missing column.
The attachment migration does not call or modify this function, so it is
recorded as unrelated drift rather than corrected here. The linter also emits
seven analyzer-only warnings for OUT variables in the Supabase-managed dynamic
SQL function `storage.search_by_timestamp`; managed Storage function code is
outside Arbor's migration ownership.

## Exact future Firefly history bootstrap

Do not run these commands without the separate remote-history and migration
execution approvals.

Immediately before execution, repeat the exact live catalog/zero-fixture capture
and verify no drift. Then, from the linked clean worktree:

```powershell
corepack pnpm dlx supabase@2.115.0 migration repair --linked --status applied 20260823175536 20260823175539
corepack pnpm dlx supabase@2.115.0 migration list --linked
corepack pnpm dlx supabase@2.115.0 db push --linked --dry-run --skip-vault
```

The repair operation is required because Firefly has no migration-history
schema/table. It will create the Supabase migration-history objects as needed
and mark only the two baseline versions as already applied; it must not execute
either baseline SQL file against Firefly. The dry run must show only
`20260823175543_milestone_1b_attachment_scope.sql` as pending.

Only after explicit execution approval:

```powershell
corepack pnpm dlx supabase@2.115.0 db push --linked --skip-vault
```

That command applies the approved Milestone transaction and records version
`20260823175543` in remote migration history. `--skip-vault` prevents unrelated
Vault synchronization. No seed or baseline SQL is pushed.

## Stop gate

No Firefly SQL, migration repair, history creation, policy/grant/RLS change,
bucket change, fixture creation, E2E, remote push, PR update, deployment,
Flutter change, Cron/heartbeat action, or merge is authorized by this document.
