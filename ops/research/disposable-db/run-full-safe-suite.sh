#!/usr/bin/env bash
# Disposable synthetic PostgreSQL research acceptance runner.
# This file only orchestrates already-existing synthetic tests; it does not provision or connect remotely.
set -euo pipefail

: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=arbor_synthetic}"

case "$PGHOST" in
  localhost|127.0.0.1) ;;
  *) echo "REFUSING: PGHOST must be localhost/127.0.0.1 for disposable research suite" >&2; exit 64 ;;
esac
if [ "$PGDATABASE" != "arbor_synthetic" ]; then
  echo "REFUSING: PGDATABASE must be arbor_synthetic" >&2
  exit 64
fi
if [ "$PGUSER" != "postgres" ]; then
  echo "REFUSING: PGUSER must be postgres in the synthetic fixture" >&2
  exit 64
fi

export PGHOST PGPORT PGUSER PGDATABASE

psql -X -v ON_ERROR_STOP=1 -f ops/research/disposable-db/00-fixture.sql
psql -X -v ON_ERROR_STOP=1 -f docs/research/sql/PROPOSED_arbor_research_sessions.sql
psql -X -v ON_ERROR_STOP=1 -f ops/research/disposable-db/10-acceptance.sql
psql -X -v ON_ERROR_STOP=1 -f ops/research/disposable-db/20-boundaries.sql
bash ops/research/disposable-db/30-concurrency.sh
bash ops/research/disposable-db/40-lock-waits.sh
bash ops/research/disposable-db/50-stop-race.sh
psql -X -v ON_ERROR_STOP=1 -f ops/research/disposable-db/60-attempt-failure-stall.sql
psql -X -v ON_ERROR_STOP=1 -f ops/research/disposable-db/65-security-privilege-matrix.sql
psql -X -v ON_ERROR_STOP=1 -f ops/research/disposable-db/70-persisted-session-simulation.sql

echo "DISPOSABLE_RESEARCH_FULL_SAFE_SUITE=PASS"
