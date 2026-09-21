# ARK Research Sessions — isolated implementation increment

**Status: draft and not deployed.** This branch adds bounded 60-minute research-session policy, a one-unit-per-invocation runner, and tests. It does **not** claim autonomous hour-long research is working in production.

## Why an hour is a session rather than a single AI request

A scheduler repeatedly invokes short-lived workers. A durable session owns its UTC start/deadline, explicit owner/project, authorization, cost and task budgets, unresolved work, and evidence references. Each tick checks the persisted deadline and budgets; claims at most one leased unit; passes remaining allowances to the executor; and requests an atomic idempotent settlement.

The worker invocation's request timeout is separate from the research session's hour-long window. The UI must display `timebox_ended` as “window ended, work remains,” NOT “investigation complete.” Only a separate evidence-backed verifier may mark completion.

## Implemented in this branch

- Reject zero/negative or >60-minute windows.
- Respect cancellation, pause, blocked states, and missing authorization.
- Enforce independent work-unit and committed-cost ceilings.
- Reject mismatched unit receipts and evidence-free reduction of unresolved work.
- One unit at most per call; no hidden timers, auto-enqueue, or prod side effects.
- Vitest cases for timebox, authorization, budgets, evidence, one-claim execution, expiry, and claim/receipt mismatch.

## Release gates — NOT YET IMPLEMENTED

1. **Durable adapter:** persist session owner/project/deadline and receipt ledger; atomic owner-scoped leased claims, lease fencing, idempotent settlement, and cost reservations for concurrent work. External side effects are not magically exactly-once; test crashes/retries.
2. **Live worker sync:** original Supabase deployment `arbor-investigation-worker` is v5 while checked-in `supabase/functions/arbor-investigation-worker/index.ts` is an older documentation placeholder. DO NOT deploy that placeholder over v5. Sync actual deployed source before processor changes.
3. **Processor chain:** deployed v5 supports HTTPS text fetch plus chunk ingestion; add and verify PDFs, evidence extraction, source comparison, Pattern Hop, and reviewed reporting separately.
4. **Scheduler:** root `vercel.json` specifies a ten-minute heartbeat while `apps/backend/vercel.json` specifies daily. Confirm actual deployment root and wire an independent, authorized research tick without accidentally expanding ARK's existing production canary scope.
5. **Privacy:** separately remediate/review elevated-owner investigation read views before exposing research findings through a public endpoint. Protect survivors' identities and confidential source data.
6. **Acceptance:** isolated clock-driven hour simulation, crash/restart, lease expiration, duplicate receipts, stop/cancel, cost limits, cross-owner denial, and provenance report validation.

**Production flags and existing investigation data remain untouched by this branch.** Do not enqueue an Epstein investigation solely because this draft exists.

## Implementation continuation (same isolated PR)

- Added simulated successive worker ticks and restart after expired lease, plus duplicate settlement and honest hour-end tests.
- Added an owner/project-pinned `SupabaseResearchStore` adapter; it cannot query or settle cross-owner sessions via its public methods.
- Added proposed Postgres tables for sessions, units, receipts, RLS owner-read policies and service-role-only fenced claim/settle/stop RPCs.
- **Proposed SQL is deliberately outside `supabase/migrations`** at `docs/research/sql/PROPOSED_arbor_research_sessions.sql`. Merely merging the TypeScript branch will NOT apply untested database changes.
- Unit cost reservations are passed into the executor and checked at the runner boundary and proposed database settlement.
- Tests cover adapter identity scoping and cost reservation. These are mocked/unit checks, not a claim that proposed SQL has run.

### Before connecting real research
1. Run proposed SQL on a disposable, isolated Postgres/Supabase-compatible database. Verify function signatures, permissions and `auth.role()` behavior with real service-role and client JWTs. Exercise concurrent claim/settle and all failure paths; do **not** use the original production database as a scratchpad.
2. Confirm owner authorization in the server route before constructing `SupabaseResearchStore`. Constructor arguments must not be copied from arbitrary client JSON.
3. Sync *deployed v5* investigation-worker source into version control without overwriting the live worker from the stale repository placeholder.
4. Implement processor adapters with verified source IDs/locators/hashes, PDF support and provenance checks. Evidence refs alone cannot prove a source is authentic.
5. Ensure scheduler invocation is independently authorized, service-secret-protected, and disabled by default. Record actual starts, stops, and costs.
6. Only after security review and isolated end-to-end tests ask for distinct authorization to deploy/enable. No production objective is enqueued by this PR.
