-- Restore Arbor's pattern-memory layer on the canonical memory_items table.

alter table public.memory_items
  add column if not exists memory_kind text not null default 'fact',
  add column if not exists recurrence_count integer not null default 1,
  add column if not exists salience numeric not null default 0.5,
  add column if not exists promotion_score numeric not null default 0,
  add column if not exists promoted_at timestamptz;

alter table public.memory_items
  drop constraint if exists memory_items_memory_kind_check;

alter table public.memory_items
  add constraint memory_items_memory_kind_check
  check (
    memory_kind = any (
      array[
        'fact'::text,
        'preference'::text,
        'anchor'::text,
        'project_fact'::text,
        'relationship'::text,
        'obligation'::text,
        'stressor'::text,
        'state'::text,
        'correction'::text,
        'pattern_candidate'::text,
        'pattern'::text
      ]
    )
  );

create index if not exists memory_items_pattern_candidates_idx
  on public.memory_items(user_id, project_id, memory_kind, status, recurrence_count desc)
  where deleted_at is null
    and memory_kind in ('pattern_candidate', 'pattern');
