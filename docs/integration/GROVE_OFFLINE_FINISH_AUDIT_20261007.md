# Grove / independent LM offline-finish audit — 2026-10-07

## Scope

Canonical source anchor:

- PR #322
- `f4021985b475651284c97aecbc3bdf03123478cc`

This lane is source/test-only. It does not deploy, apply hosted migrations or
grants, activate model inference, install on a physical phone, merge production,
or claim a new LM checkpoint.

## Historical ownership / loss audit

The current canonical source was compared against the relevant Grove / phone /
local-LM lineages:

- #237, #243, #246
- #254, #255, #256, #257, #258, #259, #260
- #261, #266, #277
- #306, #308

No Grove / phone / local-LM / receiver / adapter / tokenizer / model-swap path
appeared as a relevant **removed** file in the current candidate relative to any
of those audited heads.

#259 and #260 are fully behind the current source with no current-source
behind-count. The remaining historical heads diverged during earlier parallel
work, but their meaningful Grove/LM paths are represented in the accepted One
Arbor lineage. Old branch-specific CI/release scaffolding remains provenance,
not a reason to broad-merge stale branches.

Disposition:

- private Grove host/auth/conversation plumbing — **preserved / superseded by current source**
- retry identity and phone restart recovery — **preserved**
- bounded correction/runtime capture — **preserved, default-off / separately gated**
- Grove -> ARK handoff contracts — **preserved, ARK remains authoritative owner**
- Grove transcript fencing/idempotent durable effect — **preserved**
- local Windows no-AVX runtime preparation — **preserved**
- model-swap experiment/harness — **preserved**
- old branch-specific workflows — **historical / obsolete as canonical runtime ownership**
- hosted grants/migrations, live model inference and physical-device acceptance — **live-gated**

No broad merge of an old Grove branch is justified by this audit.

## v0.4 semantic repair preparation

Recovered accepted evidence for the newest trained private candidate:

- v0.4 adapter SHA-256:
  `d47bdccb36c536550c218f01cd02b5b612e4065168592db7d9b0cda51af0ffcb`
- historical training receipt: 221 examples / 112 steps / 2 epochs
- isolated holdout: 28 paired scenarios / 56 real generations
- semantic adjudication: 16 PASS / 9 FAIL / 3 NEEDS_REVIEW
- release blocker: two HIGH source-honesty failures

This lane adds, without training:

- 48 new synthetic corrective training examples
- 24 new untouched holdout prompts with criteria but no target assistant answers
- zero exact prompt overlap between train and holdout
- focused families only:
  - metadata/content/action boundary
  - deployment-status truthfulness
  - pronoun/ownership
  - adjacent-context non-invention
  - natural shared agency
- a deterministic fixture validator

The validator deliberately reports `PREPARED_NOT_TRAINED`.

## Model provenance boundary

The historical v0.4 training loaded `Qwen/Qwen3-0.6B` without a recoverable
exact foundation revision in the accepted source receipt. The private v0.4
adapter bits and selected target-runtime model/GGUF are also not present in this
repository lane.

Therefore this source lane MUST NOT:

- invent a v0.5 checkpoint
- claim corrective weights were trained
- guess the old foundation revision
- treat a model name as an exact reproducibility pin
- claim target-runtime tokenizer compatibility or measured inference without the
  actual artifacts

The next trained candidate must record before promotion:

- exact foundation revision
- exact tokenizer revision/artifact hash
- input v0.4 adapter hash
- new adapter hash
- exact training dataset source revision
- exact holdout source revision
- runtime/dependency identity
- generation/card settings

## Exactly-once boundary

Current accepted Grove semantics remain:

- exactly-once durable logical transcript effect per request ID — **proven**
- stale-worker durable reply suppression — **proven**
- restart replay of an already persisted transcript reply — **proven**
- exactly-once underlying model invocation — **NOT proven**

The remaining duplicate-computation window is receiver-side. A durable
generation-result ledger keyed by the existing request ID is still required to
narrow it. The accepted r3 receiver source/artifact is private and not available
in this repository lane, so this branch must not fake that implementation.

## Offline acceptance target

The dedicated #325 workflow checks the current branch for:

- focused corrective fixture isolation
- existing local-LM source contracts
- Grove host/auth/continuity/correction/ARK contracts
- model-swap/control regression
- full backend regression/build/typecheck
- disposable transcript/correction and Grove ARK grant proposal acceptance
- Flutter analyze/regression
- Grove retry/restart/ARK path tests
- synthetic Grove APK build
- exact pinned llama.cpp no-AVX Windows runtime build/launch

The exact final green run is recorded on PR #325 rather than editing this file
after verification and moving the tested source head.

## Genuine remaining gates after a green offline run

1. Private v0.4 adapter artifact available to the approved training runtime.
2. Exact future foundation/tokenizer revision pin.
3. Actual targeted corrective training pass.
4. Fresh real-model holdout adjudication with zero high-severity honesty failures.
5. Actual selected GGUF + Arbor adapter load/inference and RAM/latency/context measurements.
6. Receiver-side persistent generation-result recovery, or an explicitly accepted
   weaker at-most-one-durable-effect contract.
7. Hosted Grove migrations/grants and trusted private-host acceptance.
8. Live Grove inference through that host.
9. Physical-phone install and end-to-end acceptance.

Those are artifact/live/device gates, not permission to redesign Grove.
