# Research worker integration audit — safe handoff, no deployment

Date: 2026-09-22/23. This is a code-level audit of the draft branch, not evidence of deployed integration. Source branch `feat/ark-research-privacy-contract-reconciliation-20260922`, draft PR #181; inherited draft #123 and related research stack. No existing Supabase instance was modified.

## Verified executable baseline

- GitHub Actions run **35806347563** on `c54ca183208c5b09c2454cfbfdf8ee576b956c17`: all six jobs SUCCESS.
- Ephemeral PostgreSQL 17.11: proposed SQL, owner RLS, RPC grants, STOP, revocation, prestart/deadline, expired/reclaimed leases, stale-token fencing, budget, two competing claimers, duplicate settle, session lock wait past claim deadline, session lock wait past lease expiry, and independent STOP/settle race all PASS.
- The external blank IRS PDF acceptance is machine-level only; manual original-page and privacy acceptance remain HOLD.

## Existing code; do not duplicate

1. `apps/backend/lib/research/sessionRunner.ts`: one bounded unit per tick, no self-scheduler, validates receipt against claim and reservation; depends on `ResearchStore` and a supplied executor.
2. `apps/backend/lib/research/supabaseResearchStore.ts`: scoped service-role adapter, owner/project checked on loaded session and each RPC, no unscoped fallback. It is intentionally **not** wired to cron or production.
3. `docs/research/sql/PROPOSED_arbor_research_sessions.sql`: un-applied proposal; service-role-only claim/settle/STOP, transaction-level locks and RLS read policies.
4. `supabase/functions/arbor-investigation-worker/index.ts`: a **separate older investigation task worker**, not a drop-in research session worker. It can fetch external HTTPS text when explicitly invoked, writes investigation evidence/tasks, and uses `arbor_claim_investigation_task`, not the new `arbor_claim_research_unit`. Do not enable or connect it to this timeboxed research session without explicit reviewed adapter, safe source policy and deployment authorization.
5. PR #125 has a read-only ARK continuity handoff; PR #147 has ARK/Arbor Layer work-order boundary. They are separate contracts, not proof that the new research session worker is integrated.
6. Draft research PRs #168–#180 contain source-chain, canonical index, original-page and privacy review components. Reconcile their ancestry; avoid duplicating or silently bypassing HOLDs.

## Required before a controlled synthetic worker rehearsal

- [ ] Review `sessionPolicy.ts` and existing `sessionRunner` tests for session snapshot staleness, retry exhaustion, completion and unresolved-work semantics.
- [ ] Add explicit, narrow owner/project authorization boundary to any new API entry point. Do not derive owner/project from arbitrary client request parameters.
- [ ] Provide a synthetic executor that returns an evidence-backed receipt; no external fetch, no real Epstein files.
- [ ] Confirm receipt durability and evidence persistence before any status is described as complete.
- [ ] Check no external scheduler/cron can start the worker by default.
- [ ] Exercise one tick, STOP, duplicate tick, expired lease, deadline, restart and idempotency in a synthetic environment.
- [ ] Reconcile source/version identity, page-image review, source independence, privacy review ledger and explicit publication HOLD in one traceable synthetic packet.
- [ ] Human review of original public PDF physical pages; retain manual HOLD until then.
- [ ] Separate approval for live worker, deployment, real source ingestion or public release.

## Current operator decision

Proceed with safe code/test review and isolated synthetic acceptance only. No deployment or worker activation is implied by passing PostgreSQL tests. No real evidence corpus has been processed by this acceptance suite.
