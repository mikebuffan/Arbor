# Firefly ARK Preview — research integration rehearsal v6

Date: 2026-10-01

Parent verified security layer: PR #229 / head `18882ebfadb9a1bf9a302c6ba3dc8c3a562d6a5f`.

This is a **rehearsal**, not a live Preview migration.

## Read-only observed Preview baseline

Connected project: Firefly ARK Preview  
Project ref: `tzbpjbhroxiqftqwatnb`

Current observed migration head:
- `20261001180729 annabelle_editorial_hardening`

Read-only collision query returned:
- existing `public.arbor_research_%` tables: none
- existing `public.arbor_*research*` routines: none

Current migration history contains ARK Preview queue/submit/continuity work but no Epstein/research-schema migration names from this stack.

Therefore the observed Preview state is a clean candidate for a separately reviewed schema application. This document does **not** authorize that application.

## Ordered proposed apply manifest

1. `PROPOSED_arbor_research_sessions.sql`
2. `PROPOSED_epstein_ingestion_verification_v1.sql`
3. `PROPOSED_epstein_corpus_intelligence_v2.sql`
4. `PROPOSED_epstein_investigation_workbench_v3.sql`
5. `PROPOSED_epstein_reproducibility_scale_v4.sql`
6. `PROPOSED_epstein_security_hardening_v5.sql`
7. `PROPOSED_epstein_preview_integration_v6.sql`

Order is significant because later layers reference functions/tables created by earlier layers.

## Fail-closed integration state

The v6 integration-state table has four explicit gates:
- execution_enabled = false
- scheduler_enabled = false
- real_source_ingestion_enabled = false
- publication_enabled = false

The schema has a CHECK constraint that rejects any attempt to turn any of them on. V6 is structurally incapable of enabling execution.

## Cross-session continuity

`arbor_research_session_handoffs` records a same-owner/project transition from one bounded session to another.

A handoff:
- is append-only;
- requires both sessions to belong to the same owner/project;
- carries evidence references and a reason;
- has status `recorded_no_execution`;
- does not create, claim, schedule or execute work.

## Server persistence bridge

`SupabaseInvestigationStore` is a small service-role/server adapter.

Owner and project are constructor-scoped. Callers cannot supply owner/project IDs in write payloads.

Allow-listed operations currently include:
- append a replay recipe;
- append a human-review evidence packet;
- append a bounded session handoff;
- read the fail-closed integration state.

It deliberately does not expose a generic table writer.

## Pattern Hop bridge

The v6 Pattern Hop bridge creates only:
- evidence-backed objective/seed metadata;
- bounded max depth/hops;
- target table metadata;
- status `prepared_not_submitted`;
- `executionRequested:false`.

It does not insert a run or start a worker.

## Rollback/recovery model

Before any future Preview application, record:
- exact Preview project ref;
- exact pre-apply migration head;
- exact ordered migrations applied;
- confirmation that no research data was ingested;
- confirmation execution was never enabled.

Rollback is **forward-only**. Do not reset or destructively rewind an already shared/live database. If an applied schema needs removal, create a reviewed forward migration that revokes exposure and removes only objects proven safe to remove.

## What v6 proves in disposable PostgreSQL

Two synthetic owners/projects are created.

Acceptance requires:
- owner A sees only A's integration state/sessions/handoff;
- owner B sees only B's integration state/session and zero A handoffs;
- cross-owner handoff insertion fails at the composite foreign key;
- authenticated cannot insert handoffs;
- all integration execution flags remain false;
- the handoff receipt persists as `recorded_no_execution`.

## Not performed

- no SQL applied to Firefly ARK Preview;
- no production Firefly/Grove mutation;
- no worker or scheduler enabled;
- no Pattern Hop run submitted;
- no real Epstein/EFTA source captured;
- no research data ingested;
- no publication or release.
