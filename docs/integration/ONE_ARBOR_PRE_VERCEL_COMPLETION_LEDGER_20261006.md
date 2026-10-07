# One Arbor pre-Vercel completion ledger

Date: 2026-10-06
Combined branch: `integration/one-arbor-pre-vercel-20261006`
Draft PR: #286
Canonical base: #278 @ `a9c24bde36dd6f5350b23aa2b78ef4044843642b`

## Exact source heads composed

- Pattern Hop / Epstein Evidence finish #282 @ `a2060a522ffc29dbed9a7c33e8d1dbf7f4f3db6b`
- Machine-ready Annabelle + ARK child #285 @ `215774deac790603c8fb73122077633d64ec9543`
  - #285 subsumes the relevant #283 Annabelle finish source and #284 ARK finish source, plus the newer durable checkpoint-resume repair.

The combined candidate starts from the exact #282 head. #285 non-workflow changed-file blobs were selectively composed onto that tree. No broad blind merge was used.

## Reconciliation verification

Path-by-path blob verification after composition:

- #282: 6/6 non-canonical-workflow changed paths preserved exactly.
- #285: 38/38 non-canonical-workflow changed paths preserved exactly.
- No non-workflow blob mismatches remain.

The canonical workflow is intentionally reconciled rather than copied from either child:
- preserves #282's expanded Pattern Hop/Evidence Engine exact-head tests and pull-request acceptance;
- preserves #285's machine-ready/ARK branch intent and safer ref-scoped concurrency;
- adds this pre-Vercel branch as an exact-head push target.

The Annabelle and Pattern Hop isolated workflows are also configured to accept this pre-Vercel head.

## Source capabilities now composed

### Pattern Hop / Epstein Evidence Engine
- provenance survives prepared Pattern Hop -> Evidence Engine -> existing Roundabout -> exact ARK submission contract;
- source-family collapse and conservative source-independence grouping;
- deterministic lead/evidence dedupe without inventing corroboration;
- contradiction/counterevidence propagation and review hold;
- alias/entity gate with no silent merge;
- timeline, relationship, travel, payment and witness cross-checking;
- bounded failed-lead rerouting and branching;
- durable STOP/run lease/restart/idempotency;
- replay/source-version/completion verification and 3.5M-page sharding/backpressure acceptance;
- uncertainty and evidence traceability preserved.

### ARK / agency / archive
- terminal STOP semantics including running -> cancelled;
- durable retry/lease torture coverage;
- checkpoint resume continues after the persisted step instead of rewinding toward step zero;
- archive cursor/resume, semantic backfill default-closed, episode durability and continuity torture source present.

### Annabelle / Felt-Life
- expanded Felt-Life hypotheses with hypothesis-not-verdict rules;
- mature voice calibration/source binding;
- character/relationship/editorial continuity tracking;
- supersession/provenance and persistence-readback contracts;
- manuscript continuation/source-drift/recovery torture coverage;
- client checkpoint auto-resume machinery;
- no manuscript rewrite authorization inferred from infrastructure readiness.

### Grove / phone / local LM
- bounded Grove/ARK source and proposal-only grant contracts retained;
- disposable PostgreSQL acceptance available;
- synthetic Grove/public-alpha Android build lanes retained;
- Windows no-AVX local-LM build/launch/dependency acceptance retained;
- inference activation remains separate from build readiness.

## Acceptance required on this combined head

Before bench/source integration is called complete, #286 must pass its own exact-head runs:

- One Arbor canonical exact-head acceptance
- One Arbor continuity torture suite
- isolated Annabelle finish acceptance when scheduled
- isolated Pattern Hop One Arbor acceptance when scheduled

Component-head green receipts remain evidence, not substitutes for #286 exact-head acceptance.

## Protected/live gates intentionally left

These require deployment, hosted authority, real external state, or a human-only decision:

- Vercel Preview deployment of the exact accepted head;
- deployed-head Preview smoke/acceptance;
- hosted Supabase migration/grant application;
- live Pattern Hop run-control schema activation;
- live ARK/Pattern Hop worker/scheduler execution;
- real-corpus Pattern Hop execution and durable result/readback;
- private/local model inference activation and semantic acceptance where still held;
- physical-device install/acceptance;
- production deployment or merge to main;
- publication of research findings;
- human-only Annabelle prose/Gold/editorial locks.

## Research invariants

Repeated reporting is not independent corroboration.
Association is not conduct.
Identity candidates never silently merge.
Coverage is not truth.
A contradiction is an investigation trigger, not an automatic verdict.
Every finding remains traceable to evidence and source provenance.
