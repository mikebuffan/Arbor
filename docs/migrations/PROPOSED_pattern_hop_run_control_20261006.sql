-- PROPOSAL ONLY. Do not apply without review.
-- Adds durable STOP and one-run-at-a-time coordination to the existing
-- Pattern Hop run table. No scheduler, provider call, corpus ingestion or
-- background worker is created by this proposal.

begin;

alter table public.arbor_pattern_hop_runs
  add column if not exists stop_requested_at timestamptz,
  add column if not exists run_lease_owner text,
  add column if not exists run_lease_token uuid,
  add column if not exists run_lease_expires_at timestamptz,
  add column if not exists control_version bigint not null default 0;

alter table public.arbor_pattern_hop_runs
  drop constraint if exists arbor_pattern_hop_run_lease_shape;
alter table public.arbor_pattern_hop_runs
  add constraint arbor_pattern_hop_run_lease_shape check (
    (run_lease_owner is null and run_lease_token is null and run_lease_expires_at is null)
    or
    (length(run_lease_owner) between 1 and 200
      and run_lease_token is not null
      and run_lease_expires_at is not null)
  );

create or replace function public.arbor_pattern_hop_control_guard()
returns trigger
language plpgsql
set search_path=''
as $guard$
begin
  if (
    new.stop_requested_at is distinct from old.stop_requested_at
    or new.run_lease_owner is distinct from old.run_lease_owner
    or new.run_lease_token is distinct from old.run_lease_token
    or new.run_lease_expires_at is distinct from old.run_lease_expires_at
    or new.control_version is distinct from old.control_version
  ) and coalesce(current_setting('arbor.pattern_hop_control_rpc', true),'') <> 'on'
  then
    raise exception 'pattern_hop_control_columns_require_rpc'
      using errcode='42501';
  end if;
  return new;
end;
$guard$;

drop trigger if exists arbor_pattern_hop_control_guard_trigger
  on public.arbor_pattern_hop_runs;
create trigger arbor_pattern_hop_control_guard_trigger
before update on public.arbor_pattern_hop_runs
for each row execute function public.arbor_pattern_hop_control_guard();

create or replace function public.arbor_pattern_hop_control_identity_ok(
  p_user_id uuid
) returns boolean
language sql
stable
security definer
set search_path=''
as $identity$
  select
    coalesce(current_setting('request.jwt.claim.role',true),'')='service_role'
    or (
      nullif(current_setting('request.jwt.claim.sub',true),'') is not null
      and nullif(current_setting('request.jwt.claim.sub',true),'')::uuid=p_user_id
    );
$identity$;

revoke all on function public.arbor_pattern_hop_control_identity_ok(uuid)
  from public, anon, authenticated;
grant execute on function public.arbor_pattern_hop_control_identity_ok(uuid)
  to service_role;

create or replace function public.arbor_pattern_hop_claim_run(
  p_run_id uuid,
  p_user_id uuid,
  p_project_id uuid,
  p_worker_id text,
  p_lease_ms integer
) returns jsonb
language plpgsql
security definer
set search_path=''
as $claim$
declare
  r public.arbor_pattern_hop_runs%rowtype;
  v_token uuid := gen_random_uuid();
  v_now timestamptz := clock_timestamp();
begin
  if p_worker_id is null or length(btrim(p_worker_id)) not between 1 and 200
    or p_lease_ms is null or p_lease_ms not between 5000 and 120000 then
    return jsonb_build_object('status','invalid');
  end if;
  if not (
    coalesce(current_setting('request.jwt.claim.role',true),'')='service_role'
    or (
      nullif(current_setting('request.jwt.claim.sub',true),'') is not null
      and nullif(current_setting('request.jwt.claim.sub',true),'')::uuid=p_user_id
    )
  ) then
    return jsonb_build_object('status','no_access');
  end if;

  select * into r from public.arbor_pattern_hop_runs
  where id=p_run_id and user_id=p_user_id and project_id=p_project_id
  for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if r.stop_requested_at is not null then
    return jsonb_build_object('status','stopped');
  end if;
  if r.run_lease_token is not null
    and r.run_lease_expires_at >= v_now then
    return jsonb_build_object('status','in_progress');
  end if;

  perform set_config('arbor.pattern_hop_control_rpc','on',true);
  update public.arbor_pattern_hop_runs set
    run_lease_owner=btrim(p_worker_id),
    run_lease_token=v_token,
    run_lease_expires_at=v_now + make_interval(secs => p_lease_ms / 1000.0),
    control_version=control_version+1
  where id=p_run_id;
  perform set_config('arbor.pattern_hop_control_rpc','',true);

  return jsonb_build_object(
    'status','claimed',
    'leaseToken',v_token,
    'leaseExpiresAt',v_now + make_interval(secs => p_lease_ms / 1000.0)
  );
