#!/usr/bin/env bash
# Synthetic-only STOP/settle race. Either serialization order is safe.
set -euo pipefail
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
user='11111111-1111-4111-8111-111111111111'
project='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
session='99999999-9999-4999-8999-999999999999'
unit='aaaaaaaa-aaaa-4aaa-8aaa-000000000001'
psql -X -q -v ON_ERROR_STOP=1 <<SQL
insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
 max_cost_cents,authorized,unresolved_required_work)
values ('$session','$user','$project','STOP race synthetic',
 clock_timestamp()-interval '1 minute',clock_timestamp()+interval '10 minutes',
 1,1,true,1);
insert into public.arbor_research_units
(id,session_id,user_id,project_id,unit_key,kind)
values ('$unit','$session','$user','$project','stop-race-unit','synthetic');
SQL
token="$(psql -X -q -v ON_ERROR_STOP=1 -At -c "set request.jwt.claim.role='service_role'; select public.arbor_claim_research_unit('$session','$user','$project','race-worker')->>'leaseToken';")"
test -n "$token"
psql -X -q -v ON_ERROR_STOP=1 -At -c "set request.jwt.claim.role='service_role'; select public.arbor_settle_research_unit('$session','$user','$project','$unit','$token','stop-race-unit','completed',1,array['synthetic:stop-race'],0,'{}'::jsonb);" > "$workdir/settle" &
settler=$!
psql -X -q -v ON_ERROR_STOP=1 -At -c "set request.jwt.claim.role='service_role'; select public.arbor_stop_research_session('$session','$user','$project','cancelled','concurrent synthetic stop');" > "$workdir/stop" &
stopper=$!
wait "$settler"
wait "$stopper"
settlement="$(cat "$workdir/settle")"
stop="$(cat "$workdir/stop")"
case "$settlement:$stop" in
  committed:t|lease_lost:t) ;;
  *) echo "Unexpected STOP/settle order: $settlement:$stop"; exit 1 ;;
esac
receipts="$(psql -X -q -v ON_ERROR_STOP=1 -At -c "select count(*) from public.arbor_research_receipts where session_id='$session'")"
cost="$(psql -X -q -v ON_ERROR_STOP=1 -At -c "select committed_cost_cents from public.arbor_research_sessions where id='$session'")"
test "$receipts" = "$cost" || { echo 'Receipt and charge mismatch'; exit 1; }
if [ "$settlement" = committed ]; then
  test "$receipts" = 1
else
  test "$receipts" = 0
fi
test "$(psql -X -q -v ON_ERROR_STOP=1 -At -c "select status from public.arbor_research_sessions where id='$session'")" = cancelled
test "$(psql -X -q -v ON_ERROR_STOP=1 -At -c "set request.jwt.claim.role='service_role'; select coalesce(public.arbor_claim_research_unit('$session','$user','$project','late-worker')::text,'NULL');")" = NULL
echo "DISPOSABLE_DB_STOP_SETTLE_RACE=PASS ($settlement before/after STOP; receipts=$receipts)"
