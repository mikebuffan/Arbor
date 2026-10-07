# One Arbor Canonical Source Freeze + Final Loss Audit — 2026-10-07

Status: DOCS-ONLY FREEZE / NO LIVE MUTATION

This document freezes the strongest current source picture. It is not a production
deployment manifest and does not authorize main merge, hosted migrations, grants,
worker activation, live authentication, corpus ingestion, or model inference.

## 1. Current source candidate

Canonical source candidate for this freeze:

- PR #305 — One Arbor successor: reconcile green ARK STOP/resume controls
- branch: `integration/one-arbor-low-conflict-plus-ark-20261006`
- exact head: `7ae62ef109f66d8300141739329764fdcbbcdffd`
- base: PR #302 @ `7723e513f5dfd6b571fc7b801aeb4fc54600a601`
- GitHub reports PR #305 draft + mergeable

PR #305 is the strongest current source candidate because it preserves the
independently green low-conflict staging base and adds the current accepted ARK
STOP/resume/control delta without broad stale-branch merges.

## 2. Exact-head acceptance for PR #305

### Focused ARK successor acceptance

GitHub Actions run: `37577812013` — SUCCESS

Proved on exact head:

- focused ARK durability: 18 files / 130 tests passed
- focused lint: passed
- STOP/resume migration smoke: passed
- stale-worker completion fencing after STOP: passed
- repeated STOP idempotency: passed
- blocked-objective resume: passed
- concurrent workers cannot claim the same task: passed
- ARK Environment status analysis: passed
- targeted Flutter ARK status tests: 18 passed
- full Flutter regression in this lane: 201 tests passed
- synthetic Grove debug APK: built successfully

### Full One Arbor + ARK acceptance

GitHub Actions run: `37577812019` — SUCCESS

Backend:

- accepted successor lane focused acceptance:
  - 18 files / 172 tests passed
- Annabelle + Felt-Life source acceptance:
  - 56 files / 105 tests passed
- Pattern Hop + Evidence Engine focused acceptance:
  - 28 files / 148 tests passed
- continuity + archive + Grove + ARK focused acceptance:
  - 20 files / 144 tests passed
- local-LM source-contract step: passed
- full backend regression:
  - 342 files passed
  - 1,880 tests passed
  - 2 skipped
- production backend build: passed
- standalone TypeScript: passed

Phone / Flutter:

- full Flutter analyze: passed
- full Flutter regression: 201 tests passed
- synthetic Grove APK: built successfully
- public-alpha configuration tests: 5 passed
- isolated public-alpha APK: built successfully

Native database acceptance:

- Grove disposable transcript schema: PASS
- Grove fenced retry / transcript durability: PASS
- Grove correction grant proposal: PASS
- Pattern Hop run-control SQL: PASS
- Grove ARK spine grant proposals: PASS
- all remain live-application HOLD unless separately authorized

Independent LM build readiness:

- exact `llama.cpp` source SHA used:
  `5ad1c5da0ad7f6176256b823925aad19134f0263`
- Windows x64 SSE2/no-AVX static runtime build: passed
- `llama-cli`, `llama-server`, and `llama-bench`: built and launched
- this proves runtime build readiness only; it does NOT promote an Arbor model

## 3. Additional migration compatibility evidence

A separate reconciliation verification branch was used only to test a stronger
migration-order case:

- verification head:
  `125ea3d92b2185f05488c8098fb47006e8b106be`
- GitHub Actions run:
  `37577818125` — SUCCESS

That run applied BOTH current ARK cancel/control migrations in timestamp order:

1. `20261006093000_ark_stop_and_resume_controls.sql`
2. `20261007005500_add_ark_cancel_objective.sql`

It verified:

- both cancel-function overloads coexist
- the blocked-objective resume function remains present
- service_role has execute authority
- anon/authenticated do not have execute authority
- full backend regression remained green
- TypeScript remained green
- production build remained green
- full Flutter regression remained green
- synthetic Grove APK built

This is supplemental compatibility evidence. PR #305 remains the canonical
source candidate for this freeze.

## 4. Loss audit

### Identity Assurance — PRESERVED

