begin;

drop policy if exists "chat attachments select scoped metadata"
on public.chat_attachments;

create policy "chat attachments select scoped metadata"
on public.chat_attachments
for select
to authenticated
using (
  (select auth.uid()) = chat_attachments.user_id
  and chat_attachments.deleted_at is null
  and chat_attachments.storage_bucket = 'chat-attachments'
  and chat_attachments.storage_path like (
    (select auth.uid())::text || '/' || chat_attachments.project_id::text || '/' ||
    chat_attachments.conversation_id::text || '/' || chat_attachments.id::text || '/%'
  )
  and exists (
    select 1 from public.projects p
    where p.id = chat_attachments.project_id
      and p.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.conversations c
    where c.id = chat_attachments.conversation_id
      and c.user_id = (select auth.uid())
      and c.project_id = chat_attachments.project_id
  )
  and (
    chat_attachments.message_id is null
    or exists (
      select 1 from public.messages m
      where m.id = chat_attachments.message_id
        and m.user_id = (select auth.uid())
        and m.project_id = chat_attachments.project_id
        and m.conversation_id = chat_attachments.conversation_id
    )
  )
);

commit;
