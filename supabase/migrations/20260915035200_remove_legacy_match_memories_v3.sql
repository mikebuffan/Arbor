-- Keep one canonical conversation-aware memory retrieval contract.
drop function if exists public.match_memories_v3(
  uuid,
  uuid,
  vector,
  integer
);
