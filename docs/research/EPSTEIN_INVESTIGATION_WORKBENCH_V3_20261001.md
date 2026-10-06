# Epstein public-records research — investigation workbench v3

Date: 2026-10-01

Parent verified layer: PR #225 / head `9e0dfa50f2ec7278c23b966dcf80658ba2ed710c`.

This is another extension of the same ARK research engine. It does not create a separate investigator and does not authorize production activation or real-source ingestion.

## 1. Conversation/thread reconstruction

Module: `threadReconstruction.ts`.

Reconstruction uses explicit message identifiers only:
- message ID;
- in-reply-to ID;
- explicit forwarded-message ID;
- source references;
- source timestamps when present.

It produces:
- explicit reply/forward edges;
- deterministic chronology;
- disconnected threads when no explicit linkage exists;
- orphan-reference leads when a referenced message is absent.

Semantic similarity, co-occurrence, names, or proximity cannot silently create a conversation edge.

## 2. Image/exhibit evidence

Module: `imageExhibitEvidence.ts`.

The visual evidence contract preserves:
- original document SHA-256;
- image SHA-256;
- document/page identity;
- source references;
- exhibit labels and captions;
- explicit testimony links;
- literal reviewed visual observations and optional source-region coordinates.

Visual observations are literal observations only. The contract explicitly rejects facial-recognition/identity-inference wording and supplies no biometric matching mechanism.

Every visual asset remains HOLD for source/privacy review.

## 3. Research Coverage Map

Module: `researchCoverageMap.ts`.

Coverage dimensions:
- document family;
- date bucket;
- entity;
- location;
- record type.

Coverage reports observed vs processed source references, optional expected counts, ratios and blind spots.

The system state is explicitly `coverage_not_truth`. High processing coverage does not prove a claim, and low coverage does not prove absence.

## 4. Neutral Lead Prioritizer

Module: `leadPrioritizer.ts`.

Research value may use:
- contradiction density;
- potential for independent source verification;
- unresolved identity count;
- missing connective tissue;
- expected information gain;
- evidence density;
- estimated research cost.

The prioritizer does not accept person-level guilt, suspicion, criminality, notoriety or political salience as scoring inputs.

Output is `research_value_only`, not a credibility or conduct score.

## 5. Human Review Workbench

Backend model: `reviewWorkbench.ts`.

Synthetic UI acceptance: `/research-review`.

The workbench can display:
- source identifiers/hashes;
- original-page image slot;
- text-layer extraction;
- OCR candidates/confidence;
- structured-table candidates;
- identity candidates and holds;
- contradictions;
- release deltas/redaction changes;
- visual exhibits;
- privacy holds.

Review actions are modeled as append-only receipts:
- confirm/reject extraction;
- reject alias;
- hold identity;
- mark derivative source;
- open Roundabout;
- accept/reject OCR candidate;
- accept/reject table candidate;
- accept/reject literal visual observation.

Actions do not rewrite source evidence.

The current UI intentionally operates only on a clearly labeled synthetic review packet. Review buttons are non-writing until production persistence and security integration are separately approved.

## 6. Proposed persistence

`docs/research/sql/PROPOSED_epstein_investigation_workbench_v3.sql`

Proposed tables:
- explicit thread edges;
- visual assets;
- literal visual observations;
- coverage snapshots/buckets;
- lead-priority receipts;
- review packets;
- review-action receipts.

Evidence/review history is append-only where appropriate.

## 7. Synthetic acceptance

Backend Vitest covers:
- explicit reply/forward thread reconstruction;
- orphan message references;
- visual evidence binding;
- no-biometric-inference guard;
- coverage blind spots;
- neutral research-value prioritization;
- receipt-based review actions with no packet mutation.

Disposable PostgreSQL acceptance covers:
- thread edge semantics;
- visual asset/observation persistence;
- visual append-only behavior;
- coverage snapshots/buckets;
- research-value lead-priority receipts;
- permanent publication HOLD on review packets;
- append-only review-action receipts.

Next production build CI also compiles the synthetic `/research-review` page.

## Gates preserved

Still not authorized or performed:
- production database migration;
- live worker integration;
- scheduler;
- Vercel production deployment;
- real Epstein/EFTA ingestion;
- automatic visual identity/biometric analysis;
- victim/private-person processing;
- publication/release;
- merge into main.
