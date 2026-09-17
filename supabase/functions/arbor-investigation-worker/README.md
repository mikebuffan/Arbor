# Arbor Investigation Worker

Durable investigation worker for Arbor.

## Contract

The worker is a bounded executor, not the owner of investigation state. Durable state lives in Postgres/PGMQ. A worker invocation claims a leased task, executes one supported processor, records evidence/provenance and a checkpoint, then completes/retries/blocks the task. Cron invokes the worker again, so an investigation continues across process lifetimes.

## Current verified processor

- `source_fetch`: fetches HTTPS text/HTML/JSON, records a SHA-256 content hash and provenance in `arbor_investigation_evidence`.

## Next processors

- `text_ingest`: accept already-extracted document text with document/page locators.
- `document_parse`: parse PDFs/documents and enqueue page/chunk ingestion.
- `evidence_extract`: split source captures into atomic claims/events/entities with provenance.
- `pattern_hop`: create evidence-justified follow-up tasks with dedupe/depth limits.
- `verify`: seek independent corroboration, contradictions, and negative findings.
- `entity_resolve`: distinguish aliases/name collisions/phones/addresses/organizations.
- `report`: surface meaningful reviewed findings with evidence chains.

## Invariants

1. Checkpoint is internal state, never equivalent to investigation completion.
2. Association is not culpability.
3. Preserve source URI/document ID/locator/hash for every evidence record.
4. Never silently discard failed searches or contradictions.
5. Child tasks require a recorded rationale and parent evidence/task.
6. Dedupe before enqueueing child work.
7. Leases expire so crashed workers do not strand tasks.
8. Consequential conclusions require review; worker stores evidence and epistemic status rather than declaring guilt.
9. Secrets never belong in repository source.
10. Existing working processors remain deployable while new processors are developed/tested.

The live Firefly deployment currently runs independently of this repository file; keep deployed function source and repo source synchronized as the worker is promoted.