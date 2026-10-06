# Pattern Hop document-review adapter

Built on the existing v7 research stack at `2a726225fbd09b5be8ded725fa080f9542822110`. This patch keeps document-review preparation separate from the historical-memory MCP queue bridge.

## Demonstrated repairs

1. Source-origin grouping now joins derivative reports through an uncaptured shared original. Placeholder origins connect known sources but are not emitted as captured evidence. Different hashes or URLs do not make those reports independent.
2. Alias normalization preserves Unicode letters/numbers. Different non-Latin names no longer collapse to identical empty strings. Labels without letters or numbers reject normalization. Fuzzy suggestions remain candidates and cannot merge identities.
3. `preparePatternHopFromReviewPacket` binds the existing review packet, next-hop explanation and prepared candidate. It retains original document/page/hash/source references, contradiction and unresolved identity review requirements, reason and stopping condition. Trigger references outside the packet reject preparation.
4. The prepared result explicitly requires a document-research adapter and cannot be submitted to the historical-memory tool. Preparation still neither queues nor executes anything; the existing workbench must receive a trusted caller before this can become operational.

A synthetic multi-module test runs existing temporal conflict detection, source-family grouping and review-to-hop preparation, then serializes/reloads the input and checks stable preparation. It proves source composition, not original-page reading, independent identity resolution or live durable restart.

## Checks

212 research tests pass offline. Backend TypeScript checking passes. Unit setup now rejects external fetches; three pre-existing test-fixture type errors were corrected without changing runtime behavior. Automatic approval review rejected an initial full-backend research-branch run because possible model-provider egress was not authorized. The narrower research-only run with external fetches forbidden completed successfully; the full backend suite on this research branch was not rerun.

No live schema, source capture, ingestion, publication, execution flag, scheduler or deployment changed. Existing v6 integration gates remain fail-closed. Original-source capture, authorized corpus lookup, trusted review, owned persistence and live readback still need their real callers. The adapter does not assert independent corroboration or completion of an investigation.
