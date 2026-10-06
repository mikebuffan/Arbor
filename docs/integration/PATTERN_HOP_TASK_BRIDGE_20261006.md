# Pattern Hop task bridge — 2026-10-06

A requested historical Pattern Hop pass now has a source-level MCP path into the existing ARK agency queue. Previously the worker registered `arbor_pattern_hop_research`, but the MCP submission surface exposed only the two read capabilities. This change adds a separate submission tool; it does not replace the memory work or introduce another worker.

## Connected source path

`submit_ark_pattern_hop_pass` authenticates the current user, checks the explicit client/project Pattern Hop grant and owned project, and enqueues one `arbor.agency-tool` step with the existing `enqueueArkAgencyToolPlan`. The existing worker invokes the existing Pattern Hop runner. The existing task-result tool reads the queue result.

The tool is absent unless both `ARBOR_ENABLE_ARK_MCP_SUBMISSION=true` and `ARBOR_ENABLE_ARK_MCP_PATTERN_HOP=true`. The application permission is `ark.submit.pattern_hop`, obtained from fresh server-owned `app_metadata.arbor_ark_mcp` for the validated client, alongside the owned project IDs. A read-task grant does not authorize research writes.

Each pass allows 1–8 hops and depth 1–3. The existing worker's 20-second cycle budget is checked between tasks; it is not a cancellation deadline within a retrieval call. Arbitrary capabilities, user IDs, plans and extra arguments are rejected. This is historical memory/timeline research, not public-document ingestion.

Reuse `requestId` after uncertain submission or readback. It fixes the existing queue plan/idempotency key; the existing enqueue RPC detects changed payloads. For another pass, use a new request ID with the result's run ID and unchanged seed/depth. Both the MCP bridge and runner reject resume inputs that would alter saved traversal. The checkpoint repair on the parent branch preserves source/edge provenance before advancing the frontier.

A submission receipt proves only queue submission. The worker marks successful output as a `bounded_historical_research_pass`; `traversalFinished=false` means the run remains active. A blocked result remains blocked on both initial execution and idempotent replay. Malformed research receipts fail without retry. An unfinished side-effect claim remains blocked for recovery.

## Existing companion engines

Roundabout already consumes the cognitive assembly, associative pathways and retrieval rerouting. This change ensures a contradictory seed triggers its review/hold behavior even when no subsequent hop contains the conflict. The preview still grants no execution and applies no learning.

The existing cognitive snapshot/session port and decision/consequence learning path remain the place for scoped persistence and independently reviewed outcomes. They are not automatically updated by a research pass. The Evidence engine's external-document adapters and research stack retain their own gates; this bridge does not establish those integrations.

## Validation and remaining live proof

All 732 backend tests pass; backend TypeScript checking and `git diff --check` pass. New checks cover grants, bounded input, ownership, stable retry keys, resumed run ownership and unchanged input, blocked result replay, malformed receipts, and seed contradiction handling. Queue/executor boundary tests use mocks; they do not prove live database, OAuth client or worker availability.

No live flags, grants, migrations, deployments or schedules were changed. A live proof must use the actual intended owned project and validated client: discover the bounded submission tool, submit a pass, observe worker progress, read its result/provenance, and continue the same run without losing the trail. Claim the connection operational only after that proof. Review this branch against `fix/pattern-hop-resume-20261005`; its parent inherits the larger combined candidate and is not an isolated main-branch patch.
