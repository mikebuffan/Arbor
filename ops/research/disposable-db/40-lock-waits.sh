#!/usr/bin/env bash
# Synthetic-only lock-wait regression: sample time AFTER acquiring session lock.
set -euo pipefail
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
user='11111111-1111-4111-8111-111111111111'
project='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
session='55555555-5555-4555-8555-555555555555'
unit='66666666-6666-4666-8666-666666666666'
psql -X -q -v ON_ERROR_STOP=1 <<SQL
insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
 max_cost_cents,authorized,unresolved_required_work)
values ('$session','$user','$project','lock deadline synthetic',
 clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 second',
 1,1,true,1);
insert into public.arbor_research_units
(id,session_id,user_id,project_id,unit_key,kind)
values ('$unit','$session','$user','$project','lock-deadline-unit','synthetic');
SQL
# The transaction holds the session row lock until after the deadline.
psql -X -q -v ON_ERROR_STOP=1 -c "begin; update public.arbor_research_sessions set updated_at=clock_timestamp() where id='$session'; select pg_sleep(2); commit;" > "$workdir/holder" &
holder=$!
sleep 0.4
psql -X -q -v ON_ERROR_STOP=1 -At -c "set request.jwt.claim.role='service_role'; select coalesce(public.arbor_claim_research_unit('$session','$user','$project','deadline-worker')::text,'NULL');" > "$workdir/claim"
wait "$holder"
grep -qx NULL "$workdir/claim" || { echo 'Claim crossed deadline during row lock wait'; cat "$workdir/claim"; exit 1; }
test "$(psql -X -q -v ON_ERROR_STOP=1 -At -c "select status from public.arbor_research_sessions where id='$session'")" = timebox_ended
test "$(psql -X -q -v ON_ERROR_STOP=1 -At -c "select count(*) from public.arbor_research_receipts where session_id='$session'")" = 0

# Settlement must also re-sample the clock after a blocked session row lock.
session='77777777-7777-4777-8777-777777777777'
unit='88888888-8888-4888-8888-888888888888'
psql -X -q -v ON_ERROR_STOP=1 <<SQL
insert into public.arbor_research_sessions
(id,user_id,project_id,objective,started_at,deadline_at,max_work_units,
 max_cost_cents,authorized,unresolved_required_work)
values ('$session','$user','$project','lock settlement synthetic',
 clock_timestamp()-interval '1 minute',clock_timestamp()+interval '10 minutes',
 1,1,true,1);
insert into public.arbor_research_units
(id,session_id,user_id,project_id,unit_key,kind)
values ('$unit','$session','$user','$project','lock-settle-unit','synthetic');
SQL
token="$(psql -X -q -v ON_ERROR_STOP=1 -At -c "set request.jwt.claim.role='service_role'; select public.arbor_claim_research_unit('$session','$user','$project','lease-worker')->>'leaseToken';")"
test -n "$token"
psql -X -q -v ON_ERROR_STOP=1 -c "update public.arbor_research_units set lease_expires_at=clock_timestamp()+interval '1 second' where id='$unit';" > "$workdir/expiry"
psql -X -q -v ON_ERROR_STOP=1 -c "begin; update public.arbor_research_sessions set updated_at=clock_timestamp() where id='$session'; select pg_sleep(2); commit;" > "$workdir/holder2" &
holder=$!
sleep 0.4
psql -X -q -v ON_ERROR_STOP=1 -At -c "set request.jwt.claim.role='service_role'; select public.arbor_settle_research_unit('$session','$user','$project','$unit','$token','lock-settle-unit','completed',1,array['synthetic:late'],0,'{}'::jsonb);" > "$workdir/settle"
wait "$holder"
grep -qx lease_lost "$workdir/settle" || { echo 'Settlement crossed lease expiry during row lock wait'; cat "$workdir/settle"; exit 1; }
test "$(psql -X -q -v ON_ERROR_STOP=1 -At -c "select count(*) from public.arbor_research_receipts where session_id='$session'")" = 0
test "$(psql -X -q -v ON_ERROR_STOP=1 -At -c "select committed_cost_cents from public.arbor_research_sessions where id='$session'")" = 0
echo 'DISPOSABLE_DB_LOCK_WAIT_CLOCK=PASS (deadline claim, expired lease settlement)'