end;
$claim$;

create or replace function public.arbor_pattern_hop_heartbeat_run(
  p_run_id uuid,
  p_user_id uuid,
  p_project_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_lease_ms integer
) returns jsonb
language plpgsql
security definer
set search_path=''
as $heartbeat$
declare
  r public.arbor_pattern_hop_runs%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if p_worker_id is null or length(btrim(p_worker_id)) not between 1 and 200
    or p_lease_token is null
    or p_lease_ms is null or p_lease_ms not between 5000 and 120000 then
    return jsonb_build_object('status','invalid');
  end if;
  if not (
    coalesce(current_setting('request.jwt.claim.role',true),'')='service_role'
    or (
      nullif(current_setting('request.jwt.claim.sub',true),'') is not null
      and nullif(current_setting('request.jwt.claim.sub',true),'')::uuid=p_user_id
    )
  ) then
    return jsonb_build_object('status','no_access');
  end if;

  select * into r from public.arbor_pattern_hop_runs
  where id=p_run_id and user_id=p_user_id and project_id=p_project_id
  for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if r.stop_requested_at is not null then
    return jsonb_build_object('status','stopped');
  end if;
  if r.run_lease_owner is distinct from btrim(p_worker_id)
    or r.run_lease_token is distinct from p_lease_token
    or r.run_lease_expires_at is null
    or r.run_lease_expires_at < v_now then
    return jsonb_build_object('status','stale');
  end if;

  perform set_config('arbor.pattern_hop_control_rpc','on',true);
  update public.arbor_pattern_hop_runs set
    run_lease_expires_at=v_now + make_interval(secs => p_lease_ms / 1000.0),
    control_version=control_version+1
  where id=p_run_id;
  perform set_config('arbor.pattern_hop_control_rpc','',true);

  return jsonb_build_object(
    'status','ok',
    'leaseExpiresAt',v_now + make_interval(secs => p_lease_ms / 1000.0)
  );
end;
$heartbeat$;

create or replace function public.arbor_pattern_hop_release_run(
  p_run_id uuid,
  p_user_id uuid,
  p_project_id uuid,
  p_worker_id text,
  p_lease_token uuid
) returns text
language plpgsql
security definer
set search_path=''
as $release$
declare
  r public.arbor_pattern_hop_runs%rowtype;
begin
  if not (
    coalesce(current_setting('request.jwt.claim.role',true),'')='service_role'
    or (
      nullif(current_setting('request.jwt.claim.sub',true),'') is not null
      and nullif(current_setting('request.jwt.claim.sub',true),'')::uuid=p_user_id
    )
  ) then return 'no_access'; end if;

  select * into r from public.arbor_pattern_hop_runs
  where id=p_run_id and user_id=p_user_id and project_id=p_project_id
  for update;
  if not found then return 'not_found'; end if;
  if r.run_lease_owner is distinct from btrim(p_worker_id)
    or r.run_lease_token is distinct from p_lease_token then
    return 'stale';
  end if;

  perform set_config('arbor.pattern_hop_control_rpc','on',true);
  update public.arbor_pattern_hop_runs set
    run_lease_owner=null,
    run_lease_token=null,
    run_lease_expires_at=null,
    control_version=control_version+1
  where id=p_run_id;
  perform set_config('arbor.pattern_hop_control_rpc','',true);
  return 'released';
end;
$release$;

create or replace function public.arbor_pattern_hop_request_stop(
  p_run_id uuid,
  p_user_id uuid,
  p_project_id uuid
) returns text
language plpgsql
security definer
set search_path=''
as $stop$
declare
  r public.arbor_pattern_hop_runs%rowtype;
