-- Harden Annabelle editorial preview after database advisor review.
create index if not exists annabelle_manuscripts_project_idx on public.annabelle_manuscripts(project_id);
create index if not exists annabelle_chapters_user_idx on public.annabelle_chapters(user_id);
create index if not exists annabelle_chapters_project_idx on public.annabelle_chapters(project_id);
create index if not exists annabelle_records_chapter_idx on public.annabelle_editorial_records(chapter_id);
create index if not exists annabelle_records_manuscript_idx on public.annabelle_editorial_records(manuscript_id);
create index if not exists annabelle_records_project_idx on public.annabelle_editorial_records(project_id);
create index if not exists annabelle_records_supersedes_idx on public.annabelle_editorial_records(supersedes_id);
create index if not exists annabelle_checkpoints_manuscript_idx on public.annabelle_editorial_checkpoints(manuscript_id);
create index if not exists annabelle_checkpoints_project_idx on public.annabelle_editorial_checkpoints(project_id);
create index if not exists annabelle_events_chapter_idx on public.annabelle_editorial_events(chapter_id);
create index if not exists annabelle_events_manuscript_idx on public.annabelle_editorial_events(manuscript_id);
create index if not exists annabelle_events_project_idx on public.annabelle_editorial_events(project_id);

do $$ declare t text; op text; begin
  foreach t in array array[
    'annabelle_manuscripts','annabelle_chapters','annabelle_editorial_records',
    'annabelle_editorial_checkpoints','annabelle_editorial_events'
  ] loop
    foreach op in array array['select','insert','update'] loop
      execute format('drop policy if exists %I on public.%I', t || '_' || op || '_own', t);
    end loop;
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()))) with check ((select auth.uid()) = user_id and exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))', t || '_update_own', t);
  end loop;
end $$;