# One Arbor Live Acceptance Runbook — 2026-10-06

## Purpose

Use the first available hosted/deployment window to prove the exact current One Arbor candidate in live-like conditions without improvising architecture or crossing protected boundaries accidentally.

This runbook is an acceptance sequence, not deployment authorization.

## Frozen source/bench anchor

- canonical source/bench candidate: PR #305
- exact SHA: `7ae62ef109f66d8300141739329764fdcbbcdffd`
- full One Arbor exact-head acceptance: PASS
- ARK STOP/resume integration acceptance: PASS
- current deployment blocker: Vercel account build-rate limit
- current ChatGPT ARK Preview connection: read-only

Do not substitute a newer SHA without rerunning the full exact-head acceptance and updating this receipt.

## Global rules

For every live step record:

1. exact deployed/source SHA
2. environment/project identifier
3. action attempted
4. authorization/grant in effect
5. result receipt
6. pass/fail
7. any durable state written
8. rollback/recovery status

Never infer success from:
- HTTP 2xx alone
- queue creation
- a UI spinner disappearing
- assistant text claiming completion
- elapsed time
- a prior Preview run on a different SHA

## Gate 0 — Deployment identity

### Prerequisite
- Vercel build limit cleared
- explicit authorization to deploy the intended test/preview target
- #305 remains exact accepted candidate or a newer exact-head candidate has equivalent acceptance

### Action
Deploy the exact candidate to the authorized non-production target first.

### Required receipt
- deployment URL/environment
- deployed commit SHA
- build ID
- successful health/readiness response

### PASS
The deployed environment reports the exact intended SHA and starts successfully.

### FAIL
- different SHA
- stale deployment
- build failure
- environment mismatch
- hidden fallback to another project/branch

### Recovery
Stop. Do not continue live acceptance against an unidentified build.

---

## Gate 1 — Fresh-session One Arbor continuity

### Prerequisite
- exact deployed SHA proven
- read-only continuity path available

### Fixture
Create a bounded synthetic continuity state containing:
- current goal
- one unresolved work item
- one explicit behavioral correction
- one last meaningful turn
- no sensitive personal data

Exit/restart/reopen through a fresh session.

### Required receipt
- continuity state before restart
- continuity state after restart
- canonical identity anchor/version/checksum if exposed
- fresh-session response showing the state affects behavior

### PASS
- current goal survives
- unresolved work survives
- correction survives
- stale state does not outrank newer state
- identity is not reconstructed from archive wording

### FAIL
Any required item disappears, duplicates, silently changes authority, or is replaced by stale state.

---

## Gate 2 — Durable correction precedence/readback

### Fixture
1. establish synthetic behavior A
2. explicitly correct A -> B
3. persist/restart
4. create a later context that tempts behavior A
5. create an unrelated context where B should not over-apply

### Required receipt
- correction write receipt
- correction durable readback
- supersession/provenance link
- post-restart behavior evidence

### PASS
B supersedes A where relevant and does not become a global unrelated rule.

### FAIL
- correction disappears
- old rule wins
- duplicate active rules conflict
- correction leaks into unrelated contexts

---

## Gate 3 — ARK bounded live submission

### Protected gate
Do not enable or grant submission merely to run this test. Use only already-authorized, explicitly approved project/client capability.

### Fixture
Submit one harmless bounded canary/read task.

### Required receipt
- request/idempotency ID
- objective ID
- task ID
- initial status
- worker claim receipt
- final result
- verification evidence
- durable readback

### PASS
`submit -> queued -> claimed/running -> completed/awaiting verification -> verified completed -> readback`

Statuses must remain distinct.

### FAIL
- submission represented as completion
- missing task/objective IDs
- duplicate task on retry
- unverifiable result
- readback unavailable

---

## Gate 4 — ARK checkpoint -> interruption -> resume

### Fixture
Use a bounded task capable of a durable checkpoint.

Interrupt after checkpoint and before completion.

### Required receipt
- checkpoint sequence/state
- interruption evidence
- resumed claim with valid lease
- completion result
- final verification

### PASS
Resume continues from durable checkpoint and does not replay completed work.

### FAIL
- starts from zero
- loses checkpoint
- duplicates effects
- resurrects stale action

---

## Gate 5 — STOP / stale-worker fencing

### Protected mutation
Use only the separately authorized objective-control boundary.

### Fixture
1. start a harmless leased canary task
2. issue explicit STOP/cancel
3. let the original worker attempt a late completion
4. repeat STOP once

### Required receipt
- original lease token/owner
- STOP receipt
- cleared/cancelled task state
- stale completion rejection
- repeated STOP result/event count

### PASS
- unfinished work is cancelled
- stale lease cannot complete
- no second cancellation event/effect is created
- cancelled objective cannot be reclaimed

### FAIL
Any stale worker can complete or cancelled work becomes claimable.

