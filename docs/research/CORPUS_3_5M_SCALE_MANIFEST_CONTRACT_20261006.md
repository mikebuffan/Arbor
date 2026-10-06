# 3.5M-page corpus scaling and manifest contract — 2026-10-06

Scale target is an operator planning assumption, not proof of current ingestion.

## Manifest accounting
Every source object must have a stable source id, source family/origin information, byte hash when captured, page count when known, capture authorization/status, parser/version, and ingestion state. Maintain distinct counts for discovered, authorized, captured, parsed, indexed, reviewed and failed objects/pages.

A discovered URL is not an ingested document. An indexed extraction is not an original-page review.

## Batching/backpressure
- bounded source/page batches;
- durable checkpoint after verified batch;
- deterministic source/page identity;
- retry same batch after failure;
- bounded concurrent parser/OCR/retrieval work;
- backpressure before queue/memory/storage saturation;
- no unbounded fan-out from Pattern Hop.

## Deduplication
Use byte hash and explicit derivation/origin links where available. Near-duplicate/OCR similarity may propose family candidates but must not silently declare independent sources.

## Indexing
Prefer indexes keyed by owner/project/snapshot/source identity, canonical content hash, source family, entity mention, temporal bucket and durable run/checkpoint identifiers. Measure query plans against representative high-cardinality fixtures before hosted promotion.

## Recovery
Crash at discover/capture/parse/index/review/hop/checkpoint boundaries must resume from the last verified durable boundary. Never advance manifest coverage merely because a job was attempted.

## Operator visibility
Dashboard/contracts should expose:
- snapshot id/version;
- discovered/captured/parsed/indexed/reviewed/failed counts;
- queue depth/backpressure;
- duplicate/family counts;
- unresolved identity candidates;
- contradictions/counterevidence;
- coverage blind spots;
- active run/lease/STOP state;
- last verified checkpoint and failure reason.

Coverage is not truth and throughput is not investigative completion.
