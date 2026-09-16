create unique index if not exists arbor_pattern_hop_edges_unique
on public.arbor_pattern_hop_edges(
  run_id,
  coalesce(from_evidence_id,'00000000-0000-0000-0000-000000000000'::uuid),
  to_evidence_id,
  relationship,
  hop_depth
);