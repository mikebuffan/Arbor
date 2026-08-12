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
drop policy if exists "chat attachments delete scoped metadata" on public.chat_attachments;
drop policy if exists "chat attachments insert scoped metadata" on public.chat_attachments;
drop policy if exists "chat attachments select scoped metadata" on public.chat_attachments;
drop policy if exists "chat attachments update scoped metadata" on public.chat_attachments;

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

drop policy if exists "chat attachments delete approved own objects" on storage.objects;
drop policy if exists "chat attachments delete own files" on storage.objects;
drop policy if exists "chat attachments insert approved own objects" on storage.objects;
drop policy if exists "chat attachments insert own files" on storage.objects;
drop policy if exists "chat attachments select approved own objects" on storage.objects;
drop policy if exists "chat attachments select own files" on storage.objects;
drop policy if exists "chat attachments update approved own objects" on storage.objects;
drop policy if exists "chat attachments update own files" on storage.objects;
drop policy if exists "chat attachments insert scoped upload objects" on storage.objects;

-- Attachment upload is deferred. No authenticated metadata INSERT, UPDATE, or
-- DELETE policy and no authenticated Storage INSERT, SELECT, UPDATE, or DELETE
-- policy is created for chat-attachments. The only direct authenticated access
-- retained is scoped metadata SELECT for broker authorization. Brokered signed
-- reads and deletes use a server-only privileged client after that validation.

commit;
