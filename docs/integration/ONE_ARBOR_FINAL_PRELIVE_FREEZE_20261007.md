# One Arbor Final Pre-Live Freeze — 2026-10-07

## Status

**FROZEN SOURCE/BENCH CANDIDATE**

- Repository: `mikebuffan/Arbor`
- Canonical PR: **#322 — One Arbor final pre-live source freeze candidate**
- Exact source SHA: `f4021985b475651284c97aecbc3bdf03123478cc`
- Verification-only head: `38df55b61396ac7672a4e531503591742b46398a`
- Full acceptance run: **37589036548 — SUCCESS**
- PR mergeability at freeze check: **mergeable**
- Main merge: **not performed**
- Deployment: **not performed**

**NO KNOWN SOURCE/BENCH DEFECT REMAINS.**

This document is the canonical handoff for the exact source SHA above. Older live-acceptance documents remain useful for gate detail, but their older candidate PR/SHA references are superseded by this freeze.

---

## What the final source/bench acceptance proves

The exact #322 source candidate passed the full pre-live matrix, including:

- active runtime RPC definition coverage
- dormant research-adapter reachability fencing
- conversation-aware memory retrieval RPC contract
- bounded local Vault search
- deterministic completion-evidence enforcement
- research-controller append SQL contract and disposable PostgreSQL acceptance
- identity / self-model / capability-hypothesis source contracts
- cognitive-access language boundaries
- contextual-reference resolution
- humor/pragmatics policy
- operational receipt contracts
- Annabelle / Felt-Life source acceptance
- Pattern Hop / Evidence Engine acceptance
- source-independence, provenance, failed-lead routing, entity/timeline checks
- continuity / archive / correction recovery
- Grove / ARK source integration
- ARK task status, STOP/cancel/resume, leases and readback contracts
- model-swap holdout and Arbor Control Backend regression
- full backend regression
- production backend build
- standalone TypeScript
- native disposable database acceptance
- research append disposable database acceptance
- Flutter analyze and regression
- synthetic Grove APK
- isolated public-alpha APK
- Windows no-AVX local-LM build and launch/dependency checks

Source/bench success is not current-head live deployment proof.

---

## Confirmed external deployment blocker

At freeze time, the exact SHA

`f4021985b475651284c97aecbc3bdf03123478cc`

has **zero Vercel deployments** across the currently linked Firefly projects.

All four GitHub Vercel contexts on the exact SHA are failing with Vercel's **build-rate-limit** path:

- Vercel — `arbor-ark-preview-mcp`
- Vercel — `grove-private-api`
- Vercel — `firefly-ark-sandbox`
- Vercel — `firefly`

The Vercel account can produce READY previews for older commits, so this is not evidence of a general source failure or total Vercel outage. The current blocker is that the exact frozen SHA has not received a deployable build because of the platform/account build-rate limit.

Linked projects observed during the freeze check include:

- `firefly-ark-sandbox`
- `firefly`

Do not substitute an older READY Vercel deployment for current-head acceptance.

---

# First action when Vercel permits the exact build

1. Re-read PR #322 and confirm its head is still exactly:
   `f4021985b475651284c97aecbc3bdf03123478cc`.
2. Confirm full run `37589036548` is still the source/bench receipt for that exact candidate.
3. Use an explicitly authorized **non-production preview/test target first**.
4. Deploy the exact SHA.
5. Record deployment ID, URL, environment and deployed commit SHA.
6. If deployed SHA does not exactly match the frozen SHA, **STOP**. Do not continue live acceptance against a similar or stale build.

Deployment/production authorization is separate from this handoff. This document does not grant it.

---

# Live acceptance order

## Gate 1 — Deployment identity

Required receipt:
- deployment ID
- preview/test URL
- environment
- deployed SHA
- build timestamp

Pass:
- deployed SHA exactly equals the frozen candidate.

