-- Harden Annabelle read-receipt functions after advisor review.
alter function public.annabelle_valid_read_receipt(uuid,uuid,uuid,uuid,text) set search_path=public;
alter function public.annabelle_reconcile_read_checkpoint(uuid,uuid,uuid,text) set search_path=public;
alter function public.annabelle_guard_read_checkpoint() set search_path=public;
alter function public.annabelle_invalidate_receipts_on_chapter_source_change() set search_path=public;
revoke all on function public.annabelle_invalidate_receipts_on_chapter_source_change() from public,anon,authenticated;
