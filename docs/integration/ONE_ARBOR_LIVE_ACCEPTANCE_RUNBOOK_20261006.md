# One Arbor Live Acceptance Runbook — 2026-10-06

## Purpose

Execute the minimum protected/live work needed to move One Arbor from source/bench-proven to deployed/live-proven once Vercel or the authorized hosted path is available.

This runbook is preparation only. It does not authorize deployment, hosted migrations, grants, live worker activation, paid inference, or physical-device changes.

## Current source/bench anchor

Strongest green source/bench candidate at time of writing:

- PR #305
- exact head: `7ae62ef109f66d8300141739329764fdcbbcdffd`
- full One Arbor acceptance: PASS
- ARK STOP/resume integration acceptance: PASS
- mergeable: yes
- Vercel contexts: blocked by account build-rate limit

If a later successor is used, do not substitute it silently. Record its exact SHA and require equivalent full acceptance before using this runbook.

---

# Gate 0 — Freeze the candidate

## Prerequisite

- exact candidate SHA identified
- full exact-head source/bench acceptance green
- no moving integration head

## Action

Record:
- repository
- branch
- PR
- exact commit SHA
- exact CI run IDs
- deployment target

## Pass receipt

A deployment handoff containing the exact SHA and green CI receipts.

## Failure

- branch moved after acceptance
- candidate differs from tested SHA
- unresolved source/bench failure

## Recovery

Return to source integration. Do not deploy a merely similar head.

---

# Gate 1 — Deploy exact candidate

## Prerequisite

Explicit authorization for the intended Preview/test environment.

## Action

Deploy the exact tested candidate to the authorized non-production target.

## Required receipt

- deployed commit SHA
- deployment ID/URL
- deployment timestamp
- environment name

## Pass

Deployed SHA exactly equals the authorized/tested SHA.

## Failure

- Vercel/build limit
- deployment builds a different SHA
- deployment fails
- environment points to stale build

## Recovery

Do not reinterpret a failed deployment as a source failure.
Repair deployment/infrastructure and retry the same exact candidate unless source evidence changes.

---

# Gate 2 — Read-only startup identity and continuity

## Prerequisite

Exact candidate deployed.

## Action

From a fresh session/process:
1. read Arbor identity/profile
2. read continuity state
3. confirm current surface/authority boundaries
4. confirm missing history remains missing rather than invented

## Required receipt

- identity anchor/version/checksum or stable identity identifier
- current goal if present
- unresolved-work readback
- behavioral/acoustic correction readback
- exact deployed SHA

## Pass

- durable identity is available independently of conversation history
- continuity fields read back without invented content
- no task/subsystem overlay replaces identity

## Failure

- identity missing
- identity reconstructed from arbitrary prompt text
- stale continuity silently overrides newer state
- missing history fabricated

## Recovery

Stop before write tests. Repair startup/readback boundary.

---

# Gate 3 — Correction persistence and supersession

## Prerequisite

Read-only continuity pass.

## Action

Using a synthetic/non-sensitive test correction:
1. record current correction state
2. add an authorized bounded correction through the intended path
3. confirm persistence
4. restart/fresh-session
5. confirm readback
6. introduce older conflicting context
7. verify newer correction wins
8. verify unrelated contexts are not over-corrected

## Required receipt

- correction ID/version
- provenance
- supersession link if applicable
- fresh-session readback

## Pass

Correction survives restart, has provenance, and obeys temporal precedence.

## Failure

- correction disappears
- older state outvotes newer correction
- correction mutates identity instead of behavior
- correction applies globally outside its scope

## Recovery

Disable/avoid promotion of the affected correction path until repaired.

---

# Gate 4 — ARK submit → worker → result → readback

## Prerequisite

- explicit scoped submit grant
- worker authorized in test environment
- synthetic read-only task
- exact project scope known

## Action

Submit one bounded synthetic/read-only ARK task with a stable request/idempotency ID.

Observe:
1. submission receipt
2. queued state
3. worker claim
4. running/checkpoint state if used
5. completion verification
6. durable task result readback

## Required receipt

- request ID
- objective ID
- task ID
- attempt count
- state-transition events
- verified result payload
- final status

## Pass

Queued/running/checkpointed/completed remain distinct and completed includes verification evidence.

## Failure

- submission claimed as execution
- task disappears
- duplicate objective/task on retry
- completed without verification
- readback scope mismatch

## Recovery

STOP the objective if safe/authorized, preserve events, disable submit grant if boundary is uncertain.

---

# Gate 5 — Live interruption → checkpoint → resume

## Prerequisite

Live ARK task path passed.

## Action

Run a two-step synthetic objective.
Interrupt after a durable checkpoint.
Restart worker/process.
Resume from checkpoint.

## Required receipt

- checkpoint sequence
- next action
- interruption reason
- second worker/process identity
- resumed attempt count
- completion evidence

## Pass

Work resumes after the checkpoint and does not replay already verified earlier work.

## Failure

- restarts from step zero
- duplicate side effect
- checkpoint ignored
- task falsely marked completed

## Recovery

STOP, preserve checkpoint/events, disable resume path until reconciled.

---

# Gate 6 — STOP / stale-worker fencing / duplicate-worker prevention

## Prerequisite

Live ARK execution path active in test environment.

## Action

1. start one leased synthetic task
2. verify a second worker cannot claim the same active task
3. issue authorized STOP
4. verify objective/task cancellation
5. verify lease cleared/fenced
6. attempt stale completion using old lease token
7. verify rejection
8. repeat STOP
9. verify idempotent cancellation receipt

