begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(20);

create temporary table attachment_policy_under_test as
select permissive, roles, cmd,
  regexp_replace(lower(replace(qual, '"', '')), '\s+', ' ', 'g') as normalized_qual
from pg_policies
where schemaname = 'public'
  and tablename = 'chat_attachments'
  and policyname = 'chat attachments select scoped metadata';

select extensions.ok(
  (select count(*) = 1 from attachment_policy_under_test),
  'exactly one scoped attachment metadata policy is installed'
);
select extensions.ok(
  (select permissive = 'PERMISSIVE' and roles::text = '{authenticated}' and cmd = 'SELECT'
   from attachment_policy_under_test),
  'the scoped metadata policy remains permissive SELECT for authenticated'
);
select extensions.ok(
  (select position('c.project_id = c.project_id' in normalized_qual) = 0 from attachment_policy_under_test),
  'conversation project comparison is not tautological'
);
select extensions.ok(
  (select position('m.project_id = m.project_id' in normalized_qual) = 0 from attachment_policy_under_test),
  'message project comparison is not tautological'
);
select extensions.ok(
  (select position('m.conversation_id = m.conversation_id' in normalized_qual) = 0 from attachment_policy_under_test),
  'message conversation comparison is not tautological'
);
select extensions.ok(
  (select position('c.id = chat_attachments.conversation_id' in normalized_qual) > 0 from attachment_policy_under_test),
  'conversation id is correlated to the outer attachment row'
);
select extensions.ok(
  (select position('c.project_id = chat_attachments.project_id' in normalized_qual) > 0 from attachment_policy_under_test),
  'conversation project is correlated to the outer attachment row'
);
select extensions.ok(
  (select position('m.id = chat_attachments.message_id' in normalized_qual) > 0 from attachment_policy_under_test),
  'message id is correlated to the outer attachment row'
);
select extensions.ok(
  (select position('m.project_id = chat_attachments.project_id' in normalized_qual) > 0 from attachment_policy_under_test),
  'message project is correlated to the outer attachment row'
);
select extensions.ok(
  (select position('m.conversation_id = chat_attachments.conversation_id' in normalized_qual) > 0 from attachment_policy_under_test),
  'message conversation is correlated to the outer attachment row'
);
select extensions.ok(
  (select position('= user_id' in normalized_qual) > 0
      and position('deleted_at is null' in normalized_qual) > 0
      and position('storage_bucket = ''chat-attachments''' in normalized_qual) > 0
      and position('storage_path' in normalized_qual) > 0
      and position('(project_id)::text' in normalized_qual) > 0
      and position('(conversation_id)::text' in normalized_qual) > 0
      and position('(id)::text' in normalized_qual) > 0
   from attachment_policy_under_test),
  'all immutable top-level attachment scope predicates remain installed'
);

select extensions.ok(
  not (
    has_table_privilege('anon', 'public.chat_attachments', 'SELECT')
    or has_table_privilege('anon', 'public.chat_attachments', 'INSERT')
    or has_table_privilege('anon', 'public.chat_attachments', 'UPDATE')
    or has_table_privilege('anon', 'public.chat_attachments', 'DELETE')
    or has_table_privilege('anon', 'public.chat_attachments', 'TRUNCATE')
    or has_table_privilege('anon', 'public.chat_attachments', 'REFERENCES')
    or has_table_privilege('anon', 'public.chat_attachments', 'TRIGGER')
    or has_table_privilege('anon', 'public.chat_attachments', 'MAINTAIN')
  ),
  'anon retains no direct chat_attachments privileges'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.chat_attachments', 'SELECT')
  and not has_table_privilege('authenticated', 'public.chat_attachments', 'INSERT')
  and not has_table_privilege('authenticated', 'public.chat_attachments', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.chat_attachments', 'DELETE')
  and not has_table_privilege('authenticated', 'public.chat_attachments', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'public.chat_attachments', 'REFERENCES')
  and not has_table_privilege('authenticated', 'public.chat_attachments', 'TRIGGER')
  and not has_table_privilege('authenticated', 'public.chat_attachments', 'MAINTAIN'),
  'authenticated retains SELECT only on chat_attachments'
);
select extensions.ok(
  has_table_privilege('service_role', 'public.chat_attachments', 'SELECT')
  and has_table_privilege('service_role', 'public.chat_attachments', 'UPDATE')
  and not has_table_privilege('service_role', 'public.chat_attachments', 'INSERT')
  and not has_table_privilege('service_role', 'public.chat_attachments', 'DELETE')
  and not has_table_privilege('service_role', 'public.chat_attachments', 'TRUNCATE')
  and not has_table_privilege('service_role', 'public.chat_attachments', 'REFERENCES')
  and not has_table_privilege('service_role', 'public.chat_attachments', 'TRIGGER')
  and not has_table_privilege('service_role', 'public.chat_attachments', 'MAINTAIN'),
  'service_role retains SELECT and UPDATE only on chat_attachments'
);
select extensions.ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and 'authenticated' = any (roles)
      and (coalesce(qual, '') ilike '%chat-attachments%'
        or coalesce(with_check, '') ilike '%chat-attachments%')
  ),
  'authenticated has no direct chat-attachments Storage policy'
);
select extensions.ok(
  exists (
    select 1 from storage.buckets
    where id = 'chat-attachments'
      and public is false
      and file_size_limit = 10485760
      and allowed_mime_types = array[
        'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
        'text/plain', 'text/markdown'
      ]::text[]
  ),
  'chat-attachments bucket configuration is unchanged'
);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values (
  '10000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'attachment-policy@example.invalid',
  now(),
  now()
);
insert into public.projects (id, user_id, name)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Policy project A'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Policy project B');
insert into public.conversations (id, user_id, project_id, title)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Conversation A'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Conversation B'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Conversation C');
insert into public.messages (id, conversation_id, user_id, project_id, role, content)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'user', 'valid message'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'user', 'other project message'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'user', 'other conversation message');

insert into public.chat_attachments (
  id, user_id, project_id, conversation_id, message_id, storage_path,
  original_filename, safe_filename, mime_type, size_bytes, attachment_kind, status
)
values
  (
    '50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/valid.txt',
    'valid.txt', 'valid.txt', 'text/plain', 12, 'file', 'uploaded'
  ),
  (
    '50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', null,
    '10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000002/50000000-0000-4000-8000-000000000002/wrong-conversation-project.txt',
    'wrong-conversation-project.txt', 'wrong-conversation-project.txt', 'text/plain', 12, 'file', 'uploaded'
  ),
  (
    '50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000003/wrong-message-project.txt',
    'wrong-message-project.txt', 'wrong-message-project.txt', 'text/plain', 12, 'file', 'uploaded'
  ),
  (
    '50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000004/wrong-message-conversation.txt',
    'wrong-message-conversation.txt', 'wrong-message-conversation.txt', 'text/plain', 12, 'file', 'uploaded'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select extensions.ok(
  exists (select 1 from public.chat_attachments where id = '50000000-0000-4000-8000-000000000001'),
  'correctly scoped attachment metadata is selectable'
);
select extensions.ok(
  not exists (select 1 from public.chat_attachments where id = '50000000-0000-4000-8000-000000000002'),
  'same-user conversation in another project is denied'
);
select extensions.ok(
  not exists (select 1 from public.chat_attachments where id = '50000000-0000-4000-8000-000000000003'),
  'message from another project is denied'
);
select extensions.ok(
  not exists (select 1 from public.chat_attachments where id = '50000000-0000-4000-8000-000000000004'),
  'message from another conversation is denied'
);

reset role;
select * from extensions.finish();
rollback;
