-- PROPOSAL ONLY — DO NOT MOVE UNDER supabase/migrations/ OR APPLY TO A LIVE
-- DATABASE without an owner-approved release review and isolated PG smoke test.
-- Project-level learning is shared by authenticated conversations within ONE
-- owner/project; active conversation goals and file access remain ARK-owned.
-- Requires the existing main-branch `public.projects(id,user_id)` unique index
-- established by 20260918030000_arbor_autonomous_work_runner.sql.

begin;

create table if not exists public.arbor_cognitive_project_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  revision integer not null default 0 check (revision >= 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id),
  constraint arbor_cognitive_state_project_owner_fk
    foreign key (project_id, user_id)
    references public.projects (id, user_id) on delete cascade
);

alter table public.arbor_cognitive_project_state enable row level security;

create policy arbor_cognitive_select_owner
  on public.arbor_cognitive_project_state for select to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  ));
create policy arbor_cognitive_insert_owner
  on public.arbor_cognitive_project_state for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  ));
create policy arbor_cognitive_update_owner
  on public.arbor_cognitive_project_state for update to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  ))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  ));

revoke all on public.arbor_cognitive_project_state from public, anon;
grant select, insert, update on public.arbor_cognitive_project_state to authenticated;

-- Atomic snapshot CAS: weights, pathway receipts, and version change together.
-- RLS and the explicit auth.uid() check both apply; never use service_role.
create or replace function public.arbor_cas_cognitive_project_state(
  p_user_id uuid,
  p_project_id uuid,
  p_expected_revision integer,
  p_next_snapshot jsonb
) returns boolean
language plpgsql security invoker set search_path = public
as $func$
declare
  affected integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'cognitive_snapshot_not_authorized';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or
     p_expected_revision >= 2147483647 or
     p_next_snapshot is null or
     jsonb_typeof(p_next_snapshot) <> 'object' or
     p_next_snapshot->>'schemaVersion' is distinct from '1' or
     p_next_snapshot->'scope'->>'userId' is distinct from p_user_id::text or
     p_next_snapshot->'scope'->>'projectId' is distinct from p_project_id::text or
     p_next_snapshot->>'revision' is distinct from
        (p_expected_revision + 1)::text or
     jsonb_typeof(p_next_snapshot->'learning') is distinct from 'object' or
     jsonb_typeof(p_next_snapshot->'pathways') is distinct from 'array' or
     jsonb_typeof(p_next_snapshot->'ledger') is distinct from 'object'
  then
    raise exception 'cognitive_snapshot_invalid_revision_or_scope';
  end if;

  update public.arbor_cognitive_project_state
     set revision = p_expected_revision + 1,
         snapshot = p_next_snapshot,
         updated_at = now()
   where user_id = p_user_id
     and project_id = p_project_id
     and revision = p_expected_revision;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$func$;

revoke all on function public.arbor_cas_cognitive_project_state(
  uuid, uuid, integer, jsonb
) from public, anon;
grant execute on function public.arbor_cas_cognitive_project_state(
  uuid, uuid, integer, jsonb
) to authenticated;

commit;