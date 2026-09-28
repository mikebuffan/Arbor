\set ON_ERROR_STOP on
-- Ephemeral PostgreSQL CI ONLY. Synthetic users/projects, never existing Supabase.
-- Idempotent so ARK + research acceptance suites can share one disposable DB.
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public,auth to anon,authenticated,service_role;

create or replace function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
 select nullif(current_setting('request.jwt.claim.role',true),'')
$$;

create table if not exists auth.users(id uuid primary key);
create table if not exists public.projects(
 id uuid not null, user_id uuid not null references auth.users(id),
 primary key(id,user_id)
);

insert into auth.users values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222')
on conflict (id) do nothing;

insert into public.projects values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222')
on conflict (id,user_id) do nothing;
