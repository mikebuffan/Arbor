# One Arbor Workstream Ledger — 2026-10-06 / 2026-10-07 UTC snapshot

This is a coordination snapshot, not a deployment manifest.

## Stable anchor

| Lane | PR | Exact head | State | Proof / blocker | Safe next action |
|---|---:|---|---|---|---|
| Pre-Vercel One Arbor | #286 | `65be4dc3ac59997d6bb0ee800648293b45932b6e` | **GREEN CORE** | Canonical exact-head acceptance SUCCESS; continuity torture SUCCESS | Keep immutable as comparison/recovery anchor. Build successor from this head, not from stale side-lane bases. |

## Active / recent lanes

| Lane | PR | Exact head at snapshot | State | What it owns | Proof / blocker | Safe next action |
|---|---:|---|---|---|---|---|
| Identity Assurance | #287 | `9ffd6d4a3d68850eb87cd1e65c5bca928dcd3834` | **SAFE SOURCE WORK** | trust states, authorization boundary, provenance, behavioral sequence recognition, restricted disclosure, step-up contracts | 14 focused tests passed on verification child; first TypeScript run exposed a real `restricted` union typing hole, now fixed in source and verification branch | Let #292 rerun; do not activate live auth/biometrics |
| Identity verification child | #292 | `dd3bd0c656ff7800dc92f6f57e81820011a8fb9d` | **MOVING / VERIFYING** | focused CI only | rerun expected after source type fix | Require focused tests + TypeScript + production build green |
| Capability Hypothesis layer | #288 | `5e82ead12855971b1438a972c83dd4540783e0e7` | **SAFE SOURCE WORK** | lifecycle/evidence ladder, shared primitives, future hypotheses, source-only Vault extension proposal | mergeable; dedicated acceptance child #293 running | Keep hosted migration unapplied; require child CI green |
| Capability verification child | #293 | `be82a3ffe17a7d7223702afaa45a67ce6168f09a` | **MOVING / VERIFYING** | focused CI only | acceptance run in progress at snapshot | Wait for result; repair source only if CI finds a real defect |
| FAFO audio evidence | #289 | `b71289870a66dd1a986a6a1081318d92c2a940d4` | **GREEN SOURCE LANE** | provenance-safe audio/transcript evidence representation | dedicated FAFO audio evidence provenance acceptance SUCCESS | Review seam into existing Evidence Engine; do not build a second evidence system |
| Cognitive-access / Danelle-ese | #290 | `09d182901b71028770bfe3ee935ccc7295988bfc` | **SAFE SOURCE WORK** | raw-preserving intent recovery, ambiguity, protected literals, negation/STOP, speech-to-text fixtures | source lane expanded; dedicated child #295 running | Require child CI green; no real-user profiling/authentication |
| Cognitive-access verification child | #295 | `7504725b15b768a0c3d1e8b97ff25898cb62002e` | **MOVING / VERIFYING** | focused CI only | acceptance run in progress at snapshot | Wait for result; repair only demonstrated defects |
| ARK offline STOP/resume | #291 | `3d096f8027ab507807a670d2e09841c005016d25` | **MOVING** | explicit STOP, blocked-resume controls, offline acceptance | worker was still committing during this snapshot; no stable verification result yet | Do not reconcile until head stops moving |
| Grove / independent LM / phone | #277 | `0fe8bfc73251527021d633043d9a35de50f45cd5` | **SOURCE-STRONG / STALE-BASE CI RED** | Grove private host, LM transport/readiness, phone continuity, v0.4 semantic evidence | focused Grove suite: 236 passed + 1 skipped; local-LM prep passed; overall build red on inherited stale research parser contract | Reconcile lane-specific deltas onto #286; do not patch stale shared research files in place |
| ARK / agency / archive | #279 | `5329ab7c3b4e85c6b4adaade6825cb87050d799d` | **SOURCE-STRONG / STALE-BASE CI RED** | agency continuation/restart/idempotency, archive cursor/checkpoint, durable STOP/readback | ARK STOP migration and phone continuity jobs passed; backend job red on stale cross-lane research/type drift plus older test signatures | Reconcile lane-specific deltas onto #286; do not use its stale shared research files as canonical |
| Pattern Hop / Evidence seam | #282 | `a2060a522ffc29dbed9a7c33e8d1dbf7f4f3db6b` | **GREEN / ALREADY IN ANCHOR LINEAGE** | Evidence Engine / Roundabout / ARK seam | canonical exact-head acceptance SUCCESS | Treat #286 copy as canonical unless a newer Pattern Hop source lane appears |
| Annabelle finish | #283 | `cd9f58db3e47c3a91ca8514a8f28d9d89b5a24fc` | **SOURCE COMPLETE / HUMAN-LIVE GATES** | editorial continuity, source binding, Felt-Life/voice/character continuity, auto-resume | no new current-head workflow in this snapshot; already represented in pre-Vercel integration lineage | Preserve source; remaining work is live persistence/fresh-session and human prose validation |

