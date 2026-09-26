-- Disposable PostgreSQL only. Never apply to Firefly, Grove or ARK Preview.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table auth.users(id uuid primary key);
create table public.projects (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade
);
grant usage on schema public, auth to anon, authenticated, service_role;
grant select on public.projects to service_role;
create table public.ark_disposable_recovery_clock (
 singleton boolean primary key default true check (singleton),
 t0 timestamptz not null
);
insert into public.ark_disposable_recovery_clock(singleton,t0) values(true, clock_timestamp());
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111');
insert into public.projects(id,user_id) values (
 '22222222-2222-4222-8222-222222222222',
 '11111111-1111-4111-8111-111111111111'
);
