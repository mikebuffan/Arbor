# Research ↔ ARK / Arbor Layer compatibility contract — 2026-09-23

Purpose: define the research-side contract only. This does not modify Grove, ARK/Layer, cognitive assembly, workers, or production state.

## Verified neighboring seams inspected

- ARK/Layer draft #160 head `fc58351e9ae8416c3d28d3c398d4126387310bf0`: `readArkLayerContext` is explicitly **read-only**, owner/project scoped, optionally conversation scoped, selected attachment metadata only, and reports `liveExecutionVerified:false`. Selected files must belong to the current requested conversation.
- Cognitive assembly draft #191 head `4dd6871ad68f1ad335e533b18b2391f676813568`: Pattern Hop / learned-route output remains suggestions only, scoped by user/project, `grantsExecution:false`, and `independentCorroborationVerified:false`. Learning requires a separately host-reviewed outcome receipt.
- Grove backend #194 and phone #196 are a separate ownership lane. Research must not read Grove private transcripts, grants, owner invitations, UI state, or Grove credentials.

## Research-side handoff contract

Any future ARK→research start request must be host-authorized and must carry trusted fields derived from authenticated persistence, not model/user text:

- authenticated owner/user id
- project id
- research session id
- objective id / task id or immutable handoff reference
- authorization state/version
- bounded cost/work/deadline policy
- explicit source-access policy
- explicit privacy/release policy
- optional conversation id only when a reviewed integration requires it

Research must reject mismatched owner/project/session references before work claim.

Any research→ARK result must be a receipt, never free-form completion authority:

- session id
- unit id
- immutable/idempotency key
- receipt status
- evidence refs
- unresolved required work count
- cost charged
- checkpoint/failure reason where applicable
- provenance/version reference
- `liveWorkVerified` supplied only by a trusted host after persistence readback

A research receipt must not:
- grant execution to cognitive/Pattern Hop output
- turn repeated reporting into independent corroboration
- mark a research session `completed` merely because the queue is empty
- expose Grove transcript content
- treat a selected chat attachment as read evidence until original bytes are separately brokered and provenance-verified

## Checkpoint / restart contract

ARK may persist a research checkpoint reference, but recovery must reload authoritative research session/unit/receipt state from the research store. Pasted checkpoint text, model output, or Grove conversation history cannot recreate authorization, lease ownership, evidence verification, or completion.

STOP / revocation must remain authoritative at the research database boundary. Late worker results after STOP, expiry, deadline, pause/block, or authorization revocation must be rejected even if the cognitive layer still remembers the objective.

## Safe integration tests to add when branches are reconciled

1. Wrong owner/project/session handoff denied before research read/claim.
2. Conversation/attachment mismatch denied before original-byte broker.
3. Cognitive hop with strong score cannot authorize a research unit.
4. Research receipt with evidence refs can update ARK checkpoint metadata but cannot create an independent corroboration claim.
5. STOP/revocation after ARK handoff fences research settlement.
6. Restart reloads persisted research receipts rather than trusting conversational history.
7. No Grove transcript/private grant object appears in research adapter serialization.
8. No `completed` state without the existing independent evidence-backed completion verifier.

Status: **contract prepared; code integration remains owned by the integration thread and gated on branch reconciliation.**
