#!/usr/bin/env bash
# Ephemeral CI PostgreSQL ONLY. Separate psql processes exercise actual row-lock races.
set -euo pipefail
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
session='33333333-3333-4333-8333-333333333333'
unit='44444444-4444-4444-8444-444444444444'
user='11111111-1111-4111-8111-111111111111'
project='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
psql -X -v ON_ERROR_STOP=1 -q <<SQL
insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
 max_cost_cents,authorized,unresolved_required_work)
values ('$session','$user','$project','concurrent synthetic',
 clock_timestamp()-interval '1 minute',clock_timestamp()+interval '10 minutes',
 1,1,true,1);
insert into public.arbor_research_units
(id,session_id,user_id,project_id,unit_key,kind,max_cost_reservation_cents)
values ('$unit','$session','$user','$project','concurrent-unit','synthetic',1);
SQL
claim_sql="set request.jwt.claim.role='service_role'; select coalesce(public.arbor_claim_research_unit('$session','$user','$project','concurrent-worker')::text,'NULL');"
# Two independent database connections race to claim one unit.
psql -X -v ON_ERROR_STOP=1 -At -c "$claim_sql" > "$workdir/claim-a" &
pid_a=$!
psql -X -v ON_ERROR_STOP=1 -At -c "$claim_sql" > "$workdir/claim-b" &
pid_b=$!
wait "$pid_a"
wait "$pid_b"
claims="$(grep -h -c '"leaseToken"' "$workdir/claim-a" "$workdir/claim-b" | awk '{s+=$1} END {print s+0}')"
test "$claims" -eq 1 || { echo "Expected one concurrent claim, got $claims"; exit 1; }
token="$(psql -X -v ON_ERROR_STOP=1 -At -c "select lease_token from public.arbor_research_units where id='$unit'")"
test -n "$token"
settle_sql="set request.jwt.claim.role='service_role'; select public.arbor_settle_research_unit('$session','$user','$project','$unit','$token','concurrent-unit','completed',1,array['synthetic:concurrent'],0,'{}'::jsonb);"
psql -X -v ON_ERROR_STOP=1 -At -c "$settle_sql" > "$workdir/settle-a" &
pid_a=$!
psql -X -v ON_ERROR_STOP=1 -At -c "$settle_sql" > "$workdir/settle-b" &
pid_b=$!
wait "$pid_a"
wait "$pid_b"
grep -qx committed "$workdir/settle-a" && grep -qx duplicate "$workdir/settle-b" ||
grep -qx duplicate "$workdir/settle-a" && grep -qx committed "$workdir/settle-b" ||
{ echo 'Concurrent duplicate settlement violated'; cat "$workdir/settle-a" "$workdir/settle-b"; exit 1; }
receipt_count="$(psql -X -v ON_ERROR_STOP=1 -At -c "select count(*) from public.arbor_research_receipts where session_id='$session'")"
spent="$(psql -X -v ON_ERROR_STOP=1 -At -c "select committed_cost_cents from public.arbor_research_sessions where id='$session'")"
test "$receipt_count" = 1 && test "$spent" = 1 || { echo 'Duplicate spend or receipt'; exit 1; }
echo 'DISPOSABLE_DB_TRUE_CONCURRENCY=PASS (two independent claimers, two independent settlers)'
