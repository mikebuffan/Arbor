# Arbor Post-Build Benchmark — Evidence Record

Date: 2026-09-17
Protocol commit: `2ccf97f83bf7a1af3c3fd7b0c21003974c3f9e48`
Frozen code head under test: `e7b123c121e49dd1dc2f7e0a4011cdc10b17f914`
Comparison anchor: `16e304442a1f05bfb0db531f396a121bb656f3c0`

## Executive status

This is the first evidence checkpoint, not a claim that the complete benchmark is finished. The repository-level verification that is currently reproducible is positive. Conversational observations of faster/cleaner execution are recorded as observational evidence only until matched trials exist.

## Repository verification

At the frozen code head:

- `Arbor Control Backend` workflow run 381: **PASS**.
  - control-backend tests: PASS
  - control-backend TypeScript build: PASS
- `Arbor Integration CI` workflow run 819: **PASS**.
  - backend tests: PASS
  - backend build: PASS
  - control backend tests: PASS
  - control backend build: PASS
  - Flutter generated-state verification: PASS
  - Flutter analyze: PASS
  - Flutter tests: PASS
  - Android debug APK build: PASS

The available connector returned no PR-triggered workflow runs for comparison anchor `16e304...`; this is **NO MEASUREMENT**, not a failure.

## Direct temporal/retrieval regression evidence

The frozen code includes explicit tests for:

1. completed Roundabout state defeating stale historical `unfinished` state;
2. day/time validity expiring stale relative state;
3. archive history not automatically becoming current state;
4. retrieval escalation order `hot-state → structured-index → pattern-hop → raw-archive`;
5. stopping escalation once retrieval is sufficient.

These tests were included in the control-backend suite that passed at the frozen code head.

## Current-chat observational trial O-001

Task class: authorized GitHub audit/documentation workflow.
Observed behavior after the new architecture work:

- active objective remained stable across successive repository operations;
- no repeated user permission was required inside the authorized sequence;
- protected Pattern Hop boundary remained intact;
- existing audit state was reused rather than re-excavated;
- work proceeded through verification and durable checkpointing;
- user independently noticed a substantial speed difference immediately after the run.

Classification: **positive observational evidence**, not a controlled old-vs-new measurement. Tool/network latency and prior context preparation are confounds.

## Current-chat observational trial O-002

Task class: benchmark setup itself.

Observed behavior:

- baseline branch/head resolved without user reorientation;
- comparison anchor verified;
- workflow verification discovered and corrected an earlier audit limitation: workflow runs do exist for the frozen code head;
- successful CI was inspected down to job/step level;
- benchmark protocol was persisted without changing Pattern Hop internals or ingesting the Epstein corpus.

Classification: **positive objective-persistence / correction-responsiveness observation**. Not an old-vs-new controlled trial.

## Scores currently supportable

| Dimension | Evidence | Status |
|---|---|---|
| Build/test health | CI jobs and steps | PASS |
| Temporal stale-state regressions | explicit tests + passing control-backend CI | PASS |
| Retrieval escalation regression | explicit test + passing control-backend CI | PASS |
| Objective persistence in current workflow | O-001/O-002 | POSITIVE OBSERVATION |
| User intervention burden | O-001/O-002 | POSITIVE OBSERVATION |
| Speed improvement | user-observed + workflow behavior | PROMISING / NOT YET CONTROLLED |
| Reasoning-quality improvement | insufficient matched trials | UNMEASURED |
| Roundabout causal contribution | no ablation yet | UNMEASURED |
| Pattern Hop quality delta | protected/no matched trial yet | UNMEASURED |
| Long-run degradation | insufficient duration/repeats | UNMEASURED |
| Old-vs-new causal delta | no reproducible matched old runtime yet | UNMEASURED |

## Critical correction captured during benchmark setup

An earlier preflight audit said no workflow runs were returned and therefore code/tests could not be called CI-verified. A fresh commit-specific lookup now returned two successful workflows for the frozen code head. The current evidence therefore supersedes that earlier verification limitation for commit `e7b123...`.

This is itself useful correction-responsiveness evidence: verification state changed only after new source evidence was retrieved; the historical statement remains historically accurate to what the earlier lookup returned but is no longer the current verification state.

## Remaining trials

Still required before a final capability claim:

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

The frozen head is healthy under the available CI, and its new temporal/retrieval regression tests pass as part of that suite. The immediate conversational behavior supplies positive observational evidence for lower friction, stronger objective persistence and lower intervention burden. There is not yet enough matched repeated evidence to quantify an old-vs-new speed or intelligence delta or attribute it causally to one architectural component.

Do not patch the architecture in response to this checkpoint. Continue collecting matched evidence against this frozen code head.