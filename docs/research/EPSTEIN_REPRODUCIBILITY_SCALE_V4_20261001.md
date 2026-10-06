# Epstein public-records research — reproducibility & scale v4

Date: 2026-10-01

Parent verified layer: PR #226 / head `9ed45fdbcddf4c8ff1ca195fe66e7b06bab69dbe`.

## Reproducible investigation receipts
Every replay receipt binds corpus snapshot refs, query, filters, hop directives, resolver decisions, code version, algorithm versions, produced evidence/leads, and a canonical SHA-256 recipe digest. A recipe is replay metadata, not a finding.

## Evidence packets
Evidence packets preserve support, counterevidence and context with document/page/source hashes, highlighted passages, limitations, unresolved questions, privacy flags and original-page-review state. Packets remain HOLD for human review.

## Multilingual evidence
Original-language text is canonical. Translation is a secondary aligned layer with exact UTF-16 spans, translator/version, machine confidence, ambiguity notes and human-review status. Translation never replaces source text.

## Corpus scale/backpressure
The planner deterministically shards large corpora, including the 3.5M-page synthetic acceptance case. Runtime backpressure decisions use queue depth, latency, error rate, memory pressure and storage budget while respecting hard concurrency/batch caps. Near-exhausted storage pauses processing.

## Coverage-aware stopping
An investigation avenue may stop as exhausted only when:
- bounded source families are exhausted;
- required work is zero;
- coverage thresholds are met;
- multiple stable rounds yield no new evidence;
- multiple stable rounds yield no new leads;
- completion evidence receipts exist.

Unresolved contradictions or identities force manual HOLD. No-hits alone cannot establish truth, innocence, guilt or absence.

## Proposed persistence
The v4 SQL proposal adds append-only replay receipts, evidence packets, multilingual source/translation records, scale/backpressure receipts and stopping receipts.

## Gates preserved
No production database application, worker/scheduler enablement, Vercel deployment, real Epstein/EFTA ingestion, paid translation/embedding service, private/victim-data processing, merge, publication or release is authorized by this branch.
