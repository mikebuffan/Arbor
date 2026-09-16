create index if not exists arbor_pattern_hop_edges_from_evidence_idx
  on public.arbor_pattern_hop_edges(from_evidence_id);
create index if not exists arbor_pattern_hop_edges_to_evidence_idx
  on public.arbor_pattern_hop_edges(to_evidence_id);