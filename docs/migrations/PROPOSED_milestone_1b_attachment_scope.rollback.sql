-- FAIL-CLOSED ROLLBACK TEMPLATE. DO NOT APPLY.
--
-- The prior snapshot is deliberately not encoded as an authoritative rollback.
-- Immediately before any later forward execution, capture the exact live:
--   * public.chat_attachments table grants, including PUBLIC/effective grants;
--   * policy names, commands, roles, USING/WITH CHECK expressions, and modes;
--   * RLS and FORCE RLS state;
--   * chat-attachments bucket configuration; and
--   * all applicable storage.objects policies.
-- Generate a transaction that restores that captured state byte-for-byte in
-- meaning, review it beside the forward SQL, and replace this fail-closed file.
-- No historical or assumed grant set may be substituted.

begin;

do $rollback_requires_fresh_firefly_capture$
begin
  raise exception
    'STOP: rollback has not been generated from the immediate pre-apply Firefly catalog capture';
end
$rollback_requires_fresh_firefly_capture$;

rollback;
