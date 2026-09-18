-- Completing an idempotent operation updates only its stored result.
-- Without an UPDATE policy, authenticated runtime clients can claim a key
-- but cannot persist the completed result under RLS.

drop policy if exists arbor_agency_idempotency_owner_update
  on public.arbor_agency_idempotency;

create policy arbor_agency_idempotency_owner_update
  on public.arbor_agency_idempotency for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );
