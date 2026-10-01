-- Source-backed read receipts: editorial notes can never prove prose consumption.
create table if not exists public.annabelle_read_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  manuscript_id uuid not null references public.annabelle_manuscripts(id) on delete cascade,
  chapter_id uuid not null references public.annabelle_chapters(id) on delete cascade,
  pass_type text not null check (pass_type in ('diagnostic','continuous','editing','proof','voice_integrity')),
  source_sha256 text not null,
  source_text_sha256 text not null,
  source_char_count integer not null check (source_char_count > 0),
  consumed_char_count integer not null check (consumed_char_count > 0),
  consumed_start integer not null default 0 check (consumed_start = 0),
  consumed_end integer not null check (consumed_end > 0),
  receipt_version integer not null default 1 check (receipt_version = 1),
  provenance jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  invalidated_at timestamptz,
  invalidation_reason text,
  created_at timestamptz not null default now(),
  check (consumed_char_count = source_char_count),
  check (consumed_end = source_char_count),
  unique(user_id, project_id, manuscript_id, chapter_id, pass_type, source_sha256, source_text_sha256)
);

create index if not exists annabelle_read_receipts_valid_idx
 on public.annabelle_read_receipts(user_id,project_id,manuscript_id,pass_type,chapter_id)
 where invalidated_at is null;

alter table public.annabelle_read_receipts enable row level security;
create policy annabelle_read_receipts_select_own on public.annabelle_read_receipts for select
 using (auth.uid()=user_id and exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid()));
create policy annabelle_read_receipts_insert_own on public.annabelle_read_receipts for insert
 with check (auth.uid()=user_id and exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid()));
-- Receipts are append-only evidence. Only invalidation fields may change, via trusted service/RPC.

create or replace function public.annabelle_valid_read_receipt(
 p_user_id uuid,p_project_id uuid,p_manuscript_id uuid,p_chapter_id uuid,p_pass_type text
) returns boolean language sql stable security invoker as $$
 select exists(
   select 1 from public.annabelle_read_receipts r
   join public.annabelle_chapters c on c.id=r.chapter_id
   where r.user_id=p_user_id and r.project_id=p_project_id and r.manuscript_id=p_manuscript_id
     and r.chapter_id=p_chapter_id and r.pass_type=p_pass_type and r.invalidated_at is null
     and r.source_sha256=c.source_sha256 and r.consumed_char_count=r.source_char_count
     and r.consumed_start=0 and r.consumed_end=r.source_char_count
 );
$$;

create or replace function public.annabelle_reconcile_read_checkpoint(
 p_user_id uuid,p_project_id uuid,p_manuscript_id uuid,p_pass_type text
) returns table(completed_through integer,next_chapter integer,status text)
language plpgsql security invoker as $$
declare total integer; done integer; first_missing integer;
begin
 select count(*) into total from public.annabelle_chapters where manuscript_id=p_manuscript_id and user_id=p_user_id and project_id=p_project_id;
 select min(c.chapter_number) into first_missing
 from public.annabelle_chapters c
 where c.manuscript_id=p_manuscript_id and c.user_id=p_user_id and c.project_id=p_project_id
 and not public.annabelle_valid_read_receipt(p_user_id,p_project_id,p_manuscript_id,c.id,p_pass_type);
 if first_missing is null then done:=coalesce((select max(chapter_number) from public.annabelle_chapters where manuscript_id=p_manuscript_id),0);
 else done:=greatest(first_missing-1,0); end if;
 insert into public.annabelle_editorial_checkpoints(user_id,project_id,manuscript_id,pass_type,chapter_number,status,state)
 values(p_user_id,p_project_id,p_manuscript_id,p_pass_type,done,
   case when first_missing is null and total>0 then 'complete' when done=0 then 'ready' else 'in_progress' end,
   jsonb_build_object('derivedFromReadReceipts',true,'nextChapter',first_missing,'receiptVersion',1))
 on conflict(user_id,project_id,manuscript_id,pass_type) do update
 set chapter_number=excluded.chapter_number,status=excluded.status,state=excluded.state,updated_at=now();
 return query select done,first_missing,
   case when first_missing is null and total>0 then 'complete' when done=0 then 'ready' else 'in_progress' end::text;
end $$;

create or replace function public.annabelle_guard_read_checkpoint()
returns trigger language plpgsql as $$
begin
 if coalesce((new.state->>'derivedFromReadReceipts')::boolean,false) is not true
    and (new.pass_type in ('diagnostic','continuous','proof','voice_integrity')) then
   raise exception 'annabelle_read_checkpoint_must_be_receipt_derived';
 end if;
 return new;
end $$;
drop trigger if exists annabelle_guard_read_checkpoint on public.annabelle_editorial_checkpoints;
create trigger annabelle_guard_read_checkpoint before insert or update on public.annabelle_editorial_checkpoints
for each row execute function public.annabelle_guard_read_checkpoint();

create or replace function public.annabelle_invalidate_receipts_on_chapter_source_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.source_sha256 is distinct from new.source_sha256 then
   update public.annabelle_read_receipts set invalidated_at=now(),invalidation_reason='chapter_source_sha256_changed'
   where chapter_id=new.id and invalidated_at is null and source_sha256<>new.source_sha256;
 end if;
 return new;
end $$;
drop trigger if exists annabelle_invalidate_receipts_on_chapter_source_change on public.annabelle_chapters;
create trigger annabelle_invalidate_receipts_on_chapter_source_change after update of source_sha256 on public.annabelle_chapters
for each row execute function public.annabelle_invalidate_receipts_on_chapter_source_change();