Source lane:
- PR #287 @ `9ffd6d4a3d68850eb87cd1e65c5bca928dcd3834`

Verification:
- child #292 green
- integrated through #302, inherited by #305
- #305 ARK delta does not touch Identity Assurance source files

State:
- SOURCE COMPLETE
- INTEGRATED
- VERIFIED
- NOT LIVE AUTHENTICATION

Hard boundary preserved:
prompt content / language style alone cannot grant sensitive authority.

### Capability Hypothesis — PRESERVED

Source lane:
- PR #288 @ `5e82ead12855971b1438a972c83dd4540783e0e7`

Verification:
- child #293 green
- integrated through #302, inherited by #305

State:
- SOURCE COMPLETE
- INTEGRATED
- VERIFIED
- HOSTED MIGRATION NOT APPLIED

Capability hypotheses remain metadata/evidence maturity, not runtime authority.

### Cognitive Access / Danelle-ese — PRESERVED

Source lane:
- PR #290 @ `09d182901b71028770bfe3ee935ccc7295988bfc`

Verification:
- child #295 green
- integrated through #302, inherited untouched by #305

State:
- SOURCE COMPLETE
- INTEGRATED
- VERIFIED
- LIVE ROUTING NOT ACTIVATED

Boundaries preserved:
- raw user wording remains canonical
- reconstruction remains interpretation
- accessibility does not authenticate identity
- protected literals / negation / STOP semantics remain guarded

### Contextual Reference / Short-Turn Resolution — PRESERVED

Source lane:
- PR #294 @ `da0657eaf5b41ebb50cdf6ec82ea6e81402ea052`

Verification:
- child #301 green
- integrated through #302, inherited untouched by #305

State:
- SOURCE COMPLETE
- INTEGRATED
- VERIFIED
- LIVE ROUTING NOT ACTIVATED

Ownership remains:
- #290 owns noisy-language recovery
- #294 owns referent/short-turn resolution
- neither owns durable memory or identity authentication

### FAFO Audio -> Evidence Engine — PRESERVED

Source:
- PR #289 audio provenance lane
- PR #297 Evidence Engine bridge @
  `53e5a13c62d303a4f1cae08c07a89dd1eb369ced`

Verification:
- dedicated bridge acceptance green
- integrated through #302
- #305 full acceptance includes Pattern Hop + Evidence Engine regression

State:
- SOURCE COMPLETE
- INTEGRATED
- VERIFIED
- REAL/LIVE AUDIO INGESTION NOT IMPLIED

Original audio remains controlling evidence.
Transcript passes do not multiply independent corroboration.

### Operational Receipt Envelope — PRESERVED

Source:
- PR #298 @ `f97d67358c62e8c9ad3834cbc7324dd1832b8302`

Verification:
- dedicated acceptance green
- integrated through #302, inherited by #305

State:
- SOURCE COMPLETE
- INTEGRATED
- VERIFIED

Receipt envelopes remain projections of owning domains, not a second mutable
truth store.

### Humor / Pragmatics — PRESERVED

Source:
- PR #300 @ `c8c5fe4f0b18c7e6b002085a647072fe39dac687`

Verification:
- dedicated acceptance green
- integrated through #302
- #305 full backend regression green

State:
- SOURCE COMPLETE
- INTEGRATED
- VERIFIED
- LIVE PROMPT WIRING NOT ACTIVATED

Humor remains optional, context-gated, and subordinate to clarity/safety.

### Pattern Hop / Evidence Engine / Roundabout — PRESERVED

Canonical source was already in the #286 lineage:
- PR #282 @ `a2060a522ffc29dbed9a7c33e8d1dbf7f4f3db6b`

#305 exact-head full acceptance explicitly ran Pattern Hop and Evidence Engine
focused acceptance:
- 28 files / 148 tests passed

State:
- SOURCE COMPLETE FOR CURRENT ACCEPTED SCOPE
- INTEGRATED
- VERIFIED

Preserved rules:
- provenance survives hops
- repeated reporting != independent corroboration
- association != conduct
- identities do not silently merge
- contradiction/uncertainty remain explicit
- Evidence Engine remains the evidence owner

### Annabelle — PRESERVED

