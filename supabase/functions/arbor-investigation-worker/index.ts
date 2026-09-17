// Canonical source for the deployed Arbor investigation worker.
// Live production is currently Supabase Edge Function arbor-investigation-worker v4.
//
// IMPORTANT: the deployed worker source must be synchronized here before the next
// processor change. The durable processor contract is documented in README.md.
//
// Current verified processors:
// - source_fetch: HTTPS text/HTML/JSON capture with provenance
// - text_ingest: provenance-preserving chunk creation
//
// Next processor boundary:
// - document_parse: PDF/document extraction with page-level provenance
// - evidence_extract
// - entity_resolve
// - relationship_event_extract
// - verify
// - pattern_hop
//
// This file intentionally does not contain credentials or worker authentication material.
