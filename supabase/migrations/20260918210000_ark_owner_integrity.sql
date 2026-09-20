-- Tighten ARK ownership and causal-link integrity at the database layer.
-- Service-role code must not be able to accidentally pair a user's objective
-- with another user's project/task simply because RLS is bypassed.

create unique index if not exists projects_id_user_id_ark_owner_idx
  on public.projects (id, user_id);

-- Work jobs use a privileged worker; enforce the user/project pair even when
-- service_role bypasses row-level security.
alter table public.arbor_work_jobs
  add constraint arbor_work_jobs_project_owner_fk
  foreign key (project_id, user_id)
  references public.projects (id, user_id)
  on delete cascade;

create unique index if not exists ark_objectives_id_owner_idx
  on public.ark_objectives (id, user_id, project_id);

create unique index if not exists ark_tasks_id_objective_idx
  on public.ark_tasks (id, objective_id);

alter table public.ark_objectives
  add constraint ark_objectives_project_owner_fk
  foreign key (project_id, user_id)
  references public.projects (id, user_id)
  on delete cascade;

alter table public.ark_tasks
  add constraint ark_tasks_objective_owner_fk
  foreign key (objective_id, user_id, project_id)
  references public.ark_objectives (id, user_id, project_id)
  on delete cascade;

alter table public.ark_checkpoints
  add constraint ark_checkpoints_task_objective_fk
  foreign key (task_id, objective_id)
  references public.ark_tasks (id, objective_id)
  on delete cascade;

alter table public.ark_events
  add constraint ark_events_task_objective_fk
  foreign key (task_id, objective_id)
  references public.ark_tasks (id, objective_id)
  on delete cascade;
