-- Recover durable automatic memories that were historically stored with
-- conversation scope before strict conversation isolation was introduced.
--
-- Only non-sensitive, non-trigger-gated rows with strong durability evidence
-- are promoted. Promotion is to PROJECT scope, never global, so continuity
-- survives Firefly thread changes without crossing project boundaries.

create table if not exists public.ar_memory_scope_recovery_log (
  memory_id uuid primary key references public.memory_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  previous_scope text not null,
  previous_conversation_id uuid null,
  recovered_scope text not null,
  reason text not null,
  recovered_at timestamptz not null default now()
);

alter table public.ar_memory_scope_recovery_log enable row level security;

drop policy if exists "memory_scope_recovery_select_own"
  on public.ar_memory_scope_recovery_log;

create policy "memory_scope_recovery_select_own"
on public.ar_memory_scope_recovery_log
for select
using (auth.uid() = user_id);

insert into public.ar_memory_scope_recovery_log (
  memory_id,
  user_id,
  project_id,
  previous_scope,
  previous_conversation_id,
  recovered_scope,
  reason
)
select
  mi.id,
  mi.user_id,
  mi.project_id,
  mi.scope,
  mi.conversation_id,
  'project',
  'legacy_durable_conversation_scope_recovery_20260914'
from public.memory_items mi
where mi.project_id = 'cbb07f83-599f-4df8-a05b-8fc4d82d8d8c'::uuid
  and mi.deleted_at is null
  and mi.status = 'active'
  and mi.scope = 'conversation'
  and mi.tier <> 'sensitive'
  and coalesce(mi.user_trigger_only, false) = false
  and (
    coalesce(mi.mention_count, 0) >= 3
    or mi.pinned = true
    or mi.locked = true
    or (
      mi.importance >= 9
      and mi.confidence >= 0.9
    )
  )
on conflict (memory_id) do nothing;

update public.memory_items mi
set
  scope = 'project',
  conversation_id = null,
  updated_at = now()
from public.ar_memory_scope_recovery_log recovery
where recovery.memory_id = mi.id
  and recovery.reason =
    'legacy_durable_conversation_scope_recovery_20260914'
  and mi.scope = 'conversation';
