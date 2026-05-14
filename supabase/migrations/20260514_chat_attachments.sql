-- Arbor chat attachments: private Supabase Storage + metadata
-- Production-shaped direct Supabase Storage upload with backend-created upload intents.
--
-- Design:
-- 1. Backend creates a pending upload intent row.
-- 2. Flutter uploads directly to Supabase Storage at the approved path.
-- 3. Storage RLS allows insert only when matching pending metadata exists.
-- 4. Backend verifies upload and marks row uploaded.
-- 5. Chat sends attachment IDs; file contents are not automatically injected into memory.

-- ============================================================
-- 1) Private storage bucket
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- 2) Attachment metadata table
-- ============================================================

create table if not exists public.chat_attachments (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,

  storage_bucket text not null default 'chat-attachments',
  storage_path text not null,

  original_filename text not null,
  safe_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),

  attachment_kind text not null check (attachment_kind in ('image', 'file')),

  status text not null default 'pending'
    check (status in ('pending', 'uploaded', 'failed', 'deleted')),

  upload_intent_expires_at timestamptz not null default (now() + interval '20 minutes'),

  created_at timestamptz not null default now(),
  uploaded_at timestamptz,
  deleted_at timestamptz,
  delete_reason text,

  constraint chat_attachments_bucket_check
    check (storage_bucket = 'chat-attachments'),

  constraint chat_attachments_storage_path_user_prefix
    check (storage_path like (user_id::text || '/%')),

  constraint chat_attachments_storage_path_project_scope
    check (storage_path like (user_id::text || '/' || project_id::text || '/%')),

  constraint chat_attachments_storage_path_conversation_scope
    check (storage_path like (user_id::text || '/' || project_id::text || '/' || conversation_id::text || '/%')),

  constraint chat_attachments_storage_path_attachment_scope
    check (storage_path like (user_id::text || '/' || project_id::text || '/' || conversation_id::text || '/' || id::text || '/%'))
);

create index if not exists chat_attachments_user_created_idx
on public.chat_attachments (user_id, created_at desc);

create index if not exists chat_attachments_project_created_idx
on public.chat_attachments (project_id, created_at desc);

create index if not exists chat_attachments_conversation_created_idx
on public.chat_attachments (conversation_id, created_at desc);

create index if not exists chat_attachments_status_expires_idx
on public.chat_attachments (status, upload_intent_expires_at);

create unique index if not exists chat_attachments_storage_path_uidx
on public.chat_attachments (storage_bucket, storage_path)
where deleted_at is null;

-- ============================================================
-- 3) Metadata RLS
-- ============================================================

alter table public.chat_attachments enable row level security;

drop policy if exists "chat attachments select own metadata"
on public.chat_attachments;

drop policy if exists "chat attachments update own metadata"
on public.chat_attachments;

drop policy if exists "chat attachments delete own metadata"
on public.chat_attachments;

-- No public/authenticated INSERT policy.
-- Attachment rows are created by backend route using service role
-- after validating project/conversation ownership.

create policy "chat attachments select own metadata"
on public.chat_attachments
for select
to authenticated
using (
  auth.uid() = user_id
  and deleted_at is null
  and exists (
    select 1
    from public.projects p
    where p.id = chat_attachments.project_id
      and p.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.conversations c
    where c.id = chat_attachments.conversation_id
      and c.user_id = auth.uid()
      and c.project_id = chat_attachments.project_id
  )
);

create policy "chat attachments update own metadata"
on public.chat_attachments
for update
to authenticated
using (
  auth.uid() = user_id
  and deleted_at is null
)
with check (
  auth.uid() = user_id
  and storage_bucket = 'chat-attachments'
  and storage_path like (auth.uid()::text || '/%')
);

-- App/backend should prefer soft-delete. This permits user-owned hard cleanup if needed.
create policy "chat attachments delete own metadata"
on public.chat_attachments
for delete
to authenticated
using (auth.uid() = user_id);

-- ============================================================
-- 4) Storage object RLS
-- ============================================================

drop policy if exists "chat attachments select approved own objects"
on storage.objects;

drop policy if exists "chat attachments insert approved own objects"
on storage.objects;

drop policy if exists "chat attachments delete approved own objects"
on storage.objects;

-- SELECT only if object belongs to an owned, non-deleted attachment row.
create policy "chat attachments select approved own objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.chat_attachments a
    where a.storage_bucket = bucket_id
      and a.storage_path = name
      and a.user_id = auth.uid()
      and a.status in ('pending', 'uploaded')
      and a.deleted_at is null
      and exists (
        select 1
        from public.projects p
        where p.id = a.project_id
          and p.user_id = auth.uid()
      )
      and exists (
        select 1
        from public.conversations c
        where c.id = a.conversation_id
          and c.user_id = auth.uid()
          and c.project_id = a.project_id
      )
  )
);

-- INSERT only if backend already created a pending, unexpired upload intent.
create policy "chat attachments insert approved own objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.chat_attachments a
    where a.storage_bucket = bucket_id
      and a.storage_path = name
      and a.user_id = auth.uid()
      and a.status = 'pending'
      and a.deleted_at is null
      and a.upload_intent_expires_at > now()
      and exists (
        select 1
        from public.projects p
        where p.id = a.project_id
          and p.user_id = auth.uid()
      )
      and exists (
        select 1
        from public.conversations c
        where c.id = a.conversation_id
          and c.user_id = auth.uid()
          and c.project_id = a.project_id
      )
  )
);

-- DELETE object only if user owns corresponding metadata row.
create policy "chat attachments delete approved own objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.chat_attachments a
    where a.storage_bucket = bucket_id
      and a.storage_path = name
      and a.user_id = auth.uid()
      and a.deleted_at is null
  )
);
