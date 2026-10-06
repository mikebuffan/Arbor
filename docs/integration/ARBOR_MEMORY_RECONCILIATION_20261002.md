# Memory reconciliation — October 2, 2026

This pass reconciles the runtime-memory behavior from draft #221 into the current #223 + #232 source candidate. It does not merge/deploy either draft and does not replace the durable memory architecture.

## Problem and change

Previously, an exact conversation with meaningful state returned immediately, ignoring corrections saved in other conversations. A new thread fell back to only the newest row, so multiple fresh empty threads could hide meaningful context. Copied correction snapshots could also inflate feedback counts when merged as new observations.

The existing #221 loader now retrieves up to 50 recent owner/project snapshots, merges corrections using the newest observed instant, and keeps a meaningful exact conversation's goal, channel, subsystem and turns intact. Hydration uses the maximum observed recurrence count rather than adding copied snapshots. The row and serialized state must agree on owner, project and conversation; mismatches reject the load.

An explicit `currentGoal: null` clears the prior goal; omission continues it. Source tests verify a completed cleared task remains cleared in a new session. Live observation merging and prompt correction prioritization now compare chronological instants rather than timezone-dependent string ordering.

The source integration preserves the current Time Core, embodied cognitive bridge, open-loop recovery and Annabelle repairs. It does not blindly replace prompt/buildPromptContext.ts from the older branch. The existing same-goal guard for tentative self-update strategies remains; distinguishing global behavioral strategies from task-specific strategies is a separate unresolved semantic decision.

## Verification

- 575 backend tests passed, zero failed (structured Vitest report).
- Added serialized-store restart simulations: independently constructed clients/sessions, cross-surface correction → host generation context, exact-thread unfinished objective preservation, copied-count stability, completed-task clearing, and foreign owner/project exclusion.
- Recovered #221 tests for cross-thread recall, meaningful-context fallback, row scope rejection, snapshot timestamp/count semantics, and explicit goal clearing.
- Added timezone-offset correction prioritization regression.
- Updated prompt freshness fixture to mock runtime storage explicitly instead of returning a project row as a conversation-state row. Real scope rejection remains tested separately.
- Runtime saves reject missing-table errors; the two session save callers await that rejection. Read-only compatibility remains.
- Backend production build passed using the documented CI placeholder environment and system TLS certificates.
- No tests use a real model or prove generated-response adherence. They prove persistence/loading/projection behavior against a serialized in-memory database contract.

## Remaining live gates and limits

1. Exact source must be reconciled with the active ARK working candidate before deployment. #221 contains other host/worker changes outside this memory scope; those are not marked integrated here.
2. Authenticated live write/readback, actual process restart and real-model behavior on intended surfaces remain open. A GitHub commit is not an ARK durable-memory write.
3. The recall window is bounded at 50 conversations. It is a runtime repair, not a guarantee that every lifetime correction is recalled. Older lasting corrections must use the existing durable memory promotion/retention path; inspect that path before adding any expansion.
4. Read compatibility can still return null when runtime storage is unavailable. Save callers were inspected: both session begin/update await saveRuntimeState, so missing-table writes now reject instead of returning apparently saved state. A regression covers that failure. Live acceptance must still establish storage availability and independently read back the write.
5. No provider credentials, deployments, migrations, protected writes, worker execution or changes to manuscript prose occurred.

## Reproducible source checks

From `apps/backend`:

```sh
OPENAI_API_KEY=unit-test-placeholder node ../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=/tmp/arbor-memory-tests.json
```

Use the repository's CI placeholder environment for `next build`; this environment additionally needs `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` to fetch Google Fonts. No font or dependency changes are required.
