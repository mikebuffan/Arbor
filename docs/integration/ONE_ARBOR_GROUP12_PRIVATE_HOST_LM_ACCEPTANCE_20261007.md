# ONE ARBOR — Group 12 private Grove identity, transcript, independent LM and vertical-slice receipt

2026-10-07 · EXACTLY F01–F09 · SOURCE-ONLY DRAFT · NOT DEPLOYED OR MERGED

## Frozen input and collision ownership

- This isolated Group 12 candidate starts from accepted *source-review*, not deployed, five-lane PR #349 at `23f77a99627956b35c36bd88e9eb3514a15cc994`. Groups 01–02 own grants, deployed source parity and STOP controls; Group 05 owns general longitudinal continuity; Group 07/13 own voice/physical phone behavior. No changes to those sources or other PR heads.
- Grove's existing owner/proxy code is `lib/grove/privateReadBroker.ts`; LM host `privateLmHostTransport.ts`; complete-pair transcript `privateTranscriptStore.ts`; already-owned runner `privateConversationLoop.ts`; existing device retry store `grove_pending_turn_store.dart`. DO NOT create a second engine.
- Read-only Vercel inspection found `grove-private-api` project ID `prj_nw2X0SyLn4e8CXWZ83MEs4jwn1JN`. Latest deployment `dpl_CsXVRsF1S2z3nEnbRqGa3goY9rPR` is **CANCELED**, not a working Grove trial. The latest reported READY deployment is `dpl_HDvXn1GNcG49jst6cMuhUMToY461`, commit `6975021a027e69978741949fe67e47ef5466ccba` from September 30. Neither is this source or proof of a live Grove owner login; no aliases, grants, environment flags or credentials were changed.

## Nine-task evidence/status

| ID | Disposition | Verified source and remaining falsifier |
|---|---|---|
| F01 Grove owner identity | OWNED / SOURCE PRESENT | Existing Grove authentication, Firefly bridge, invitation + exact project/conversation read-broker; all live owner login and revoked-grant negative readback **NOT RUN**. |
| F02 Private API deployment | GATED | Dedicated private API and no-cron release config exist; actual approved hosted owner conversation on the reviewed commit, deployment manifest, explicit privacy/rollback release approval **NOT RUN**. |
| F03 Transcript persistence | OWNED / SOURCE TESTED | Scoped complete-pair transcript with PostgreSQL-minted claim/fenced completion and replay. New checks reject provider-returned mismatched request ID and duplicate completed history; actual exit/reopen private hosted transcript **NOT RUN**. |
| F04 Real LM conversation | GATED | Existing signed TLS private r3 receiver schema requires adapter v0.3 and does not claim execution. No accepted v0.4 real inference / source-to-model quality receipt; no model activation. |
| F05 v0.4 candidate recovery | OWNED / ARTIFACT PROVEN | Existing #333 recovered archive SHA-256 `d47bdccb36c536550c218f01cd02b5b612e4065168592db7d9b0cda51af0ffcb`. Historical status **TRAINED_CANDIDATE_NOT_ACCEPTED**, exact foundation revision unavailable; do not confuse artifact recovery with an accepted model. |
| F06 Foundation/runtime | OWNED / OFFLINE PROVEN | Qwen3-0.6B family, preserved no-AVX Windows build/launch checks, signed receiver and separate runtime manifest verification; executable foundation/tokenizer exact revision + real loaded-model context/latency/RAM **NOT RUN** in this lane. |
| F07 Corrective training | GATED | Prepared 48 synthetic examples, 24 untouched holdouts, explicit training/evaluation gates; no private training, paid compute, new weights/checkpoint/version, or inferred v0.5. |
| F08 Prompt/replay protection | OWNED / SOURCE-TESTED | Host HMAC/timestamp/nonce/redirect=error, strict ARK Layer schema; client UUID is retry label only, cannot authenticate. Stored logical effect is idempotent; exactly-once underlying model computation **NOT PROVEN**. New mismatched-ID and duplicate-history negative controls. |
| F09 Grove→LM→Layer→ARK | GATED | Existing read-only ARK/Layer context → private transport → optional fenced transcript path. `activeObjectiveHandoff=not_resolved`, no tool grants/receipts; separately approved real model/host + Group 02 STOP/worker controls required. End-to-end live vertical slice **NOT RUN**. |

## Source-only bounded repair

A provider query scoped to `grove_user_id` + project + conversation + request ID can still return a wrong row under a stale/broken adapter. `getCompleted` previously checked owner/project/conversation and request UUID shape but did **not** compare the returned `request_id` to the requested one; a same-text wrong row could be replayed under the wrong retry ID. It now fails closed with `grove_transcript_request_conflict`.

`selectPrivateModelHistory` now rejects duplicate completed request IDs instead of counting one stored exchange twice, and rejects nonarray histories. These checks never rewrite transcript rows, trigger model calls, authorize an owner, alter durable state or introduce a second storage path. Three new source-level synthetic cases verify incorrect-ID provider output, duplicate prior history, and malformed input.

Exact private-context identities and real response receipts are required for any later live acceptance. Signed receiver/LM output remains **unverified model prose**, never an ARK execution result. Do not elevate a CI-only compiled backend to an accepted private host.

## Acceptance and protected next action

1. Run `one-arbor-group12-private-host.yml` on the **exact reviewed child head**; record workflow/job state, focused negatives, TypeScript, full backend and CI-only build. Source tests are not a hosted acceptance substitute.
2. Next protected decision belongs to Groups 01–02: select/approve exact Preview commit and owner-scoped access; validate dedicated no-cron config, rollback, hosted Grove migration + grants, and actual runtime manifest. Avoid using stale September alias/source as a passing test.
3. After a separate approved model-runtime and pilot-cost decision, test one benign synthetic private turn, exact UUID claim/persistence/readback, simultaneous same-ID request collision, revocation before disclosure, failed save recovery, restart, and LM→Layer→ARK read-only snapshot; require zero unauthorized actions and no false completion claims.
4. Group 13 owns signed APK/physical phone/voice tests; keep the existing public Firefly and private Grove realms separate. No archive import or new worker from this lane.

No main merge, production alias, hosted SQL/grant write, private transcript ingestion, worker activation, paid model inference/training, export publication or September 28 task modification.
