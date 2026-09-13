# Arbor closed-beta backend release operations

Date: 2026-09-12

This runbook contains the operational steps that remain outside ordinary application code. It is intentionally narrow: database backup/recovery, Vercel edge rate limiting, and the quota-gated live acceptance pass.

## Firefly database backup and recovery

Firefly's Supabase organization is on the Free plan, so the beta release procedure must retain an external logical backup before external beta data is admitted.

### Create and verify a backup

Prerequisites:

- PostgreSQL client tools (`pg_dump` and `pg_restore`) installed locally;
- `FIREFLY_DATABASE_URL` set in the operator environment to the direct or pooler PostgreSQL connection URL.

Run:

```bash
pnpm --filter firefly-backend backup:firefly
```

The script:

- keeps the database URL out of process arguments;
- writes a PostgreSQL custom-format dump under `.local/backups/firefly/` by default;
- uses `--no-owner --no-privileges` for portability;
- immediately validates the archive with `pg_restore --list`;
- never commits the archive because `.local/backups/` is gitignored.

To re-verify an existing archive:

```bash
pnpm --filter firefly-backend backup:firefly:verify -- .local/backups/firefly/<file>.dump
```

Retain at least one verified pre-beta dump outside the repository on storage controlled by the project owner.

### Restore procedure

Do not test recovery by overwriting the live Firefly database. Restore into a deliberately selected empty/scratch PostgreSQL database first.

Set the scratch target as `FIREFLY_RESTORE_DATABASE_URL`, then expose it to libpq through `PGDATABASE` so credentials do not need to appear in command-line arguments.

PowerShell:

```powershell
$env:PGDATABASE = $env:FIREFLY_RESTORE_DATABASE_URL
pg_restore --no-owner --no-privileges --exit-on-error .local/backups/firefly/<file>.dump
```

POSIX shell:

```bash
export PGDATABASE="$FIREFLY_RESTORE_DATABASE_URL"
pg_restore --no-owner --no-privileges --exit-on-error .local/backups/firefly/<file>.dump
```

After restore, run the application migration-ledger check and the backend beta gate against the intended recovery environment before promoting any recovered database.

## Vercel closed-beta firewall rule

Arbor carries an idempotent firewall automation script at `apps/backend/scripts/vercel-beta-firewall.mjs`.

Default policy:

- rule name: `Arbor closed-beta expensive API limit`;
- `/api/chat` and `/api/arbor/voice*`;
- 60 requests per 60 seconds;
- key: source IP;
- fixed-window algorithm;
- Vercel rate-limit mitigation.

The defaults can be changed operationally with `ARBOR_BETA_RATE_LIMIT_REQUESTS` and `ARBOR_BETA_RATE_LIMIT_WINDOW_SECONDS` without changing application architecture.

### Inspect without mutation

With an authorized Vercel API token in `VERCEL_TOKEN`:

```bash
pnpm --filter firefly-backend ops:firewall:plan
```

### Publish and verify

Publishing requires both the token and an explicit mutation guard:

PowerShell:

```powershell
$env:ALLOW_VERCEL_FIREWALL_PUBLISH = "YES"
pnpm --filter firefly-backend ops:firewall:apply
```

POSIX shell:

```bash
export ALLOW_VERCEL_FIREWALL_PUBLISH=YES
pnpm --filter firefly-backend ops:firewall:apply
```

The script re-reads the active Vercel firewall configuration after activation and exits non-zero unless the active rule matches the desired rule.

Never commit `VERCEL_TOKEN` or place it in command arguments.

## Focused live acceptance

The remaining Milestone 1B live acceptance must run against the exact beta candidate after OpenAI project quota/model capacity is usable.

Required evidence remains:

- authenticated protected-preview access;
- user/project ownership boundary;
- successful canonical assistant turn;
- same-`turnId` retry convergence;
- correction durability and continuation behavior from the focused acceptance matrix;
- bounded/redacted provider diagnostics;
- exact synthetic-fixture cleanup with zero residue.

Do not manufacture an Auth user directly in `auth.users` with SQL to satisfy this check. Use the supported Supabase Auth path and a real short-lived synthetic session so the test exercises the same authentication boundary as the application.

## Promotion rule

The backend may be promoted from `BACKEND HOLD — finite release checks only` to `BACKEND READY FOR CLOSED BETA` when all of the following are recorded on the exact final candidate:

1. integration CI/build/beta gate and preview are green;
2. the focused live acceptance succeeds;
3. the Vercel firewall rule is active and verified;
4. a verified Firefly logical dump has been retained and the restore procedure above has been exercised against a scratch target or otherwise approved for the closed-beta release.