Source lane:
- PR #283 @ `cd9f58db3e47c3a91ca8514a8f28d9d89b5a24fc`

Historical branch acceptance:
- Annabelle/Felt-Life focused: 51 files / 121 tests
- TypeScript/build green
- Flutter green
- remaining branch-level backend failure at that time was inherited ARK STOP,
  not Annabelle

Current #305 acceptance:
- Annabelle + Felt-Life: 56 files / 105 tests passed
- full backend regression green

State:
- SOURCE COMPLETE FOR CURRENT ACCEPTED SCOPE
- INTEGRATED
- VERIFIED
- LIVE/HUMAN GATES REMAIN

### Conversation continuity / correction / archive / agency — PRESERVED

#305 full acceptance explicitly includes continuity, archive, Grove, and ARK
focused acceptance:
- 20 files / 144 tests passed
- full backend regression green

Current #279 non-ARK agency/archive work is already represented in the canonical
lineage. Broad stale-branch reconciliation is no longer required.

State:
- SOURCE COMPLETE FOR CURRENT ACCEPTED SCOPE
- INTEGRATED
- VERIFIED

### Grove / phone host plumbing — PRESERVED

Current #277 useful source/evidence/proposal deltas were selectively represented
before #305 through #302.

Current file reconciliation shows the staging/candidate carries the meaningful
#277 readiness documents, grant proposals, and disposable acceptance fixture;
the remaining #277-only file is its lane-specific CI workflow.

#305 exact-head acceptance additionally proves:
- full Flutter: 201 tests
- Grove APK build
- Grove transcript/correction disposable DB acceptance
- Grove ARK grant proposal disposable DB acceptance
- Windows local runtime build

State:
- SOURCE/BUILD READY FOR CURRENT ACCEPTED SCOPE
- INTEGRATED
- VERIFIED
- MODEL SEMANTICS / LIVE HOST / PHYSICAL DEVICE NOT ACCEPTED

### ARK STOP / resume / owner control — PRESERVED AND RECONCILED

Source lane:
- PR #291 current accepted head:
  `ee71e456510ed4e329d7c30e0bfb22e576d8e327`

Reconciled successor:
- PR #305 @
  `7ae62ef109f66d8300141739329764fdcbbcdffd`

#305 preserves:
- durable STOP
- stale-worker fencing
- repeated STOP idempotency
- blocked-objective resume
- completed/cancelled resurrection protection
- scoped owner-control route
- separate MCP objective-control permission
- truthful terminal status projection
- duplicate-worker prevention
- task readback status flags from canonical base

State:
- SOURCE COMPLETE FOR CURRENT ACCEPTED SCOPE
- INTEGRATED
- VERIFIED
- CURRENT-HEAD HOSTED EXECUTION NOT LIVE VERIFIED

## 5. Canonical ownership audit

The current candidate preserves the ownership matrix:

- raw user message -> canonical chat/request source
- accessibility interpretation -> derived only
- contextual referent -> derived only
- current conversation goal -> runtime/continuity owner
- active correction -> correction resolution/persistence owner
- ARK objective/task/checkpoint -> ARK owner
- Evidence / source-family truth -> Evidence Engine owner
- Pattern Hop traversal -> Pattern Hop owner
- Annabelle editorial checkpoint -> Annabelle owner
- authorization -> product auth + scoped policy + applicable Identity Assurance
- operational receipt -> projection only
- Capability Hypothesis -> evidence/maturity metadata only

No accepted lane discovered in this audit has become a second canonical owner of
another domain's state.

## 6. Side-branch disposition

These classifications do NOT close or delete branches/PRs.

### PR #286
Green immutable recovery/comparison anchor.
Represented and superseded as the active candidate by #302 -> #305.

### PR #302
Green low-conflict staging base.
Fully represented in #305.
Retain as intermediate proof/recovery point.

### PRs #287 / #288 / #289 / #290 / #294 / #297 / #298 / #300
Accepted source lanes represented in #302 and therefore #305.
Retain as component evidence; no broad re-merge needed.

### PR #291
Current accepted ARK source lane represented/reconciled in #305.
Retain as component acceptance evidence.

### PR #277
No broad merge required.
Meaningful newer readiness evidence/proposals are represented.
Dedicated lane workflow remains historical lane verification only.

