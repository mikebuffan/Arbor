-- EXACT PRE-APPLY ROLLBACK PACKAGE. DO NOT APPLY WITHOUT APPROVAL.
-- Firefly project reference: ncpdlyakrzfvobmwzbon
-- Fresh catalog capture independently reviewed: 2026-08-12
--
-- Captured invariants:
--   owner postgres; RLS enabled; FORCE RLS false;
--   no PUBLIC table ACL; no explicit column ACLs;
--   anon/authenticated/service_role each hold the PostgreSQL 17 table ACL
--   DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE;
--   all captured attachment policies are permissive;
--   chat-attachments bucket configuration is unchanged by forward or rollback.

begin;

drop policy if exists "chat attachments delete scoped metadata" on public.chat_attachments;
drop policy if exists "chat attachments insert scoped metadata" on public.chat_attachments;
drop policy if exists "chat attachments select scoped metadata" on public.chat_attachments;
drop policy if exists "chat attachments update scoped metadata" on public.chat_attachments;

drop policy if exists "chat attachments delete own metadata" on public.chat_attachments;
drop policy if exists "chat attachments insert own metadata" on public.chat_attachments;
drop policy if exists "chat attachments select own metadata" on public.chat_attachments;
drop policy if exists "chat attachments update own metadata" on public.chat_attachments;

drop policy if exists "chat attachments delete approved own objects" on storage.objects;
drop policy if exists "chat attachments delete own files" on storage.objects;
drop policy if exists "chat attachments insert approved own objects" on storage.objects;
drop policy if exists "chat attachments insert own files" on storage.objects;
drop policy if exists "chat attachments select approved own objects" on storage.objects;
drop policy if exists "chat attachments select own files" on storage.objects;
drop policy if exists "chat attachments update approved own objects" on storage.objects;
drop policy if exists "chat attachments update own files" on storage.objects;
drop policy if exists "chat attachments insert scoped upload objects" on storage.objects;

alter table public.chat_attachments owner to postgres;
alter table public.chat_attachments enable row level security;
alter table public.chat_attachments no force row level security;

revoke all privileges on table public.chat_attachments from public;
revoke all privileges on table public.chat_attachments from anon;
revoke all privileges on table public.chat_attachments from authenticated;
revoke all privileges on table public.chat_attachments from service_role;

grant delete, insert, maintain, references, select, trigger, truncate, update
on table public.chat_attachments to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update
on table public.chat_attachments to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update
on table public.chat_attachments to service_role;

create policy "chat attachments delete own metadata"
on public.chat_attachments
as permissive
for delete
to authenticated
using (auth.uid() = user_id);

create policy "chat attachments insert own metadata"
on public.chat_attachments
as permissive
for insert
to authenticated
with check (
  auth.uid() = user_id
  and storage_path like auth.uid()::text || '/%'
);

create policy "chat attachments select own metadata"
on public.chat_attachments
as permissive
for select
to authenticated
using (
  auth.uid() = user_id
  and deleted_at is null
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = auth.uid()
  )
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.user_id = auth.uid()
      and c.project_id = project_id
  )
);

create policy "chat attachments update own metadata"
on public.chat_attachments
as permissive
for update
to authenticated
using (auth.uid() = user_id and deleted_at is null)
with check (
  auth.uid() = user_id
  and storage_bucket = 'chat-attachments'
  and storage_path like auth.uid()::text || '/%'
);

create policy "chat attachments delete approved own objects"
on storage.objects
as permissive
for delete
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.chat_attachments a
    where a.storage_bucket = bucket_id
      and a.storage_path = name
      and a.user_id = auth.uid()
      and a.deleted_at is null
  )
);

create policy "chat attachments delete own files"
on storage.objects
as permissive
for delete
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat attachments insert approved own objects"
on storage.objects
as permissive
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.chat_attachments a
    where a.storage_bucket = bucket_id
      and a.storage_path = name
      and a.user_id = auth.uid()
      and a.status = 'pending'
      and a.deleted_at is null
      and a.upload_intent_expires_at > now()
      and exists (
        select 1 from public.projects p
        where p.id = a.project_id and p.user_id = auth.uid()
      )
      and exists (
        select 1 from public.conversations c
        where c.id = a.conversation_id
          and c.user_id = auth.uid()
          and c.project_id = a.project_id
      )
  )
);

create policy "chat attachments insert own files"
on storage.objects
as permissive
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat attachments select approved own objects"
on storage.objects
as permissive
for select
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.chat_attachments a
    where a.storage_bucket = bucket_id
      and a.storage_path = name
      and a.user_id = auth.uid()
      and a.status in ('pending', 'uploaded')
      and a.deleted_at is null
      and exists (
        select 1 from public.projects p
        where p.id = a.project_id and p.user_id = auth.uid()
      )
      and exists (
        select 1 from public.conversations c
        where c.id = a.conversation_id
          and c.user_id = auth.uid()
          and c.project_id = a.project_id
      )
  )
);

create policy "chat attachments select own files"
on storage.objects
as permissive
for select
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat attachments update approved own objects"
on storage.objects
as permissive
for update
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.chat_attachments a
    where a.storage_bucket = bucket_id
      and a.storage_path = name
      and a.user_id = auth.uid()
      and a.status in ('pending', 'uploaded')
      and a.deleted_at is null
  )
)
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat attachments update own files"
on storage.objects
as permissive
for update
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
