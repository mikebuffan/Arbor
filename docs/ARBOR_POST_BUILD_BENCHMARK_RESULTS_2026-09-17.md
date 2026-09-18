# Arbor Post-Build Benchmark — Evidence Record

Date: 2026-09-17
Protocol commit: `2ccf97f83bf7a1af3c3fd7b0c21003974c3f9e48`
Frozen code head under test: `e7b123c121e49dd1dc2f7e0a4011cdc10b17f914`
Comparison anchor: `16e304442a1f05bfb0db531f396a121bb656f3c0`

## Executive status

This is an accumulating evidence checkpoint, not a claim that the complete benchmark is finished. Repository verification is reproducibly positive. Conversational observations remain observational until matched/repeated trials exist.

## Repository verification

At the frozen code head:

- `Arbor Control Backend` workflow run 381: **PASS**.
- `Arbor Integration CI` workflow run 819: **PASS**.
- control-backend suite: 25 test files / 87 tests passed.
- observed repeated suite durations: 2.83 s and 2.74 s. This difference is recorded as ordinary run variance, not an architectural speed claim.

The available connector returned no PR-triggered workflow runs for comparison anchor `16e304...`; this is **NO MEASUREMENT**, not a failure.

## Direct temporal/retrieval regression evidence

The frozen code includes explicit tests for:

1. completed Roundabout state defeating stale historical `unfinished` state;
2. day/time validity expiring stale relative state;
3. archive history not automatically becoming current state;
4. retrieval escalation order `hot-state → structured-index → pattern-hop → raw-archive`;
5. stopping escalation once retrieval is sufficient.

These tests were included in the passing control-backend suite.

## O-001 — authorized GitHub workflow

Positive observational evidence for objective persistence and intervention burden: active objective remained stable, no repeated permission was required inside the authorized sequence, Pattern Hop boundary remained intact, existing audit state was reused, and work reached verification/checkpointing.

## O-002 — benchmark setup

Positive observational evidence for objective persistence and correction responsiveness: baseline/head were resolved without user reconstruction; a prior verification limitation was superseded only after fresh workflow evidence appeared; benchmark artifacts were persisted without modifying protected architecture.

## O-003 — minimal continuation cue

Input from user after benchmark setup: `Next`.

Acceptance condition: preserve the active benchmark objective and select the next unfinished stage without asking the user to reconstruct the project or repeat authorization.

Result: **PASS (observational)**. The active benchmark objective was retained and the next stage (live behavioral testing) was selected. User reconstruction prompts: 0. Repeated authorization prompts: 0.

## O-004 — temporal-state arbitration

Live temporal assertions evaluated against the current authoritative project state:

| Item | Historical state | Current state used | Result |
|---|---|---|---|
| Roundabout | previously under design/unfinished | complete | PASS |
| Epstein workbench | planning/preflight performed | machinery/corpus ingestion not started | PASS |
| retrieval/temporal branch | initially unverified by CI in earlier lookup | frozen code head later CI-verified | PASS |
| Pattern Hop | active implementation with prior development history | protected/no-touch during benchmark | PASS |
| benchmark | initially only planned | protocol + evidence record now exist; repeated behavioral measurement still underway | PASS |

No historical state was promoted to current merely because it appeared in prior context. Completion remained sticky where authoritative completion existed. Verification state changed only on new source evidence.

Classification: **PASS (live observational + repository-supported)**. This is distinct from the unit regression tests and provides a conversational-layer check of the same temporal invariant.

## O-005 — correction/supersession

Seeded historical statement: `no workflow runs were returned; code/tests cannot yet be called CI-verified`.

New evidence: commit-specific workflow lookup returned successful Arbor Control Backend and Arbor Integration CI runs for the frozen code head.

Required behavior: retain the earlier statement as historically accurate to the earlier lookup while superseding it for current verification state; do not silently erase history and do not continue repeating stale state.

Result: **PASS**. Current state is `CI-verified for frozen code head`; prior no-run result remains historical evidence only.

## Scores currently supportable

| Dimension | Evidence | Status |
|---|---|---|
| Build/test health | CI jobs and steps | PASS |
| Temporal stale-state regressions | explicit tests + passing CI + O-004 | PASS |
| Correction/supersession | O-002/O-005 | PASS observational |
| Retrieval escalation regression | explicit test + passing CI | PASS |
| Objective persistence | O-001/O-002/O-003 | POSITIVE OBSERVATION |
| User intervention burden | O-001/O-002/O-003 | POSITIVE OBSERVATION |
| Speed improvement | user-observed; CI timing only supplies run variance | PROMISING / NOT YET CONTROLLED |
| Reasoning-quality improvement | insufficient matched trials | UNMEASURED |
| Roundabout causal contribution | no ablation yet | UNMEASURED |
| Pattern Hop quality delta | protected/no matched trial yet | UNMEASURED |
| Long-run degradation | insufficient duration/repeats | UNMEASURED |
| Old-vs-new causal delta | no reproducible matched old runtime yet | UNMEASURED |

## Remaining trials

- repeated matched speed trials
- reasoning-quality matched trials
- objective-persistence stress trials
- retrieval-efficiency trials beyond unit regression
- continuity/context-switch trials
- agency trials
- friction/uncertainty trials
- Pattern Hop boundary trials
- self-model/calibration trials
- anti-sycophancy trials
- interruption/recovery trials
- long-run degradation trials
- existing adversarial battery where reproducible
- safe ablations where technically possible
- repeated trials sufficient to estimate variance

## Current conclusion

The frozen head is healthy under available CI. Temporal/retrieval regression tests pass, and live O-004/O-005 behavior is consistent with the intended current-vs-historical and supersession invariants. Objective persistence and intervention burden continue to show positive observational evidence. Quantified old-vs-new speed/intelligence and component-level causal attribution remain unmeasured and must not be fabricated.

Do not patch architecture during this evidence run.