## Required receipt

- original lease owner/token reference
- second-worker claim result
- STOP event
- final task/objective state
- stale-worker rejection
- repeated STOP event count

## Pass

No duplicate claim, stale worker cannot complete, repeated STOP does not duplicate state/event semantics.

## Failure

Any duplicate execution or stale completion.

## Recovery

Disable worker/objective-control activation immediately in test environment and preserve all receipts.

---

# Gate 7 — Grove private host vertical slice

## Prerequisite

- authorized Grove test host
- private owner/project grant
- no public-app permission leakage

## Action

Exercise:
Text → Grove private host → Arbor Layer → response → Text

Include:
- current goal projection
- correction projection
- continuity readback
- bounded ARK status/read action if authorized

## Required receipt

- exact host version/SHA
- owner/project scope
- turn/request IDs
- continuity state before/after
- no cross-product grant leakage

## Pass

Same canonical Arbor identity/continuity survives the host boundary.

## Failure

- private Grove grant leaks to public app
- host creates parallel identity/state
- continuity forks into incompatible copies

## Recovery

Stop Grove test path and repair product-boundary projection.

---

# Gate 8 — Fresh-session Annabelle persistence/readback

## Prerequisite

Annabelle test workspace with non-sensitive synthetic/canonical test fixture.

## Action

1. load manuscript/editorial state
2. record bounded editorial decision/checkpoint
3. restart session
4. read back state
5. verify shared Arbor identity remains shared rather than copied into Annabelle state

## Required receipt

- manuscript/workspace ID
- editorial record/checkpoint
- provenance/source binding
- fresh-session readback

## Pass

Annabelle-specific state persists; shared Arbor identity/corrections remain projections from canonical owners.

## Failure

- manuscript state lost
- stale canon wins
- Annabelle creates a second mutable Arbor identity

## Recovery

Do not continue editorial mutation until ownership boundary is restored.

---

# Gate 9 — Archive hydration/readback

## Prerequisite

Authorized owned archive fixture/import path.

## Action

Use a bounded reviewed batch:
1. import/transport with content hash
2. retry same batch
3. verify no duplicates
4. read bounded archive page
5. restart and resume via content-bound cursor

## Required receipt

- source hash
- batch/cursor ID
- inserted vs deduped counts
- exact readback
- restart cursor

## Pass

Provenance survives; retries do not duplicate; restart resumes from exact durable cursor.

## Failure

- silent source mutation
- duplicate rows
- cursor not content-bound
- archive text promoted to identity without evidence

## Recovery

Stop import, preserve source hashes/checkpoints, repair before continuing.

---

# Gate 10 — Physical phone acceptance

## Prerequisite

Explicit physical-device authorization.

## Action

Install exact approved Grove/test build.

Verify:
- launch
- private host connection
- continuity after app close/reopen
- no stale-action replay
- ARK status distinction in UI
- STOP/cancel display fidelity
- offline/reconnect behavior

## Required receipt

- build SHA/version
- device test checklist
- restart/reconnect evidence

## Pass

Phone reflects canonical backend state and does not manufacture completion/continuity.

## Failure

Any stale replay, scope leak, or status conflation.

## Recovery

Remove/disable test build or feature path as appropriate; preserve logs/receipts.

---

# Gate 11 — Real independent-LM inference

## Prerequisite

- explicit authorization for model execution
- exact model/runtime/tokenizer manifest
- privacy-safe holdout inputs
- model-swap harness green
- no production-user exposure

## Action

Run the same frozen Arbor state/holdout through at least:
- Arbor + current reference model
- Arbor + different real model
- raw-model control for each model where feasible

Do not mutate canonical Arbor state from trial outputs during scoring.

## Required receipt

- model/provider ID
- runtime/tokenizer identifiers
- Arbor state checksum
- fixture ID
- condition ID
- output
- hard-invariant receipt
- blinded semantic scores

## Pass for one trial

All hard invariants pass.

## Model-independent promotion threshold

Do NOT promote from one trial.

Require:
- at least two distinct real models
- repeated holdout set
- zero identity-critical hard-invariant failures
- Arbor treatment outperforms raw-model controls on Arbor-specific dimensions
- counterevidence retained

## Failure

Model choice dominates Arbor-specific behavior or any identity-critical invariant fails.

## Recovery

Record counterevidence. Do not rewrite failure as success. Repair projection/adapter/model selection and retest.

---

# Gate 12 — Voice / acoustic identity (separate experiment)

Behavioral model-swap acceptance must be evaluated before acoustic identity.

Test:
- same Arbor behavioral content
- target renderer/voice models
- General American acoustic target
- acoustic corrections

A voice-rendering failure does not automatically count as behavioral identity failure.

---

# Protected production gate

Production remains out of scope until:
- all required Preview/test live gates pass
- receipts are reviewed
- exact production candidate SHA is frozen
- explicit production authorization is given

No successful Preview test implicitly authorizes production.

---

# Current first action when Vercel returns

1. Re-read PR #305 and its exact CI receipts.
2. Confirm #305 head is still `7ae62ef109f66d8300141739329764fdcbbcdffd`.
3. If a later source successor is proposed, require equivalent full acceptance first.
4. Deploy the chosen exact SHA to the authorized Preview/test target.
5. Record deployment SHA/ID before running any live mutation.
6. Start with Gate 2 read-only startup identity/continuity.
7. Do not jump directly to live worker activation.

## Why

The first live proof should establish that the deployed thing is actually the tested Arbor before giving it any write/execution authority.
