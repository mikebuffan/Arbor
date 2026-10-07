-- SOURCE-ONLY PROPOSAL. DO NOT APPLY WITHOUT REVIEW.
-- Extends the existing public.arbor_capability_registry rather than creating
-- a second capability map.
--
-- Operational availability remains in current_state.
-- Epistemic/development maturity is tracked separately in lifecycle_state and
-- evidence_level so "available" never silently means "proven".

alter table public.arbor_capability_registry
  add column if not exists lifecycle_state text not null default 'source_proven',
  add column if not exists evidence_level text not null default 'source',
  add column if not exists hypothesis jsonb not null default '{}'::jsonb,
  add column if not exists dependencies jsonb not null default '[]'::jsonb,
  add column if not exists overlaps jsonb not null default '[]'::jsonb,
  add column if not exists primitives jsonb not null default '[]'::jsonb,
  add column if not exists supporting_evidence jsonb not null default '[]'::jsonb,
  add column if not exists counter_evidence jsonb not null default '[]'::jsonb,
  add column if not exists unknowns jsonb not null default '[]'::jsonb,
  add column if not exists next_experiment text,
  add column if not exists falsifier text,
  add column if not exists risks jsonb not null default '[]'::jsonb,
  add column if not exists not_now boolean not null default false,
  add column if not exists superseded_by text;

alter table public.arbor_capability_registry
  drop constraint if exists arbor_capability_registry_lifecycle_state_check;

alter table public.arbor_capability_registry
  add constraint arbor_capability_registry_lifecycle_state_check
  check (lifecycle_state = any (array[
    'idea'::text,
    'hypothesis'::text,
    'design'::text,
    'experiment'::text,
    'source_proven'::text,
    'bench_proven'::text,
    'live_proven'::text,
    'core_arbor'::text,
    'rejected'::text,
    'superseded'::text
  ]));

alter table public.arbor_capability_registry
  drop constraint if exists arbor_capability_registry_evidence_level_check;

alter table public.arbor_capability_registry
  add constraint arbor_capability_registry_evidence_level_check
  check (evidence_level = any (array[
    'none'::text,
    'concept'::text,
    'source'::text,
    'tests'::text,
    'bench'::text,
    'live'::text,
    'repeated_live'::text,
    'model_independent'::text
  ]));

-- IMPORTANT:
-- Existing rows are operational capabilities. Before this proposal is ever
-- applied, each existing row must be individually reviewed rather than blindly
-- inheriting source_proven/source.
--
-- Future hypothesis records should use current_state='experimental' or
-- 'unavailable' as appropriate while lifecycle/evidence state remains explicit.
