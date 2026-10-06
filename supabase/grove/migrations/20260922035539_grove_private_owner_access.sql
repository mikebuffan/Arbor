-- The Grove: independent, explicitly invited owner-access gate.
-- Apply ONLY to the dedicated Grove Supabase project; do not place this in
-- the shared Firefly supabase/migrations directory.
--
-- This migration provisions NO owner, creates NO auth user, and does NOT make
-- a Supabase JWT alone sufficient to call the Grove API. Backend validation
-- must check issuer, signature, expiry, audience and this grant.
begin;

create table if not exists public.grove_private_owner_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  invited_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.grove_private_owner_access is
  'Grove-only private access grants; no automatic signup or default entitlement. Admin provisioned only.';

alter table public.grove_private_owner_access enable row level security;
alter table public.grove_private_owner_access force row level security;

-- A signed-in user may see only their own unrevoked grant. They cannot mint,
-- revive, transfer or delete an entitlement through the client API.
revoke all on table public.grove_private_owner_access
  from public, anon, authenticated;

grant select on table public.grove_private_owner_access to authenticated;

-- Privileged, server-held credentials are required for provisioning and
-- revocation; never embed them in Flutter, the public app, or public GitHub.
grant select, insert, update, delete on table
  public.grove_private_owner_access to service_role;

drop policy if exists grove_private_owner_read_self
  on public.grove_private_owner_access;

create policy grove_private_owner_read_self
  on public.grove_private_owner_access
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and revoked_at is null
  );

commit;
