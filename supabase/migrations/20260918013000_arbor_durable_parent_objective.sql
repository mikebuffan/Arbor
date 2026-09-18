-- Durable parent objective for production Arbor agency.
-- Backward compatible: existing runtime rows remain valid and hydrate without it.

alter table public.arbor_runtime_state
  add column if not exists agency_objective jsonb null;

comment on column public.arbor_runtime_state.agency_objective is
  'Durable parent objective carrier: completion criteria, standing authorization, hard stops, next action, checkpoint, lifecycle status, revision.';

alter table public.arbor_runtime_state
  drop constraint if exists arbor_runtime_state_agency_objective_object_check;

alter table public.arbor_runtime_state
  add constraint arbor_runtime_state_agency_objective_object_check
  check (
    agency_objective is null
    or jsonb_typeof(agency_objective) = 'object'
  );


-- The generic agency engine also persists resumable execution ceilings.
alter table public.arbor_runtime_state
  drop constraint if exists arbor_runtime_state_agency_status_check;

alter table public.arbor_runtime_state
  add constraint arbor_runtime_state_agency_status_check
  check (
    agency_status is null
    or agency_status in ('active', 'complete', 'blocked', 'checkpointed')
  );
