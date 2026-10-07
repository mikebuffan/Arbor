# One Arbor Duplication / Simplification Audit — 2026-10-06

Scope: source-only architecture review on the green pre-Vercel anchor #286.

This audit identifies:
- real duplication risks
- lookalikes that should NOT be merged
- stale branch copies that should not become canonical again
- future deletion / consolidation candidates

No code is deleted by this lane.

## Ground rule

Do not simplify by collapsing distinct authorities into one object.

Prefer:
- one canonical owner of durable truth
- narrow projections/adapters
- explicit scope boundaries
- exact provenance
- fewer independently mutable copies

Avoid:
- parallel engines for the same state
- two stores claiming to own the same fact
- helper layers that silently become new authorities

## 1. Functional-system metaphors are NOT separate engines

apps/backend/lib/arbor/body/functionalSystems.ts already states that the
body-system names are organizational metaphors mapped to existing runtime code.

Examples:
- nervous -> prompt/runtime/agency/continuity
- digestive -> memory/evidence pipelines
- muscular -> agency/tool execution
- immune -> auth/safety/identity guards
- skeletal -> behavior/self-model/carrier invariants

Decision: KEEP the map as a documentation / projection layer.

Do not build:
- a second nervous-system runtime
- a second digestive memory store
- a second immune authorization engine

Simplification candidate:
Future architecture docs should point to this map instead of introducing new
organ modules for already-owned behavior.

## 2. Capability registries: same noun, different job

There are at least two legitimate capability concepts:

1. apps/arbor-control-backend/src/capabilities.ts
   - executable capability registry
   - owns callable functions, parameters, execution, risk

2. Firefly arbor_capability_registry
   - Knowledge Vault self-inventory
   - describes what Arbor can do, prerequisites, boundaries, verification state

These are NOT the same source of truth.

Decision: DO NOT merge them into one mutable registry.

Risk:
The shared word capability can make future code assume Vault metadata grants
execution authority.

Simplification candidate:
Name the roles explicitly in docs / types:
- execution capability
- capability self-inventory

Any future projection from executable tools into the Vault must remain one-way
and evidence-backed.

## 3. Receipts / audit events / traces

Existing receipt-like state includes:
- ARK events
- ARK checkpoints
- ARK completion evidence
- agency completion receipts
- decision_outcomes
- trace_logs
- Arbor control-backend ArborAuditEvent
- research evidence/provenance
- correction persistence / supersession
- Environment checkpoint/completion receipt projections

PR #298 introduces only a common source-level envelope.

Real duplication risk:
Creating a NEW persistent operational_receipts table before deciding which
existing event stream can carry the common envelope.

Decision: NO NEW PERSISTENCE YET.

Simplification candidate:
Use the operational envelope as a projection format first.

Later choose one of:
- adapter from existing canonical domain records at read time
- one existing durable audit/event stream with explicit domain refs

Do not make the envelope another source of truth.

## 4. Corrections: active truth vs persistence

Current runtime has ArborCorrection in runtime state.
Correction promotion / memory machinery can make corrections durable.

These layers are related but should not independently decide contradictory
current behavior.

Canonical ownership proposal:
- correction validity / current precedence: runtime correction machinery
- durability: persistence/memory layer
- behavior use: behavior projection
- historical evidence: memory / audit provenance

Real duplication risk:
A durable memory copy and runtime copy drifting into two different active rules.

Simplification candidate:
Future correction readback should reconstruct one canonical current correction
set, then project it outward.

Do not keep two independently editable current-correction stores.

## 5. Continuity state: several horizons, not one blob

Current continuity-related state includes:
- runtime current goal / last meaningful turns
- conversation continuity state
- agency checkpoints
- ARK checkpoints
- archive cursor / import checkpoint
- Annabelle workspace/editorial checkpoint state
- Grove pending/runtime turn state

These should NOT all become one mega-state record.

Correct separation:
- conversational continuity: interaction horizon
- agency/ARK checkpoint: execution horizon
- archive cursor: source-consumption horizon
- Annabelle checkpoint: editorial horizon
- Grove pending state: host/transport horizon

Real duplication risk:
Multiple layers separately persisting the same currentGoal,
unresolvedWork, or correction set.

Simplification candidate:
Define one scope/ownership matrix:
field -> canonical owner -> projections -> recovery source.

Especially audit:
- current goal
- unresolved work
- active corrections
- last verified action

## 6. Pattern Hop: core traversal vs domain adapters

Pattern Hop exists across memory/research-facing files.

The intended architecture is:
- shared bounded traversal / provenance primitives
- research-specific candidate preparation
- domain lenses
- Evidence Engine integration
- Roundabout / ARK handoff

Decision: DO NOT build another Pattern Hop engine.

Real duplication risk:
Domain-specific hop engines independently reimplementing:
- visited-set handling
- branch limits
- evidence dedupe
- provenance
- stop/restart control

Simplification candidate:
Keep domain logic as adapters/lenses feeding the shared traversal contracts.

## 7. Identity Assurance vs cognitive access

PR #287 Identity Assurance asks:
How much authority can this session receive?

PR #290 cognitive access asks:
What did the user probably mean?

PR #294 contextual reference asks:
What does this underspecified reference point to?

These may reuse:
- observation
- comparison
- uncertainty
- provenance
- protected literal handling

They MUST NOT share conclusions.

Decision: KEEP THREE CONCERNS SEPARATE:
- accessibility interpretation
- contextual/reference resolution
- identity/authorization

Real duplication risk:
#290 and #294 both becoming general intent resolvers.

