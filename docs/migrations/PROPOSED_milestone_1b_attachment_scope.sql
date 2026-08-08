-- PROPOSAL ONLY. DO NOT APPLY WITHOUT THE SEPARATE DATABASE APPROVAL GATE.
-- Firefly project reference at review time: ncpdlyakrzfvobmwzbon
-- Catalog snapshot reviewed: 2026-08-08

begin;

-- The current permissive policies are OR-combined. The user-prefix-only
-- policies therefore bypass the newer project/conversation-aware policies.
drop policy if exists "chat attachments delete own metadata" on public.chat_attachments;
drop policy if exists "chat attachments insert own metadata" on public.chat_attachments;
drop policy if exists "chat attachments select own metadata" on public.chat_attachments;
drop policy if exists "chat attachments update own metadata" on public.chat_attachments;

create policy "chat attachments select scoped metadata"
on public.chat_attachments
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and deleted_at is null
  and storage_bucket = 'chat-attachments'
  and storage_path like (
    (select auth.uid())::text || '/' || project_id::text || '/' ||
    conversation_id::text || '/' || id::text || '/%'
  )
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
      and c.project_id = project_id
  )
  and (
    message_id is null
    or exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.user_id = (select auth.uid())
        and m.project_id = project_id
        and m.conversation_id = conversation_id
    )
  )
);

create policy "chat attachments insert scoped metadata"
on public.chat_attachments
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and storage_bucket = 'chat-attachments'
  and storage_path like (
    (select auth.uid())::text || '/' || project_id::text || '/' ||
    conversation_id::text || '/' || id::text || '/%'
  )
  and status = 'uploading'
  and deleted_at is null
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
      and c.project_id = project_id
  )
  and (
    message_id is null
    or exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.user_id = (select auth.uid())
        and m.project_id = project_id
        and m.conversation_id = conversation_id
    )
  )
);

create policy "chat attachments update scoped metadata"
on public.chat_attachments
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and deleted_at is null
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
      and c.project_id = project_id
  )
)
with check (
  (select auth.uid()) = user_id
  and storage_bucket = 'chat-attachments'
  and storage_path like (
    (select auth.uid())::text || '/' || project_id::text || '/' ||
    conversation_id::text || '/' || id::text || '/%'
  )
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
      and c.project_id = project_id
  )
  and (
    message_id is null
    or exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.user_id = (select auth.uid())
        and m.project_id = project_id
        and m.conversation_id = conversation_id
    )
  )
);

create policy "chat attachments delete scoped metadata"
on public.chat_attachments
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
      and c.project_id = project_id
  )
);

drop policy if exists "chat attachments delete approved own objects" on storage.objects;
drop policy if exists "chat attachments delete own files" on storage.objects;
drop policy if exists "chat attachments insert approved own objects" on storage.objects;
drop policy if exists "chat attachments insert own files" on storage.objects;
drop policy if exists "chat attachments select approved own objects" on storage.objects;
drop policy if exists "chat attachments select own files" on storage.objects;
drop policy if exists "chat attachments update approved own objects" on storage.objects;
drop policy if exists "chat attachments update own files" on storage.objects;

-- Direct authenticated reads, updates, and deletes are deliberately absent.
-- A server route must validate explicit project/conversation context with
-- lib/attachments/scope.ts before minting a signed read URL or deleting.
create policy "chat attachments insert scoped upload objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.chat_attachments a
    join public.projects p on p.id = a.project_id
    join public.conversations c on c.id = a.conversation_id
    where a.storage_bucket = bucket_id
      and a.storage_path = name
      and a.user_id = (select auth.uid())
      and a.status = 'uploading'
      and a.deleted_at is null
      and a.upload_intent_expires_at > now()
      and p.user_id = (select auth.uid())
      and c.user_id = (select auth.uid())
      and c.project_id = a.project_id
      and name like (
        (select auth.uid())::text || '/' || a.project_id::text || '/' ||
        a.conversation_id::text || '/' || a.id::text || '/%'
      )
  )
);

commit;
