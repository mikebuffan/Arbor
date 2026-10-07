# One Arbor pre-Vercel completion ledger

Date: 2026-10-06
Combined branch: `integration/one-arbor-pre-vercel-20261006`
Draft PR: #286
Canonical base: #278 @ `a9c24bde36dd6f5350b23aa2b78ef4044843642b`

## Exact source heads composed

- Pattern Hop / Epstein Evidence finish #282 @ `a2060a522ffc29dbed9a7c33e8d1dbf7f4f3db6b`
- Annabelle finish #283 @ `cd9f58db3e47c3a91ca8514a8f28d9d89b5a24fc`
- ARK finish #284 @ `bfab09623dde9d76c06a2407ed81fbbb73edf031`

The combined candidate starts from the exact #282 head. #283 and #284 changed-file blobs were selectively composed onto that tree. No broad blind merge was used.

## Reconciliation verification

Path-by-path blob verification after composition:

- #282: 6/6 non-workflow changed paths preserved exactly.
- #283: 34/34 changed paths preserved exactly.
- #284: 5/5 non-canonical-workflow changed paths preserved exactly.
- The only intentional non-identical path is `.github/workflows/one-arbor-canonical-ci.yml`, where the combined branch preserves the union of #282 Pattern Hop/Evidence acceptance coverage and #284 branch-trigger intent, plus an exact-head trigger for this pre-Vercel candidate.

Shared overlapping source was checked before composition:
- `apps/backend/lib/arbor/annabelle/manuscriptRepetition.ts` was byte-identical where shared.
- `apps/backend/lib/ark/stateMachine.ts` carried the same running -> cancelled STOP repair where shared.

## Already proven on component heads

### Pattern Hop / Evidence Engine #282
- focused Pattern Hop/Evidence/ARK acceptance green;
- full backend regression green;
- production backend build green;
- standalone TypeScript green;
- disposable PostgreSQL Pattern Hop run-control acceptance green;
- Flutter regression and synthetic Grove/public-alpha builds green;
- Windows local-LM build/launch/dependency lane green.

### Annabelle #283
- Annabelle/Felt-Life/continuation focused acceptance green;
- TypeScript green;
- production backend build green;
- Flutter analyze and regression green;
- remaining live/editorial gates explicitly held.

### ARK #284
- canonical STOP/retry/torture source hardening reconciled;
- no hosted mutation or live worker activation authorized.

## Combined exact-head acceptance

The combined candidate must pass its own exact-head workflows before it is considered bench-complete:

- `One Arbor canonical exact-head acceptance`
- `One Arbor continuity torture suite`

Component-head green status is evidence, not a substitute for the combined exact-head run.

## Vercel-independent work exhausted by this lane

- canonical source composition of current finish children;
- provenance, contradiction, independence, entity, travel, payment, witness and bounded-reroute source logic;
- Pattern Hop -> Evidence Engine -> existing Roundabout -> exact ARK submission contract;
- STOP/run-lease/restart/idempotency source + disposable DB acceptance;
- archive/continuity/agency torture coverage;
- Annabelle editorial-continuity/Felt-Life/continuation source acceptance;
- Grove proposal-only grant acceptance in disposable PostgreSQL;
- backend regression/build/TypeScript;
- Flutter synthetic builds;
- Windows local-LM build acceptance.

## Protected/live gates intentionally left

These are not to be inferred from CI:

- Vercel Preview deployment of the exact accepted head;
- deployed-head Preview smoke/acceptance;
- hosted Supabase migration/grant application;
- live Pattern Hop run-control schema activation;
- live ARK/Pattern Hop worker/scheduler execution;
- live real-corpus Pattern Hop execution/readback;
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
