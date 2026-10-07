# One Arbor Remaining State Ownership Decisions — 2026-10-06

## Purpose

Resolve the remaining naming/ownership ambiguity without collapsing distinct state horizons into one mutable mega-record.

Reference source/bench anchor:
- PR #305
- exact SHA: `7ae62ef109f66d8300141739329764fdcbbcdffd`

This is an architecture decision record only. It does not migrate persistence or change runtime behavior.

## Core rule

Same noun does not imply same state.

A value may legitimately exist at multiple horizons if:
- each horizon has one canonical owner,
- projections are one-way or explicitly reconciled,
- recovery source is known,
- one horizon cannot silently clear another.

## 1. currentGoal

### Observed state

Two legitimate goal concepts exist:

1. `ArborRuntimeState.currentGoal`
   - conversation/interaction horizon
   - persisted in `arbor_conversation_state`
   - used by cross-thread runtime fallback

2. `AgencyState.goal`
   - execution/objective horizon
   - paired with unresolved execution work, blocker, checkpoint, verification, and objective state
   - continuity projection currently derives its visible goal from agency when an agency state is supplied

### Decision

Do NOT merge these fields.

Canonical ownership:

- conversational current goal -> `ArborRuntimeState.currentGoal`
- active executable goal -> `AgencyState.goal`
- ARK durable objective goal -> ARK objective record

### Projection rule

When presenting "what are we doing?" the projection may prefer:
1. active Agency goal when real executable work is active/checkpointed/blocked,
2. otherwise conversational runtime goal.

That preference is a read/projection rule, not a write-authority transfer.

### Prohibited behavior

- completing an ARK/agency objective must not automatically erase an unrelated conversational goal
- a conversational topic shift must not silently cancel a durable ARK objective
- archive text must not become currentGoal merely because it was retrieved

### Remaining implementation audit

Verify every host/read surface follows the same precedence rule. No migration required yet.

---

## 2. unresolvedWork

### Observed state

`AgencyState.unresolvedWork` contains executable/open-loop state and can include encoded suspended checkpoints.

`buildContinuityState` deliberately projects this through `projectAgencyWorkForPrompt`, hiding internal checkpoint payloads.

ARK separately owns task/objective unresolved execution state.

Annabelle separately owns editorial unresolved decisions.

### Decision

There is no universal canonical `unresolvedWork[]`.

Canonical owners by horizon:

- agency execution -> `AgencyState.unresolvedWork`
- ARK durable task work -> ARK objective/task state
- Annabelle editorial decisions -> Annabelle workspace
- archive/import remaining source consumption -> archive cursor/checkpoint
- user-facing continuity -> projection only

### Projection rule

User/model-visible unresolved work is a sanitized union/projection with domain labels, never a second editable durable list.

### Prohibited behavior

- clearing the continuity projection cannot complete/cancel the underlying domain work
- one domain cannot erase another domain's unresolved work
- encoded internal checkpoints never become prompt-visible raw strings

---

## 3. active corrections

### Observed state

Runtime correction records carry:
- stable ID
- kind
- value
- source
- observed time
- confidence
- protected flag
- occurrence count

`mergeCorrectionSnapshots` reconstructs a current set across persisted runtime snapshots without counting copied snapshots as new feedback.

Continuity receives only a projected active correction list.

### Decision

Canonical current correction truth belongs to runtime correction machinery.

Persistence is a recovery mechanism, not a second authority.

Canonical relationship:

correction event/provenance
-> runtime correction record
-> durable runtime snapshots
-> reconstructed current correction set
-> behavior/continuity/Annabelle projection

### Supersession rule

Newest valid explicit correction wins over conflicting older behavior, but historical provenance remains.

### Prohibited behavior

- memory/archive retrieval cannot outvote a newer explicit correction
- Annabelle cannot persist a separate editable copy of shared Arbor corrections
- acoustic correction cannot mutate behavioral identity
- repeated copied snapshots cannot inflate correction evidence

