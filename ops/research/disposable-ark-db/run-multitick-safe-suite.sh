#!/usr/bin/env bash
# Disposable synthetic ARK multi-tick acceptance runner.
# Loads the real checked-in ARK schema/functions into localhost Postgres,
# overlays source-review proposals, and executes only synthetic receipts.
set -euo pipefail

: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=arbor_synthetic}"

case "$PGHOST" in
  localhost|127.0.0.1) ;;
  *) echo "REFUSING: PGHOST must be localhost/127.0.0.1" >&2; exit 64 ;;
esac
if [ "$PGDATABASE" != "arbor_synthetic" ]; then
  echo "REFUSING: PGDATABASE must be arbor_synthetic" >&2
  exit 64
fi
if [ "$PGUSER" != "postgres" ]; then
  echo "REFUSING: PGUSER must be postgres for the synthetic fixture" >&2
  exit 64
fi

export PGHOST PGPORT PGUSER PGDATABASE

psql -X -v ON_ERROR_STOP=1 -f ops/research/disposable-db/00-fixture.sql
# The shared research fixture keys projects by (id,user_id); the real ARK
# migration also has a direct project_id FK and therefore requires id uniqueness.
psql -X -v ON_ERROR_STOP=1 -c 'create unique index projects_id_ark_fixture_unique on public.projects(id);'
psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/20260918143000_create_ark_autonomous_work_runner.sql
psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/20260918203000_ark_targeted_objective_claim.sql
psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/20260918210000_ark_owner_integrity.sql
psql -X -v ON_ERROR_STOP=1 -f docs/research/sql/PROPOSED_ark_scoped_claim_research_checkpoint_retry_window.sql
psql -X -v ON_ERROR_STOP=1 -f ops/research/disposable-ark-db/80-multitick-research-acceptance.sql
psql -X -v ON_ERROR_STOP=1 -f docs/research/sql/PROPOSED_arbor_research_sessions.sql
psql -X -v ON_ERROR_STOP=1 -f docs/research/sql/PROPOSED_arbor_research_reins_runs.sql
psql -X -v ON_ERROR_STOP=1 -f ops/research/disposable-ark-db/90-reins-run-contract.sql

echo "DISPOSABLE_ARK_MULTITICK_SAFE_SUITE=PASS"
