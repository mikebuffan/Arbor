grant select, insert, update, delete on public.arbor_pattern_hop_runs to authenticated;
grant select, insert, update, delete on public.arbor_pattern_hop_evidence to authenticated;
grant select, insert, update, delete on public.arbor_pattern_hop_edges to authenticated;

drop policy if exists pattern_hop_runs_select_own on public.arbor_pattern_hop_runs;
create policy pattern_hop_runs_select_own on public.arbor_pattern_hop_runs
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists pattern_hop_runs_insert_own on public.arbor_pattern_hop_runs;
create policy pattern_hop_runs_insert_own on public.arbor_pattern_hop_runs
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists pattern_hop_runs_update_own on public.arbor_pattern_hop_runs;
create policy pattern_hop_runs_update_own on public.arbor_pattern_hop_runs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists pattern_hop_runs_delete_own on public.arbor_pattern_hop_runs;
create policy pattern_hop_runs_delete_own on public.arbor_pattern_hop_runs
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists pattern_hop_evidence_select_own on public.arbor_pattern_hop_evidence;
create policy pattern_hop_evidence_select_own on public.arbor_pattern_hop_evidence
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists pattern_hop_evidence_insert_own on public.arbor_pattern_hop_evidence;
create policy pattern_hop_evidence_insert_own on public.arbor_pattern_hop_evidence
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists pattern_hop_evidence_update_own on public.arbor_pattern_hop_evidence;
create policy pattern_hop_evidence_update_own on public.arbor_pattern_hop_evidence
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists pattern_hop_evidence_delete_own on public.arbor_pattern_hop_evidence;
create policy pattern_hop_evidence_delete_own on public.arbor_pattern_hop_evidence
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists pattern_hop_edges_select_own on public.arbor_pattern_hop_edges;
create policy pattern_hop_edges_select_own on public.arbor_pattern_hop_edges
for select to authenticated using (
  exists (
    select 1 from public.arbor_pattern_hop_runs r
    where r.id = run_id and r.user_id = (select auth.uid())
  )
);

drop policy if exists pattern_hop_edges_insert_own on public.arbor_pattern_hop_edges;
create policy pattern_hop_edges_insert_own on public.arbor_pattern_hop_edges
for insert to authenticated with check (
  exists (
    select 1 from public.arbor_pattern_hop_runs r
    where r.id = run_id and r.user_id = (select auth.uid())
  )
);

drop policy if exists pattern_hop_edges_delete_own on public.arbor_pattern_hop_edges;
create policy pattern_hop_edges_delete_own on public.arbor_pattern_hop_edges
for delete to authenticated using (
  exists (
    select 1 from public.arbor_pattern_hop_runs r
    where r.id = run_id and r.user_id = (select auth.uid())
  )
);