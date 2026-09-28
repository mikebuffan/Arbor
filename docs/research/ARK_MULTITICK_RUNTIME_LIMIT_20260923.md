# Research multi-tick ARK budget finding — shared ARK integration gate

Read-only audit of **actual ARK Preview** `ark_claim_next_task` (2026-09-23), not an assumption from mock tests.

## Concrete limit

`ark_claim_next_task` selects `status in ('queued','checkpointed')` only if `attempt_count < max_attempts`, and increments `attempt_count` **on every claim, including successful resumptions after checkpoints**. The default `max_attempts` is 3, while research `research.session.tick` explicitly checkpoints after each successfully persisted work unit.

Consequently one default ARK research task can run at most **three ticks**. Its fourth tick is skipped even if the research session has 4+ remaining source units and 50 minutes left. The synthetic two-unit test does not prove sustained unattended batches. Do not describe the architecture as suitable for the entire file corpus until this is addressed.

## Additional global-sweep caveat

This same function updates expired leases for **every** `ark_tasks` row and potentially fails unrelated objectives, regardless of `p_only_objective_id`. The first one-shot Preview canary now demands exactly one task in the entire dedicated Preview DB before touching it. Do NOT reuse this one-shot CLI in a shared production/Firefly database.

## Shared ARK owner decision before continuous run

Keep this research branch away from existing core ARK SQL until the shared ARK owner reviews the **smallest** compatible change:

- Fence expired-lease cleanup by the requested objective/project or use a dedicated worker-scoped claim RPC. Preserve dead-lease/retry recovery across projects through a separately governed sweep, rather than silently making an owner-scoped selector perform global maintenance.
- Distinguish **consecutive unsuccessful attempts** from successful checkpoint progress. Either (a) a reviewed, research-kind-scoped checkpoint reset after a *persisted* research receipt, keeping `checkpoint_sequence` and events monotonic; (b) an explicit continuation-task chain with one ARK task per bounded unit, each with its own max attempts; or (c) another narrow shared-owner implementation. Do **not** simply raise `max_attempts` to a huge value or remove a failure budget.
- Preserve STOP/revocation, lease fencing, idempotency, deadline and objective/project scope. Exercise 4+ consecutive successful units, injected failure, restart and post-STOP no-settle in real disposable PostgreSQL, not only a fake store.
- A research-session max window of one hour is intentional: a long multi-hour investigation is a succession of separately authorized bounded sessions, NOT one unbounded session or an extension of the authorization window.
- Only enable a real recurring host runner after exact-head source tests, live one-shot canary, approved research-store SQL/source privacy and a green multi-tick persistence test. A GitHub Actions push workflow is CI, **not** a scheduled research worker.

**Current target:** first approved 1–3 original public DOJ documents after the Preview canary and durable original-byte/page evidence-store adapter; this limited pilot need not wait for unlimited multi-hour processing. No source processing or production changes performed by this finding.
