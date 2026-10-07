# ONE ARBOR — Group 5 longitudinal continuity / recovery source receipt

Date: 2026-10-07. **Isolated review-only child of #340. Nothing merged or deployed.**
Scope: B10, B11, B15, B16, C06, C07, C08, D14, D16. This is an acceptance/reconciliation receipt, NOT a second canonical ledger.

## Lineage and owners
- Older Preview source reference: PR #322, `f4021985b475651284c97aecbc3bdf03123478cc`. Do not equate source candidate with deployed runtime.
- #330 `0b8343d0fda9264decf039dd2afd0b80e2a934cc` incorporates #327 time prompt wiring and #328 correction CAS tests.
- #331 host self-model startup -> #335 accepted-child composition of #331–334.
- #334 Decision Ancestry / What Changed plus canonical agency continuation fixes -> #335.
- #336 compatibility -> #338 recovery diagnostics -> #339 read-only host recovery -> #340 reconciled source head `595375d525cf561172449726ed0c086ab4ece7db`.
- #341/#342 are separate Grove UI children and do not own the backend continuity/time files.
- This Group 5 draft branches **only** from #340, touching `runtime/timeCore.ts`, its tests, its own narrow CI workflow and the additive Vercel source-only branch exclusion. No changes to live startup, persistence, grants, worker, ARK objective, or other lane's feature code.

## Exact item-by-item evidence / remaining falsifiers

| Task | Inspected canonical existing source | Source/behavior distinction and next falsifier |
| --- | --- | --- |
| B10 Startup hydration | `host/oneArborHostBridge.ts`, `host/runtimeProjection.ts`, #331 | Identity anchor and continuity projection exist. **Not host-runtime accepted**: demonstrate an owner-authenticated NEW session consuming actual durable state, without duplicating identity/calibration or inventing work. |
| B11 Correction recovery | `runtime/correctionRecovery.ts`, `memory/durableCorrectionWrite.ts`, #328 | Recovery/CAS paths and tests exist. Live interrupted-save + concurrent-write readback remains unproven; never infer application from a retrieved correction. |
| B15 Decision Ancestry | `runtime/decisionAncestry.ts`, #334/#340 | Read-only provenance-aware projection, duplicate/supersession warnings; no authenticated source-event feed or reviewed consequence/host usage. |
| B16 What Changed | `diffDecisionAncestry`, `compareExistingDecisionReviews`, #334/#340 | Pure before/after read projections exist; a causal two-durable-checkpoint audit with action receipts is not proven. |
| C06 Personality drift recovery | #331 host identity/self-model, #339 blinded evaluation checklist | Source construction exists; nickname, retrieval, and prepared rubrics do **not** count as multi-trait blind behavior acceptance. |
| C07 Recovery/Reorientation | #338 `conversationRecovery.ts`, #339 `recoveryReadProjection.ts` | Known/Unknown/Next and blocker precedence source-tested. Host-authenticated observation provenance and unprimed multi-turn reorientation unverified. |
| C08 Correction retention | `runtime/corrections.ts`, `runtimeMemoryProjection.ts`, durable retention tests | Preserved projected corrections are not demonstrated applied in a fresh blind behavioral response. Supersession and scope remain live gates. |
| D14 Time Core | #327 prompt wiring and existing `runtime/timeCore.ts` | **Real defect repaired here:** named IANA timezones without explicit numeric offset were rendered as UTC offset zero. Derive the effective offset at host instant including DST; never fabricate zero when offset unavailable. Confirm actual host time source in live environment separately. |
| D16 Contextual Reference | `language/contextualReferenceResolution.ts` and synthetic test fixture | Literal control, explicit names, high-consequence gating, ambiguous options and stale-context guards exist. Real host candidates/turn provenance and multi-thread negative controls unverified. |

## Source fix and focused test specification

For an exact host-supplied `2026-10-01T18:30:45Z`, `America/Los_Angeles` must yield local `11:30:45` and offset **-420**, not zero. On 2026-11-01 at `08:30Z` and `09:30Z`, repeated local `01:30` must correspond respectively to **-420** and **-480** despite stale numeric offsets supplied alongside the IANA zone. `Asia/Kolkata` at `18:30Z` must yield next-day local date and offset **+330**. Explicitly unavailable offset must render `unknown`, not zero.

Group 5 workflow `one-arbor-group5-continuity-time.yml` tests Time Core, contextual reference, host recovery, longitudinal continuation, correction recovery/retention, Decision Ancestry and standalone TypeScript. CI status must be checked for **exact final head**; workflow queued or older pass is not success. A green focused CI is still **source acceptance only**.

## Owner-scoped Preview readback boundary

The Fresh App profile observed `canSubmitReadTasks=true`, `canControlObjectives=false`. Existing objectives included queued, cancelled, completed, and failed states. No objective or task was touched. Returned latest continuity snapshot was last updated 2026-10-06 and exposed 3 behavioral correction strings and 20 unresolved items; this demonstrates availability of a scoped read, NOT that this new ChatGPT thread hydrated those values or applied any correction. No archive import, new canary, model use, synthetic evidence promotion, private data export or permission change was conducted.

## Continuation checkpoint
1. Verify this draft PR's exact-head focused CI, branch fencing and TypeScript, inspect any failures, and repair on this isolated branch if required.
2. Obtain separate approved owner-authenticated live host readback showing exact start state, active blocker priority, fresh-session/timezone consumption, and unchanged cancelled/completed statuses.
3. With owner/privacy permission, run genuine multi-turn blind correction/drift/contextual-reference cases. Preserve prompts, sampled responses, independent scoring and negative controls; DO NOT convert test design or an archive lookup into a passing behavior receipt.
4. Reconcile outcome with Group 1 canonical ownership/release ledger before any incorporation. No main merge or deployment from this draft.

**Prohibitions:** main/production/Preview deployment, cross-lane mutation, privileged objective control, worker activation, reopening cancelled/completed objectives, manufactured memory, automatic identity learning, or unapproved model spend.