Simplification candidate:
Assign ownership:
- #290: noisy/degraded language recovery
- #294: short-turn and referential resolution
- shared future ambiguity contract: confidence, alternatives, protected literals,
  clarification threshold

No second identity score in either language module.

## 8. Behavior projection vs self-model projection

Backend behavior projection:
- assembles core interaction behavior
- corrections
- continuity material
- mode-specific rules

Control-backend self-model projection:
- projects evidence-backed decision-style patterns
- distinguishes preserved vs held hypotheses

These are related but not duplicates.

Correct relationship:
self-model evidence -> bounded behavior context/projection

Real duplication risk:
The same durable preference or rule becoming independently editable in:
- self-model ledger
- behavior projection constants
- correction state
- conversation calibration

Simplification candidate:
Classify each behavior rule as one of:
- invariant
- self-model pattern
- user correction
- conversation calibration
- task/mode overlay

Then ensure exactly one canonical owner for each class.

## 9. Audit sink vs operational receipts

ArborAuditEvent is a chronological diagnostic event stream.
Operational receipts are evidence-backed state/result claims.

Decision: DO NOT replace one with the other.

Possible future composition:
An operational receipt may emit a sanitized audit event REF.
The audit event should not itself become proof that the operation succeeded.

This preserves:
event happened != verified result happened.

## 10. Research evidence vs audio evidence

PR #289 adds provenance-bound audio/transcript evidence.
PR #297 bridges it into the existing Claim <-> Evidence <-> Counterevidence graph.

Decision:
Audio is a SOURCE TYPE, not a second Evidence Engine.

Invariant:
Two transcripts of the same original recording remain one source family.

Future deletion candidate:
Any standalone audio conclusion/scoring layer that duplicates Evidence Engine
claim/counterevidence logic should be rejected rather than merged.

## 11. Stale side-branch shared code

#277 and #279 contain older shared research/parser copies than green #286.

Their lane-specific work may be useful, but their stale shared files are not.

Decision:
During successor integration:
- start from #286
- bring lane-specific deltas forward
- DO NOT wholesale merge stale shared research/runtime copies backward over #286

Future deletion/closure candidates:
After successor reconciliation and proof:
- stale integration branches that no longer contain unique deltas
- verification-only child PRs whose receipts have been captured
- superseded compatibility workflows

Do not close/delete until unique commits are accounted for.

## 12. Verification child workflows

Current temporary verification children include:
- #292 Identity Assurance acceptance
- #293 Capability Hypothesis acceptance
- #295 Cognitive Access acceptance

They are useful because their source PRs lacked dedicated CI.

Decision:
These are temporary proof scaffolds.

Simplification candidate:
Before final convergence:
- either move the relevant focused checks into one stable successor CI workflow
- or retain only genuinely reusable lane-specific workflows

Do not accumulate one permanent workflow per historical feature branch.

## 13. Vault / self-model / capability hypothesis

PR #288 extends the concept of capability maturity.

Decision:
The hypothesis layer should be metadata about possibility/evidence, not a new
task scheduler or runtime planner.

Real duplication risk:
Turning the capability hypothesis catalog into:
- an execution queue
- a second roadmap system
- a second self-model truth store

Simplification candidate:
Vault remains the durable knowledge/view layer.
ARK/agency remain work execution.
Self-model remains identity/decision-style evidence.
The hypothesis catalog links them without owning them.

## 14. Annabelle

Annabelle has dedicated editorial/workspace continuity but shares One Arbor:
- identity
- corrections
- evidence standards
- continuity principles

Decision:
Annabelle is a narrative/editing authority overlay, not a second Arbor identity.

Real duplication risk:
Copying shared One Arbor identity/correction rules into Annabelle-specific
durable state where they can drift independently.

Simplification candidate:
Project shared behavior/corrections into Annabelle; persist only
Annabelle-specific editorial/canon/workspace state there.

## 15. Grove vs public Arbor app

Grove private host and the public Arbor mental-health app are distinct products.

They may share:
- One Arbor behavior
- continuity primitives
- auth/provenance conventions
- selected backend infrastructure

They must not silently share:
- private Grove owner grants
- product-specific user data
- private host permissions

Decision:
KEEP product boundaries explicit.

Shared library != shared authorization.

# Candidate deletion / consolidation queue

DO NOT execute yet.

## High confidence after successor integration
1. Close verification-only child PRs after proof is incorporated.
2. Retire stale branch-specific CI workflows no longer used.
3. Mark older One Arbor integration candidates superseded after one successor
   exact head is frozen and green.
4. Remove stale duplicated shared files only through normal branch closure /
   reconciliation, not ad hoc source deletion.

## Needs ownership audit first
5. correction persistence projections
6. current-goal / unresolved-work duplicate persistence
7. self-model vs behavior-rule duplicate constants
8. trace/audit/receipt persistence overlap
9. capability naming / projection boundaries

## Do NOT consolidate
10. executable capability registry + Vault capability self-inventory
11. audit event + verified operational receipt
12. cognitive access + identity authentication
13. archive cursor + agency/ARK checkpoint
14. Grove private authorization + public-app authorization
15. Annabelle editorial state + One Arbor identity state

# Proposed simplification order

1. Freeze successor One Arbor head.
2. Produce source-of-truth ownership matrix.
3. Move temporary verification checks into stable CI.
4. Close/archive superseded branches only after unique-delta accounting.
5. Reconcile correction/current-goal/unresolved-work ownership.
6. Decide receipt projection persistence strategy.
7. Delete only after exact regression + restart/continuity acceptance.

# Bottom line

The project does have cleanup opportunities, but the biggest simplification win
is NOT deleting lots of files.

It is making every important kind of state answer one question:

Who owns the canonical truth, and who is only projecting it?
