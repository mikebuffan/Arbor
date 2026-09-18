-- Idempotency keys for side-effecting agency tool calls.
-- A repeated request/tool key can be recognized before performing the action.

create table if not exists public.arbor_agency_idempotency (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  idempotency_key text not null,
  operation text not null,
  result jsonb null,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id, idempotency_key)
);

alter table public.arbor_agency_idempotency enable row level security;

drop policy if exists arbor_agency_idempotency_owner_select
  on public.arbor_agency_idempotency;
create policy arbor_agency_idempotency_owner_select
  on public.arbor_agency_idempotency for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists arbor_agency_idempotency_owner_insert
  on public.arbor_agency_idempotency;
create policy arbor_agency_idempotency_owner_insert
  on public.arbor_agency_idempotency for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );
