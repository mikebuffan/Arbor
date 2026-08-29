# Firefly Supabase migration-canon bootstrap

Status: **canonical local artifacts verified; Firefly migration history
bootstrapped with the two baseline versions; application schema unchanged;
Milestone 1B migration execution not approved**.

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

## Executed Firefly history bootstrap

On 2026-08-23, the separately approved migration-history-only bootstrap was run
from the linked clean worktree at
`9eb8edbccd40612fbac18aecb56b060f02d5b28a` using the pinned CLI. The linked
project ref was `ncpdlyakrzfvobmwzbon`, and the three canonical migration hashes
still matched the values above.

The exact authorized repair command and output were:

```powershell
corepack pnpm dlx supabase@2.115.0 migration repair --linked --status applied 20260823175536 20260823175539
```

```text
Initialising login role...
Connecting to remote database...
Repaired migration history: [20260823175536 20260823175539] => applied
{"versions":["20260823175536","20260823175539"],"status":"applied","repairAll":false,"message":"Migration history repaired"}
```

No application migration SQL was executed. The repair created the previously
absent `supabase_migrations` history objects and recorded exactly these remote
rows:

| Version | Name |
| --- | --- |
| `20260823175536` | `firefly_public_baseline` |
| `20260823175539` | `firefly_storage_attachment_policies_baseline` |

`migration list --linked` returned exactly:

```json
{"migrations":[{"local":"20260823175536","remote":"20260823175536","time":"2026-08-23 17:55:36"},{"local":"20260823175539","remote":"20260823175539","time":"2026-08-23 17:55:39"},{"local":"20260823175543","remote":"","time":"2026-08-23 17:55:43"}],"message":"Migrations listed"}
```

Therefore both baseline versions are present locally and remotely, while
`20260823175543` remains local-only and pending.

The required non-mutating push preview was then run:

```powershell
corepack pnpm dlx supabase@2.115.0 db push --linked --dry-run --skip-vault
```

```text
Initialising login role...
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Would push these migrations:
 • 20260823175543_milestone_1b_attachment_scope.sql
{"upToDate":false,"dryRun":true,"migrations":["20260823175543_milestone_1b_attachment_scope.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

The dry run identified only the approved Milestone 1B attachment-scope artifact
as pending. It identified no seed or roles operation.

### Pre/post catalog proof

Read-only snapshots were captured immediately before and after the repair at
`2026-08-24T00:35:34.199146Z` and `2026-08-24T00:40:36.066021Z`. Every
application-catalog fingerprint and count remained identical:

| Catalog surface | Before | After |
| --- | --- | --- |
| Public tables | 33 / `1e29d37a0dbe000f647d3e9ebd45237f` | 33 / `1e29d37a0dbe000f647d3e9ebd45237f` |
| Public columns | 326 / `cef405582d8676825cdc167c1af0b127` | 326 / `cef405582d8676825cdc167c1af0b127` |
| Public constraints | 86 / `5d22e90894bfc00073aa0b9cac941a90` | 86 / `5d22e90894bfc00073aa0b9cac941a90` |
| Public indexes | 108 / `44781593948c993ed199cafd9ffdee49` | 108 / `44781593948c993ed199cafd9ffdee49` |
| Public policies | 40 / `8b5d0b27a789a4825db5227951876a41` | 40 / `8b5d0b27a789a4825db5227951876a41` |
| Public role grants | 952 / `ce7ab2cc02e2915e58e8ff430e5e9a96` | 952 / `ce7ab2cc02e2915e58e8ff430e5e9a96` |

The attachment-specific comparison also remained exact:

- `public.chat_attachments`: zero rows, owner `postgres`, RLS enabled, FORCE
  RLS false, and the same four permissive metadata policies;
- `storage.objects` for `chat-attachments`: zero objects and the same eight
  attachment policies;
- direct privileges for each of `anon`, `authenticated`, and `service_role`:
  `DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`;
- `chat-attachments` bucket: private, 10 MiB, versioning disabled, and the same
  six-type MIME allowlist.

The only remote database delta was the authorized creation/update of Supabase
migration-history metadata and its two approved baseline records.

## Exact future Milestone migration command

Do not run this command without separate migration-execution approval.

Only after explicit execution approval:

```powershell
corepack pnpm dlx supabase@2.115.0 db push --linked --skip-vault
```

That command applies the approved Milestone transaction and records version
`20260823175543` in remote migration history. `--skip-vault` prevents unrelated
Vault synchronization. No seed or baseline SQL is pushed.

## Stop gate

The history-only bootstrap above is complete. No Milestone migration execution,
policy/grant/RLS change, bucket change, fixture creation, E2E, remote push, PR
update, deployment, Flutter change, Cron/heartbeat action, or merge is
authorized by this document.