Failure:
- stale/different SHA, build error, wrong target or hidden fallback.

Recovery:
- stop; do not test the wrong build.

---

## Gate 2 — Fresh-session continuity

Use bounded synthetic state:
- current conversational goal
- one unresolved item
- one explicit behavioral correction
- one meaningful prior Arbor turn
- no sensitive personal data

Required receipt:
- state before restart
- fresh-session state after restart
- canonical identity/version/checksum where exposed
- behavior demonstrating recovered state

Pass:
- goal, unresolved work and correction survive correctly
- newer state outranks stale state
- identity is not reconstructed from archive wording

---

## Gate 3 — Correction persistence and supersession

Fixture:
- establish behavior A
- correct A -> B
- persist/restart
- tempt the old behavior later
- include unrelated context where B should not over-apply

Required receipt:
- correction write
- durable readback
- provenance/supersession evidence
- post-restart behavior

Pass:
- B wins where relevant and does not become an unrelated global rule.

---

## Gate 4 — ARK bounded submit -> worker -> durable result -> readback

Protected gate. Use only explicitly authorized project/client capability.

Required receipt:
- request/idempotency ID
- objective ID
- task ID
- queued state
- worker claim/lease
- result
- verification evidence
- durable readback

Pass:
- submission, queue, claim, execution, completion and verification remain distinct states.

---

## Gate 5 — ARK checkpoint -> interruption -> resume

Required receipt:
- checkpoint sequence/state
- interruption evidence
- resumed claim/lease
- final result
- verification receipt

Pass:
- continuation resumes from the durable checkpoint without replaying completed work.

---

## Gate 6 — STOP / cancel / stale-worker fencing

Use a harmless leased canary.

Required receipt:
- original lease
- STOP/cancel receipt
- cleared/cancelled task state
- stale-worker late-completion rejection
- repeated STOP result

Pass:
- stale worker cannot complete
- cancelled work cannot be reclaimed
- repeated STOP is idempotent

---

## Gate 7 — Duplicate-worker prevention

Two workers attempt to claim one task.

Required receipt:
- same task/objective ID
- worker A claim result
- worker B claim result
- winning lease token/owner

Pass:
- exactly one worker receives execution authority.

---

## Gate 8 — Grove Text -> Grove -> Text vertical slice

Protected/private-host gate.

Verify:
- startup identity
- continuity projection
- runtime goal
- bounded correction behavior where granted
- restart
- no stale action replay
- no public/private permission bleed

Required receipt:
- startup state
- turn receipt
- persistence/readback
- restart result
- grant scope

---

## Gate 9 — Annabelle fresh-session persistence/readback

Use synthetic editorial data unless canonical manuscript state is explicitly authorized.

Required receipt:
- editorial state write
- checkpoint
- fresh-session readback
- continuation projection

Pass:
- canon/editorial state returns exactly
- shared One Arbor identity is projected rather than duplicated into Annabelle

Human Gold promotion remains a separate editorial gate.

---

## Gate 10 — Archive hydration/readback

Protected live write/import only if explicitly authorized.

Required receipt:
- archive/source ID
- cursor before
- cursor after
- provenance
- restart/resume result
- duplicate suppression result

Pass:
- resume continues from the correct cursor and archive content does not silently become identity truth.

---

## Gate 11 — Real independent/private model inference

Protected/possibly paid gate.

First proof is transport/runtime acceptance, not model-independent identity.

Required receipt:
- exact model/runtime identifier
- Arbor state checksum
- projection version
- output
- tool/error-honesty receipt

Pass:
- real inference works while preserving the external Arbor state/authority boundary.

---

## Gate 12 — Controlled Arbor model-swap experiment

Use the already-built holdout harness.

Minimum conditions:
- at least two distinct real underlying models
- Arbor projection condition for each
- matched raw-model controls
- repeated holdout set
- blinded scoring
- hard invariants all pass

