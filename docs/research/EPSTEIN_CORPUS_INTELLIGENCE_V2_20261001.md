# Epstein public-records research — corpus intelligence v2

Date: 2026-10-01

Parent verified layer: PR #224 / head `b06f894bcf0356659da6703f56950571f750a8cb`.

This is an extension of the same ARK research engine. It is not a second engine and does not authorize production activation or real-source ingestion.

## 1. Persisted full-session restart acceptance

A disposable PostgreSQL acceptance now exercises a complete three-unit research session across distinct worker identities.

The sequence includes:
- worker process 1 claims unit A and dies before settlement;
- the lease is durably expired to simulate time passing;
- worker process 2 reclaims A and settles it;
- worker processes 3 and 4 settle B and C separately;
- final persisted aggregates, receipts, attempt counts and evidence references are verified;
- a zero-unresolved session cannot claim additional work;
- the session is not permitted to self-mark completed without the separate evidence completion verifier.

This is disposable/synthetic proof only.

## 2. OCR / handwriting review pipeline

Module: `ocrReview.ts`.

Properties:
- opt-in is mandatory;
- input is bound to the exact existing page-image SHA-256;
- the OCR engine is injected rather than hard-wired to a vendor;
- output stores engine/version, page dimensions, source kind, token coordinates and confidence;
- OCR text is secondary extraction and never overwrites original bytes, page image, or text-layer extraction;
- human corrections append a review record while preserving original OCR output;
- all output remains HOLD for independent source/privacy review.

No production OCR engine or paid OCR API is enabled.

## 3. Geometry-preserving table / ledger reconstruction

Module: `tableReconstruction.ts`.

The engine groups source-anchored tokens into visual rows and columns using deterministic geometry.

It preserves:
- source references;
- page hash;
- token IDs;
- cell bounding boxes;
- row/column indexes.

It does not infer:
- semantic header meaning;
- account ownership;
- totals;
- intent;
- relationships not represented by the source geometry.

Every reconstruction remains `candidate_requires_visual_review`.

## 4. Hybrid corpus retrieval

Module: `hybridRetrieval.ts`.

Ranking combines:
- exact structured identifier overlap;
- lexical corpus relevance;
- optional cosine similarity from already-computed embedding vectors.

Embedding generation is deliberately outside this module. No embedding vendor, model, paid API or autonomous vectorization is authorized here.

Every retrieval hit:
- retains exact source references;
- explains which ranking signals contributed;
- remains a retrieval lead, not evidence promotion.

The proposed persistence layer also maintains a PostgreSQL `tsvector` full-text index for deterministic lexical retrieval.

## 5. Document-family reconstruction

Module: `documentFamilyReconstruction.ts`.

Supported deterministic relationships:
- email/message reply chains from explicit message IDs;
- attachment → parent document;
- shared calendar event ID;
- shared trip reference;
- explicit invoice/payment reference;
- deposition → exhibit.

No graph proximity, co-occurrence or model intuition may silently create a family edge.

Disconnected documents stay disconnected.

## 6. Proposed durable persistence

`docs/research/sql/PROPOSED_epstein_corpus_intelligence_v2.sql`

Adds proposed tables for:
- OCR receipts;
- OCR tokens;
- OCR human reviews;
- table reconstructions;
- table cells;
- retrieval records with source refs and lexical index;
- document-family edges.

Machine extraction and review history are append-only where appropriate.

No production migration is created.

## 7. Synthetic acceptance

Backend tests cover:
- OCR exact-image binding and separate correction history;
- 2×2 table reconstruction with source coordinates;
- exact + lexical + precomputed semantic retrieval;
- explicit email/attachment and deposition/exhibit family reconstruction.

Disposable PostgreSQL acceptance covers:
- OCR receipt/token/review persistence;
- OCR append-only enforcement;
- table/cell persistence;
- source-anchored FTS retrieval;
- document-family edge persistence.

## Gates intentionally preserved

Still not authorized or performed:
- production SQL application;
- live research-worker wiring;
- scheduler enablement;
- production deployment;
- real Epstein/EFTA ingestion;
- automatic OCR of the real corpus;
- embedding generation;
- victim/private-person data processing;
- merge or publication.
