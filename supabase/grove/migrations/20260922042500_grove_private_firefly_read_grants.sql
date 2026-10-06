-- Apply ONLY to the dedicated private Grove Supabase project.
-- No row is seeded. Separate, revocable permissions are necessary before
-- the Grove may read ARK records belonging to an independently hosted Firefly
-- user. Never copy the Firefly auth JWT or trust a client-supplied owner UUID.
begin;

create table if not exists public.grove_private_firefly_bridge (
  grove_user_id uuid primary key
    references public.grove_private_owner_access(user_id) on delete cascade,
  firefly_user_id uuid not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.grove_private_ark_project_grants (
  grove_user_id uuid not null
    references public.grove_private_firefly_bridge(grove_user_id) on delete cascade,
  firefly_project_id uuid not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (grove_user_id, firefly_project_id)
);

comment on table public.grove_private_firefly_bridge is
  'Admin-confirmed, revocable cross-provider owner mapping; never accepts client writes.';
comment on table public.grove_private_ark_project_grants is
  'Admin-approved individual Firefly projects readable by this private Grove owner.';

alter table public.grove_private_firefly_bridge enable row level security;
alter table public.grove_private_firefly_bridge force row level security;
alter table public.grove_private_ark_project_grants enable row level security;
alter table public.grove_private_ark_project_grants force row level security;

-- No authenticated or anonymous policies: the frontend cannot inspect,
-- mutate, guess or enumerate cross-provider mappings. The isolated server
-- resolves these only with its protected Grove service credential after
-- validating the Grove JWT and owner access table with the user-scoped token.
revoke all on table public.grove_private_firefly_bridge
  from public, anon, authenticated;
revoke all on table public.grove_private_ark_project_grants
  from public, anon, authenticated;
grant select, insert, update, delete on table
  public.grove_private_firefly_bridge to service_role;
grant select, insert, update, delete on table
  public.grove_private_ark_project_grants to service_role;
commit;