Hard disqualifiers include:
- identity checksum mutation
- fabricated memory
- fabricated completion
- protected-literal corruption
- STOP/no/cancel inversion
- authority violation
- provenance loss
- silent identity merge
- task-state conflation

Do not claim model-independent identity from one successful swap.

---

## Gate 13 — Physical phone acceptance

Human/device gate.

Verify:
- exact accepted build
- startup
- Text/Grove continuity
- restart
- network loss/recovery where safe
- duplicate-send/action protection
- local-LM path if authorized
- no secret/grant leakage in UI/logs

---

# Rollback / recovery rule

At any gate failure:

1. preserve the receipt
2. stop advancing through later gates
3. do not relabel the failed capability as live-proven
4. return to the smallest owning subsystem
5. repair and rerun the required acceptance before continuing

Do not use destructive hosted-schema rollback casually.

The prior green #317 source candidate remains preserved in Git history as a recovery/comparison anchor. The final frozen #322 branch remains unchanged while live acceptance proceeds.

---

# Capability claim freeze

## SOURCE_PROVEN / BENCH_PROVEN

The frozen candidate may currently claim source/bench proof for the implemented contracts and acceptance surfaces covering:

- durable One Arbor identity projection
- conversation continuity and state ownership boundaries
- durable correction precedence/recovery
- bounded agency / completion evidence
- ARK task-state and STOP/resume/lease contracts
- Pattern Hop / Evidence Engine provenance and epistemic boundaries
- Annabelle editorial/canon machinery
- Felt-Life source integrity
- Grove/private-host source contracts
- phone/public-alpha build readiness
- local-LM build/runtime contracts
- cognitive-access language
- contextual-reference resolution
- humor/pragmatics
- identity-assurance source contracts
- operational receipt projection
- model-swap holdout harness
- conversation-aware memory retrieval source contract
- active runtime RPC definition coverage
- bounded research-controller append persistence contract

## PREVIEW_PROVEN

Historical bounded Preview evidence exists for:
- ARK checkpoint -> interruption -> resume -> completion/readback
- bounded continuity/readback canaries

This historical Preview proof does **not** make #322 live-proven.

## LIVE_PROVEN

For the exact frozen #322 SHA:

**NONE yet.**

The exact candidate has not been deployed.

## MODEL_INDEPENDENT

**NOT PROVEN.**

The experimental harness is bench-ready. Real multi-model controlled testing remains a live/protected experiment.

## HUMAN / EDITORIAL ACCEPTED

Not globally proven.

Annabelle source machinery is bench-proven; fresh hosted persistence and human Gold/editorial validation remain separate gates.

---

# Protected gates confirmed un-crossed

As of this freeze:

- main merge: **NO**
- production deployment: **NO**
- preview deployment of exact #322 SHA: **NO**
- hosted migrations: **NO**
- hosted grant changes: **NO**
- live worker activation: **NO**
- real/paid model experiment: **NO**
- physical phone installation: **NO**
- production corpus ingestion: **NO**
- human editorial Gold promotion: **NO**

---

# Open defect / blocker list

## Confirmed unresolved source defect

**None known.**

**NO KNOWN SOURCE/BENCH DEFECT REMAINS.**

## External blocker

- exact #322 SHA has no Vercel deployment
- four Vercel GitHub contexts are blocked by build-rate limits

## Protected/live work

Everything remaining is acceptance of the already-tested architecture in its intended hosted/device/model environments.

## Optional offline work

There is always possible historical cleanup and documentation polishing, but none is required to establish the current source/bench candidate.

It is intentionally stopped here to avoid replacing a finished pre-live freeze with another archaeology loop.

---

# Final handoff

When the platform permits the exact build, the next meaningful action is:

**authorized non-production deployment of exact SHA
`f4021985b475651284c97aecbc3bdf03123478cc`
followed by Gate 1 and then the live acceptance sequence above.**

Until then, hold the candidate still.
