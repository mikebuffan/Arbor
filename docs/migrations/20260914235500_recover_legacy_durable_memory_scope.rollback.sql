-- Rollback for legacy durable memory scope recovery.
-- Restores the exact original scope and conversation_id from the audit log.

update public.memory_items mi
set
  scope = recovery.previous_scope,
  conversation_id = recovery.previous_conversation_id,
  updated_at = now()
from public.ar_memory_scope_recovery_log recovery
where recovery.memory_id = mi.id
  and recovery.reason =
    'legacy_durable_conversation_scope_recovery_20260914';

-- Keep the recovery log for audit unless a later reviewed migration removes it.