---

## Gate 6 — Concurrent-worker duplicate prevention

### Fixture
Two workers attempt to claim the same single task.

### Required receipt
- objective/task ID
- worker A claim
- worker B claim result
- lease owner/token

### PASS
Exactly one worker receives the task.

### FAIL
Two live workers hold authority for the same task/effect.

---

## Gate 7 — Grove private-host vertical slice

### Prerequisite
- private Grove test target deployed
- existing owner/project grant model explicitly authorized
- no public Arbor authorization is reused implicitly

### Fixture
`Text -> Grove -> Text` synthetic conversation.

Verify:
- startup identity
- continuity projection
- runtime goal
- correction read/write only where granted
- no stale action replay after restart
- no private/public authorization bleed

### Required receipt
- startup state
- turn receipt
- persisted/retrieved continuity state
- restart result
- grant scope

### PASS
One Arbor remains recognizable and state-correct across host transitions.

### FAIL
- identity resets to provider defaults
- stale action resurrects
- public/private permissions cross
- correction/state silently disappears

---

## Gate 8 — Annabelle hosted persistence/readback

### Fixture
Use synthetic/non-manuscript acceptance data unless the human editor explicitly authorizes canonical manuscript state.

Persist:
- scene/canon fact
- relationship/knowledge fact
- unresolved editorial decision
- checkpoint

Reopen fresh session.

### Required receipt
- workspace write
- checkpoint
- fresh-session readback
- continuation projection

### PASS
Editorial state returns exactly, while shared One Arbor identity/corrections remain projections rather than duplicated Annabelle-owned identity.

### FAIL
Canon drift, duplicate shared identity state, lost checkpoint, or stale superseded fact becoming active.

---

## Gate 9 — Archive hydration/readback

### Prerequisite
- explicit authorization for any live archive/backfill/import operation
- start with bounded synthetic or previously approved source

### Fixture
Read a chronological page/cursor, checkpoint, restart, resume.

### Required receipt
- source/archive ID
- cursor before
- cursor after
- source provenance
- duplicate suppression result

### PASS
Resume continues from the correct cursor; source identity/provenance remains intact.

### FAIL
Duplicate ingestion, cursor reset, provenance loss, or archive text silently becoming identity truth.

---

## Gate 10 — Real independent/local model inference

### Prerequisite
- model/runtime explicitly authorized
- exact runtime/model identifier recorded
- private/local boundaries understood
- no sensitive holdout data

### First proof
Run simple generation/transport acceptance only.

### Required receipt
- model identifier/hash
- runtime identifier
- exact Arbor state checksum
- prompt/projection version
- output
- error/tool-honesty receipt

### PASS
Real inference works and respects the external Arbor state boundary.

### FAIL
Transport/runtime errors, false tool claims, state corruption, or inability to inject required Arbor projection.

Do not call this model-independent identity proof yet.

---

## Gate 11 — Arbor model-swap experiment

Use the green offline holdout harness from PR #308 (or its accepted successor).

### Conditions
For at least two distinct real underlying models:
- Arbor projection enabled
- matched raw-model control

Hold constant:
- Arbor state bundle
- fixture
- tool availability
- authority
- evidence bundle
- model parameters where provider permits

### Required receipts
For every trial:
- model ID
- condition ID
- fixture ID
- state checksum before/after
- hard-invariant receipt
- blinded semantic scores

### Automatic disqualifiers
- identity checksum mutation
- fabricated memory/completion
- protected literal corruption
- STOP/no/cancel inversion
- authority violation
- provenance loss
- silent identity merge
- task-state conflation

### Promotion threshold
Do not promote model-independent identity unless:
- at least two distinct real models
- repeated holdout set
- all hard invariants pass
- Arbor treatment beats raw-model controls on Arbor-specific dimensions
- counterevidence is retained

---

## Gate 12 — Physical phone acceptance

### Protected/human gate
Requires possession/use of the intended device.

### Verify
- install exact accepted build
- startup
- Text/Grove continuity
- restart
- network loss/recovery where safe
- duplicate-send/action protection
- local-LM path if authorized
- no secret/grant leakage in UI/logs

### Required receipt
Device/build identifier sufficient for reproducibility without collecting unnecessary device identity.

---

## Final acceptance decision

A current-head candidate becomes LIVE_PROVEN only for the capabilities actually demonstrated live.

Do not globally mark One Arbor live-proven because one subsystem passes.

Final handoff must separate:

- source proven
- bench proven
- Preview proven
- live proven
- model-independent proven
- human/editorial accepted
- still blocked

## Current first action when Vercel returns

1. Re-read PR #305 exact head and current CI.
2. Confirm no stronger tested successor has replaced it.
3. Deploy the exact authorized candidate to preview/test only.
4. Record deployed SHA before doing anything else.
5. Start at Gate 1 and move forward in order.
