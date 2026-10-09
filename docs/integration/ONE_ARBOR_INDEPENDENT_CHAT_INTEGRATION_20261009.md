# Independent chat source integration — 2026-10-09

This is a protected, source-only combination of **two distinct already-verified lanes**. It is not a release or actual live-model independence test.

## Exact source ownership
- Base: PR #384, exact head `b74e8e8b5bc9d8a032ce42799441a73032c19ff6`, already verified at GitHub Actions run 37888333311. Preserve every newer source file and the 173 SHA-pinned source entries, including discovery, Firefly record-consent and prior independent engine protections.
- Donor: PR #385, exact head `244df0e73f61f61b7d02c1542264645700e837b3`, verified at run 37888322808. The base retains the original `apps/backend/lib/arbor/agency/openaiAgent.ts` source and has neither the `providerCompletionBoundary.test.ts` nor scoped donor receipt; therefore import those **three exact Git blobs** without altering donor or base branches.

## One bounded composition
The actual chat route uses `runOpenAIAgencyAgent`. The donor guards explicit noncompleted provider responses, malformed output and completed-but-blank assistant turns from being counted as success or executing invalid tool calls. The existing call-path tests cover the negative conditions and the valid positive path. Preserve all earlier independence behavior, STOP/authorization gates, no-repeat prompt controls, restart integrity, and negative-proof completion evidence in the base.

Union the **existing** independent and 15-lane workflow push triggers plus focused provider completion test; preserve all old jobs and checks. Add the donor and new integration branch to the existing Vercel source-only ignore list **before publication**, without affecting main/production. Extend the existing SHA verifier manifest with exact imported donor blobs and the composed changes.

## Acceptance
Require exact-head independent+15-lane CI success and SHA readback. No model calls/credits, deployment, host alias, worker, API keys, personal data, user grants, merges, main writes, or new engine. Do not claim this as a hosted feature or real independent judgment score.

## Additional same-branch bounded-runtime guard

The real chat loop's optional `maxRounds` originally accepted `Infinity`, `NaN`, zero, negative, fractional or arbitrarily large values. A malformed bound could allow effectively unlimited model calls, while zero could still start an unnecessary model request. The integrated source now accepts only integers 1–128 (default 48 unchanged) and rejects malformed limits **before requesting a model response or executing any tool**. Eight additional offline test cases assert bad limits make no model/tool calls and that a valid single-round response still completes. This is a call-round cap, not a time-based or paid-model spending authorization. A final exact-head CI re-run is required.

## Atomic tool-call validation (follow-on within the same integration review)

The chat agent previously trusted the array shape of `type=function_call` objects and parsed/executed each call sequentially. A malformed, unknown or duplicate-ID *later* call could throw **after an earlier eligible action already executed**, leaving ambiguous partial effects. The source now validates every tool-call ID, registered name and JSON-object arguments **before the first action**, and checkpoints without dispatch on any invalid entry. It caps a single provider batch to 24 calls. Existing risk-boundary checks and normal tool execution are preserved; no automatic retry of uncertain writes. Seven additional synthetic test cases verify bad JSON, duplicate IDs, unknown tools, missing identifiers, nonobject arguments and oversized batches, plus a valid two-read batch. This is local source safety, not authorization or real-model acceptance. Final exact-head CI must pass.