## Shared drift diagnosis

The current red CI on #277 and #279 should **not** be treated as evidence that their Grove/ARK lane-specific work failed.

A direct source comparison shows:

- #277 / #279 have an older `localPdfParser.ts` that:
  - does **not** export `PopplerRunner`
  - only accepts one argument in `extractLocalPublicPdf`
  - only reports `poppler-local-unreviewed`
- their `isolatedPdfParser.ts` already expects the newer contract:
  - imports `PopplerRunner`
  - passes `{ runPoppler: runner }`
- green #286 already contains the reconciled newer `localPdfParser.ts` contract:
  - exports `PopplerRunner`
  - accepts optional `runPoppler`
  - preserves isolated parser status
  - handles isolated sandbox failures

Therefore the correct repair is **integration from green #286 plus lane-specific deltas**, not repeated local patches to every stale branch.

Other #279 backend errors also show stale test/type signatures from research and agency code. These should be reconciled at the successor integration head rather than normalized by weakening types.

## Overlap / conflict map

### Low-conflict candidates
- #287 Identity Assurance
- #288 Capability Hypothesis layer
- #289 FAFO audio evidence
- #290 Cognitive-access language

These mostly add isolated files/modules and are suitable for selective reconciliation after their own acceptance passes.

### Moderate overlap
- #287 Identity Assurance <-> #290 Cognitive Access
  - may share observations later
  - MUST keep conclusions separate
  - accessibility interpretation cannot authenticate identity

- #288 Capability Hypothesis <-> every other lane
  - registry/documentation relationship only
  - must not become runtime authority or a mandatory build queue

- #289 FAFO audio <-> #282 Evidence Engine
  - audio should enter the existing provenance/evidence graph
  - do not create a separate audio evidence engine

### High integration risk
- #277 Grove / LM / phone
- #279 ARK / agency / archive
- #291 ARK offline finish

These touch shared runtime/agency/ARK paths and must be reconciled by exact deltas onto #286 after moving heads stabilize.

## Proposed successor integration order

Do **not** execute until moving heads stabilize.

1. Start successor branch from exact green #286 head.
2. Reconcile accepted isolated lanes first:
   - #287 after #292 green
   - #288 after #293 green
   - #290 after #295 green
   - #289 (already dedicated-green)
3. Reconcile latest ARK lane:
   - prefer newest non-duplicative #291 controls over older overlapping copies
   - selectively carry still-needed #279 archive/agency deltas
4. Reconcile #277 Grove/LM/phone lane-specific deltas while preserving #286 canonical shared research code.
5. Re-run Pattern Hop/Evidence and Annabelle focused acceptance to prove no regression.
6. Run full exact-head:
   - focused lane suites
   - full backend regression
   - TypeScript
   - production backend build
   - continuity torture
   - native disposable DB checks
   - phone/Flutter acceptance where relevant
7. Freeze one exact successor SHA.
8. Only after that consider Vercel/live gates.

## Protected / live gates still outside this ledger

- main merge
- production deployment
- hosted migrations/grants
- real ARK submit -> worker -> durable result -> readback
- live biometric/passkey/identity enforcement
- physical phone acceptance
- live independent-model semantic acceptance
- live archive/backfill import
- Annabelle fresh-session persistence/readback
- human prose/Gold validation

## Rule

A red stale side-branch build is not allowed to overwrite stronger exact-head evidence from the green canonical anchor.

A green focused lane is not allowed to claim the entire system is green.

Reconcile first. Then test the exact combined head.