begin
  if not (
    coalesce(current_setting('request.jwt.claim.role',true),'')='service_role'
    or (
      nullif(current_setting('request.jwt.claim.sub',true),'') is not null
      and nullif(current_setting('request.jwt.claim.sub',true),'')::uuid=p_user_id
    )
  ) then return 'no_access'; end if;
  select * into r from public.arbor_pattern_hop_runs
  where id=p_run_id and user_id=p_user_id and project_id=p_project_id
  for update;
  if not found then return 'not_found'; end if;
  if r.stop_requested_at is not null then return 'already_stopped'; end if;

  perform set_config('arbor.pattern_hop_control_rpc','on',true);
  update public.arbor_pattern_hop_runs set
    stop_requested_at=clock_timestamp(),
    control_version=control_version+1
  where id=p_run_id;
  perform set_config('arbor.pattern_hop_control_rpc','',true);
  return 'requested';
end;
$stop$;

create or replace function public.arbor_pattern_hop_resume_run(
  p_run_id uuid,
  p_user_id uuid,
  p_project_id uuid
) returns text
language plpgsql
security definer
set search_path=''
as $resume$
declare
  r public.arbor_pattern_hop_runs%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if not (
    coalesce(current_setting('request.jwt.claim.role',true),'')='service_role'
    or (
      nullif(current_setting('request.jwt.claim.sub',true),'') is not null
      and nullif(current_setting('request.jwt.claim.sub',true),'')::uuid=p_user_id
    )
  ) then return 'no_access'; end if;
  select * into r from public.arbor_pattern_hop_runs
  where id=p_run_id and user_id=p_user_id and project_id=p_project_id
  for update;
  if not found then return 'not_found'; end if;
  if r.run_lease_token is not null and r.run_lease_expires_at >= v_now then
    return 'in_progress';
  end if;
  if r.stop_requested_at is null then return 'not_stopped'; end if;

  perform set_config('arbor.pattern_hop_control_rpc','on',true);
  update public.arbor_pattern_hop_runs set
    stop_requested_at=null,
    run_lease_owner=null,
    run_lease_token=null,
    run_lease_expires_at=null,
    control_version=control_version+1
  where id=p_run_id;
  perform set_config('arbor.pattern_hop_control_rpc','',true);
  return 'resumed';
end;
$resume$;

revoke all on function public.arbor_pattern_hop_claim_run(uuid,uuid,uuid,text,integer)
  from public, anon;
revoke all on function public.arbor_pattern_hop_heartbeat_run(uuid,uuid,uuid,text,uuid,integer)
  from public, anon;
revoke all on function public.arbor_pattern_hop_release_run(uuid,uuid,uuid,text,uuid)
  from public, anon;
revoke all on function public.arbor_pattern_hop_request_stop(uuid,uuid,uuid)
  from public, anon;
revoke all on function public.arbor_pattern_hop_resume_run(uuid,uuid,uuid)
  from public, anon;

grant execute on function public.arbor_pattern_hop_claim_run(uuid,uuid,uuid,text,integer)
  to authenticated, service_role;
grant execute on function public.arbor_pattern_hop_heartbeat_run(uuid,uuid,uuid,text,uuid,integer)
  to authenticated, service_role;
grant execute on function public.arbor_pattern_hop_release_run(uuid,uuid,uuid,text,uuid)
  to authenticated, service_role;
grant execute on function public.arbor_pattern_hop_request_stop(uuid,uuid,uuid)
  to authenticated, service_role;
grant execute on function public.arbor_pattern_hop_resume_run(uuid,uuid,uuid)
  to authenticated, service_role;

comment on column public.arbor_pattern_hop_runs.stop_requested_at is
  'Durable cooperative STOP latch. Remains set until explicit resume.';
comment on column public.arbor_pattern_hop_runs.run_lease_token is
  'One-run-at-a-time traversal lease token. Not an ARK task lease.';
comment on function public.arbor_pattern_hop_request_stop(uuid,uuid,uuid) is
  'Durably requests Pattern Hop STOP. In-flight retrieval may finish, but a controlled runner must recheck before persisting advancement.';

commit;
