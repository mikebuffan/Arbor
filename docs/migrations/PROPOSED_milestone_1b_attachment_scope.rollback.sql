-- ROLLBACK FOR THE 2026-08-08 CATALOG SNAPSHOT ONLY.
-- Review policy drift before use. DO NOT APPLY WITHOUT APPROVAL.

begin;

drop policy if exists "chat attachments delete scoped metadata" on public.chat_attachments;
drop policy if exists "chat attachments insert scoped metadata" on public.chat_attachments;
drop policy if exists "chat attachments select scoped metadata" on public.chat_attachments;
drop policy if exists "chat attachments update scoped metadata" on public.chat_attachments;
drop policy if exists "chat attachments insert scoped upload objects" on storage.objects;

create policy "chat attachments delete own metadata"
on public.chat_attachments for delete to authenticated
using (auth.uid() = user_id);

create policy "chat attachments insert own metadata"
on public.chat_attachments for insert to authenticated
with check (
  auth.uid() = user_id
  and storage_path like auth.uid()::text || '/%'
);

create policy "chat attachments select own metadata"
on public.chat_attachments for select to authenticated
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
on public.chat_attachments for update to authenticated
using (auth.uid() = user_id and deleted_at is null)
with check (
  auth.uid() = user_id
  and storage_bucket = 'chat-attachments'
  and storage_path like auth.uid()::text || '/%'
);

create policy "chat attachments delete approved own objects"
on storage.objects for delete to authenticated
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
on storage.objects for delete to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat attachments insert approved own objects"
on storage.objects for insert to authenticated
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
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat attachments select approved own objects"
on storage.objects for select to authenticated
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
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat attachments update approved own objects"
on storage.objects for update to authenticated
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
on storage.objects for update to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