### PR #279
Non-ARK agency/archive deltas are represented.
Its older ARK-control/task-tool copies are superseded by #291/#305 where they
overlap.
Do not broad-merge #279 into the candidate.

### PR #282 / #283
Already represented in the canonical lineage.
#305 full acceptance proves Pattern Hop/Evidence and Annabelle did not regress.

### PR #296
Coordination ledger is superseded by this newer freeze ledger for current source
status. Keep as historical coordination evidence.

### PR #299
Architecture/simplification audit is represented in #302/#305 and remains the
reference for future cleanup decisions.

## 7. Legacy consolidation candidates — NOT BLOCKING FREEZE

Do not delete during this pass.

### Older 5-argument ARK cancel RPC

The repository contains both:
- newer 2-argument STOP RPC used by current #305 owner-control path
- older 5-argument scoped cancel RPC from the archive/agency lineage

They coexist as PostgreSQL overloads and supplemental ordered-migration testing
proved grant compatibility.

Future cleanup may consolidate/remove the legacy overload only after:
- hosted successor migration acceptance
- confirmed no active caller needs the legacy signature
- rollback/recovery considerations are recorded

This is cleanup, not a blocker for current source freeze.

## 8. Genuine remaining work

### LIVE / PROTECTED GATES

1. Deploy the exact accepted successor to the intended non-production hosted
   environment.
2. Review/apply only the accepted hosted migrations/grants with explicit
   authorization.
3. Grant the exact bounded ARK submit/control scopes required for the intended
   project.
4. Prove current-head live:
   - submit -> queued -> claimed/running -> completed -> verified -> durable readback
   - interruption -> checkpoint -> resume
   - active harmless lease -> STOP -> stale completion rejected
   - blocked authority -> explicit resume
   - retry/restart does not duplicate durable work
5. Keep high-consequence execution separately gated.
6. Live Identity Assurance / passkey / biometric enforcement remains unactivated
   unless separately reviewed and authorized.
7. Real/restricted corpus ingestion and publication remain separate authorization
   decisions, not requirements for source freeze.
8. Production/main crossing remains separate.

### GROVE / INDEPENDENT LM GATES

Current v0.4 semantic candidate is NOT promoted.

Remaining:
- targeted corrective training pass for demonstrated v0.4 failure classes
- fresh isolated holdout
- pin foundation revision for future candidates
- execute exact target-runtime tokenizer/model compatibility
- exact-current GGUF + selected Arbor adapter run with RAM/latency/context
  measurements
- durable receiver-side generation-result replay across crash/restart
- hosted Grove grants/migrations
- physical-phone acceptance
- live independent-model inference remains OFF until semantic acceptance

### ANNABELLE HUMAN / LIVE GATES

- validate exact canonical prose before mature Gold promotion
- collaborative Chapter Two final revision/lock before Chapter Three
- live authorized persistence/readback
- fresh-session continuation acceptance

### SOURCE ACTIVATION DECISIONS

These source contracts are integrated and verified but intentionally not live
activated by this freeze:
- Cognitive Access live routing
- Contextual Reference live routing
- Humor Pragmatics live prompt wiring
- Identity Assurance live authorization enforcement
- Capability Hypothesis hosted registry extension

Activation requires a separately reviewed integration decision; source freeze
does not silently turn experiments/contracts into runtime authority.

## 9. Final freeze judgment

For the current accepted source scope:

- core source convergence: COMPLETE
- low-conflict lane integration: COMPLETE
- ARK source reconciliation: COMPLETE
- stale Grove/archive broad-merge problem: RESOLVED
- Annabelle regression: PASS
- Pattern Hop/Evidence regression: PASS
- backend regression/build/typecheck: PASS
- Flutter/Grove/public-alpha build acceptance: PASS
- local Windows runtime build readiness: PASS
- disposable DB acceptance: PASS
- production/live acceptance: NOT CLAIMED

Recommended next phase:

**LIVE ACCEPTANCE + INDEPENDENT-LM SEMANTIC FINISH**, not another architecture
workstream.

Do not declare production completion until the live/protected/human gates above
are actually crossed.
