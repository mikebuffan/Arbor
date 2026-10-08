# ONE ARBOR — Group 12 replay repair on green five-lane integration

Date: 2026-10-07. **REVIEW ONLY / NO LIVE CUTOVER / NO OWNER SIGNOFF INFERRED.**

## Precise source lineage

- Existing composed parent: #349 at `23f77a99627956b35c36bd88e9eb3514a15cc994`, with green exact-head combined source CI #37703418175; this is **NOT** a deployed Preview.
- Isolated Grove Group 12 child: #355 at `19f687085877a13a37158b6f9924cc66d1689c5e`, five commits ahead, zero behind #349; source CI #37704154453 completed/success.
- This new *source-only* integration candidate inherits **the complete Group 12 child source** without changing #349, #355 or other owner heads. A distinct Vercel build exclusion is added before review changes.
- The original 17-file source fingerprint manifest is deliberately amended on **this** branch only to 19 pinned Git blobs, adding `apps/backend/lib/grove/privateTranscriptStore.ts` and `apps/backend/lib/grove/__tests__/privateTranscriptStore.test.ts`, plus the updated branch exclusion. The manifest records #355's exact owner head; `verify-one-arbor-composition.mjs` demands all 19 hashes, the seventh owner, and both G12 exclusion entries. This supersedes the *candidate-local* 17-file guard, not the original accepted #349 record.
- A separate combined workflow `one-arbor-group12-composed-acceptance.yml` exercises private Grove identity/transcripts/replay, parent Time Core/host/agency/memory/self-model/archive, full backend and control regression/build, backend TypeScript, local-LM fixture isolation and Flutter project-scope/privacy negatives. Check exact final commit; source green does not imply live green.

## Exact scope and non-collisions

Only F01–F09 are owned here. Source-level replay repair within canonical Grove transcript store:
1. `getCompleted` now rejects a provider row whose stored `request_id` does not equal the authenticated requested UUID, even if project/conversation and text appear to match.
2. `selectPrivateModelHistory` rejects duplicate completed request IDs and malformed/nonarray prior history.
3. Three negative synthetic cases are inherited from #355. No new transcript engine, scheduler, LM adapter or persistence schema.

The independently owned memory-pagination successor #352 is NOT bundled; its base was earlier #349 and its manifest collisions require Group 04's separate review. Groups 01/02 still own release grants, deployment identity, rollback and queued STOP acceptance; Group 13 owns Grove phone/voice/device; Group 05 owns broader restart acceptance. Do not silently cherry-pick sibling heads.

## Unchanged genuine live gates

- F01 owner identity: real account/invitation/bridge/project/grant proof at effective private URL, not only mock credentials.
- F02 Grove private API: preauthorized Preview project, exact commit, verified no-cron config, deployment identity/rollback, TLS/response verification and no public-realm leakage.
- F03 transcript persistence: approved hosted SQL/claim flags, native concurrent-lease and revocation checks, actual reload/readback; absent migration must HOLD.
- F04 real LM turn: protected receiver, exact foundation/tokenizer/adapter identities, bounded inference/model spend, owner consent, real quality receipt. v0.4 artifact recovery is **not** model acceptance.
- F05 recovered v0.4 SHA-256 already verified by #333; original foundation revision remains missing.
- F06 offline runtime source/CPU accepted; actual loaded target model/context/latency/RAM not proven.
- F07 corrective training not authorized, untouched holdouts preserved; no new checkpoint.
- F08 signed host transport and durable replay source tested; exactly-once *inference* is not established merely by exactly-once durable effect.
- F09 private Grove→LM→Layer→ARK remains bounded read-only, no auto execution, objective completion or work receipts. Human approval required before real hosted slice.

## Next permitted action

After exact-head source tests and separate owner review, hand off a **specific** Preview deployment request to Group 01/02: identify the target private Vercel project, reviewed commit, model runtime, authorizing owner, cost ceiling, enabled flags, supported undo plan, and explicit non-production scope. *No such release/model activation is performed in this source integration.*

The September 28 research task and queued ARK STOP canary stay untouched. No main merge, production deploy, private content ingestion, hosted grants, worker activation, model training/inference, transcript mutation or credential disclosure.

## History read / duplicate inference race (bounded follow-up)

A further real race was identified in the existing Grove code: after a worker has claimed a request and read `getCompleted` as absent, another lease holder can complete while the first worker is fetching recent history. That history would then include the same request ID, and the first worker previously sent it to the independent LM as a fresh turn. A fenced database write prevents conflicting *durable* transcript effects, but cannot undo the wasted underlying model computation.

The existing `privateConversationLoop.ts` now checks whether the bounded, validated completed-history list contains the current request ID. If it does, it **requires** a separate exact-ID `getCompleted` receipt, rechecks authorization before disclosure, and replays the canonical response without a model call. If the history-only claim is not independently confirmed, it HOLDs with `grove_private_request_in_progress`; it never treats history text alone as a receipt. Existing same-text, cross-scope, duplicate-history and final reauthorization gates remain intact.

Three synthetic negative tests were added to `privateTranscriptStore.test.ts`: completed-during-history canonical replay, uncorroborated history-only refusal, and malformed missing history fail-closed. The composite fingerprint gate now pins **20** source files including `privateConversationLoop.ts` (prior approved 19 hashes retained and reviewed test blob updated). No new generation engine, provider call, database table, data ingestion or worker. This **narrows**, but does **not eliminate**, the duplicate LM invocation window after an expired lease; exactly-once computation remains **NOT PROVEN**.

Acceptance for this addition is a **new exact-head** source-only CI run; earlier green workflows only certify their earlier heads. No hosted Grove pilot, migration, real model loading or production release is authorized.