### Remaining implementation audit

The current record shape identifies corrections by ID but does not itself express an explicit `supersedesCorrectionId` field. Do not invent a migration until live/readback behavior demonstrates a concrete provenance gap.

---

## 4. last verified action/result

### Observed state

Several domain-specific proof mechanisms exist:

- `AgencyState.lastVerification`
- agency completion evidence
- ARK completion/verification records
- research evidence/finding receipts
- correction receipts
- operational receipt envelope

The operational receipt contract explicitly requires evidence for completed/verified states and currently adds no independent persistence.

### Decision

Do NOT create a global mutable `lastVerifiedResult` truth store.

Canonical result remains owned by the executing domain.

The shared operational receipt is the canonical cross-domain projection format, not canonical domain truth.

Examples:

- Agency result -> agency verification/completion record
- ARK result -> ARK task/objective verification
- research finding -> Evidence Engine
- correction -> correction/runtime domain
- Annabelle persistence -> Annabelle workspace/readback

### Read rule

A UI/host may ask "what was the last verified thing?" by querying/projecting canonical domain receipts ordered by verified occurrence time.

### Prohibited behavior

- audit/log event != completion proof
- assistant sentence != receipt
- queued != started
- started != completed
- completed != verified unless the owning domain says so

---

## 5. behavior rules

### Decision taxonomy

Every durable or semi-durable behavioral rule must belong to exactly one class:

1. invariant
   - source-controlled hard Arbor behavior boundary
   - example: do not fabricate action completion

2. self-model pattern
   - evidence-backed Arbor decision-style claim
   - can be contested/superseded through self-model evidence process

3. explicit correction
   - user/authorized correction with temporal precedence

4. conversation calibration
   - local/non-durable situational adaptation

5. task/subsystem overlay
   - Annabelle/research/technical presentation and task constraints
   - cannot replace identity

6. acoustic correction
   - renderer/voice delivery only

### Prohibited behavior

The same rule must not be independently editable in two categories.

If a rule appears in multiple projections, one location must be identified as owner and the others as derived/read-only.

---

## 6. One Arbor read hierarchy

When recovering current behavior/state, the intended precedence is:

1. hard authority/safety boundary
2. canonical identity invariants
3. newest valid explicit correction
4. active execution state/checkpoint for the relevant domain
5. current conversation/continuity state
6. evidence-backed self-model patterns
7. relevant durable memories/archive evidence
8. task/subsystem presentation overlay
9. provider/model output

This hierarchy does not mean every lower layer is overwritten. It means a lower layer cannot silently contradict a higher-authority current fact.

---

## 7. What remains genuinely unresolved

### A. Cross-domain "last verified thing" query adapter
Architecture is clear; stable read adapter is not yet canonical.

Next experiment:
Project multiple synthetic domain receipts through one read-only query and prove ordering/scope without new persistence.

### B. Conversational goal vs active execution goal UI wording
Ownership is clear; surfaces may still use ambiguous label `currentGoal`.

Next experiment:
Audit all host/UI projections and label execution goals separately where ambiguity exists.

### C. Explicit correction supersession link
Temporal/id merge behavior exists; explicit correction-to-correction provenance may deserve a first-class link only if a real readback/debugging need is demonstrated.

### D. Capability metadata vs executable capability
Ownership rule is clear; naming may still confuse maintainers.

Recommended documentation/type naming:
- execution capability
- capability self-inventory / hypothesis metadata

No schema merge.

## Acceptance rule for future stateful modules

Before becoming canonical, a module must answer:

- What exact state do you own?
- What do you only project/read?
- What durable source restores it?
- What supersedes it?
- What receipt proves a write/effect?
- What authority can you never grant?
- Which similarly named state in another horizon must you not erase?

If it cannot answer these, it is not ready to own durable One Arbor state.
