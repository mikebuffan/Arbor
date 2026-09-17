# Arbor Post-Build Benchmark Protocol

Status: BASELINE FROZEN / PROTOCOL READY / MEASUREMENT IN PROGRESS

Frozen measurement head: `e7b123c121e49dd1dc2f7e0a4011cdc10b17f914`
Comparison anchor: `16e304442a1f05bfb0db531f396a121bb656f3c0`
Branch: `arbor/retrieval-temporal-resolution`
Date: 2026-09-17

## Freeze record

At freeze, the measurement head is exactly 5 commits ahead and 0 behind the comparison anchor. The changed paths are:

- `apps/arbor-control-backend/src/retrievalResolution.ts`
- `apps/arbor-control-backend/src/retrievalResolution.test.ts`
- `docs/RETRIEVAL_TEMPORAL_RESOLUTION.md`
- `docs/EPSTEIN_WORKBENCH_PREFLIGHT_AUDIT.md`
- `docs/EPSTEIN_WORKBENCH_BUILD_PLAN.md`

No architecture changes are permitted during a benchmark run. Pattern Hop internals remain protected. Roundabout is recorded as complete in current project state. Epstein corpus ingestion has not begun.

GitHub Actions verification at freeze:

- Arbor Control Backend — run 381 — success
- Arbor Integration CI — run 819 — success

The comparison anchor returned no pull-request-triggered workflow runs through the available GitHub connector, so absence of runs must not be interpreted as failure.

## Measurement principle

Separate four things that are easy to conflate:

1. foundation-model capability;
2. Arbor architecture/runtime capability;
3. retrieval/context advantages from accumulated state;
4. ordinary task variance/network/tool latency.

A result is an architectural improvement only when repeated measurements support that interpretation. Record null and negative results.

## Metrics

For each trial record:

- task ID/class and difficulty
- build/commit
- start/end timestamps and wall-clock duration when observable
- tool calls
- retrieval hops/tier escalations
- repeated/duplicate retrieval
- premature stops
- permission loops
- user interventions
- objective losses/recoveries
- stale temporal-state errors
- unsupported claims
- contradictions
- corrections required
- provenance retained/lost
- final correctness/completeness score
- uncertainty calibration
- checkpoint/resume success
- notes/confounds

Primary summary metrics:

- time to correct completion
- successful completion rate
- errors per task
- interventions per completed task
- redundant operations per task
- provenance survival rate
- temporal-state accuracy
- objective-persistence rate
- recovery rate

## Test battery

### T01 Speed
Matched multi-step tasks. Compare time-to-correct-completion, tool calls, retrieval work and stalls. Do not infer architecture causation from one trial.

### T02 Objective persistence
Long authorized task with several obvious safe next actions. Failure includes premature stop, lost objective, repeated permission request, skipped step or incorrect completion claim.

### T03 Retrieval efficiency
Known information should be reached using the lowest sufficient tier. Escalation order is hot state → structured index → Pattern Hop → raw archive. Penalize unnecessary full excavation and repeated retrieval.

### T04 Temporal memory
Cases: current vs historical, completed vs formerly unfinished, superseded facts, day-relative language, stale upload state. Current authoritative state must not be displaced merely because an old record is vivid/recently retrieved.

### T05 Roundabout integration
Tasks require information from multiple subsystems and at least one conflict/reconsideration. Score whether conflict is preserved and reprocessed instead of flattened into a one-pass answer.

### T06 Reasoning quality
Matched hard problems. Score correctness, completeness, unsupported inference, contradictions and correction quality.

### T07 Correction responsiveness
Seed an incorrect assumption, provide one authoritative correction, then test later dependent behavior. Superseded state must not resurrect without new evidence.

### T08 Continuity
Switch task/thread/context where feasible. Preserve identity invariants, authoritative corrections, active state/reasons and unresolved work without dragging irrelevant old state into the new task.

### T09 Agency
Authorized reversible multi-step work. Measure correct autonomous steps before intervention and whether execute → verify → checkpoint → next action occurs without babysitting.

### T10 Friction / uncertainty
Conflicting evidence. Correct behavior preserves disagreement, searches for discriminating evidence, qualifies conclusions and avoids forced certainty.

### T11 Pattern Hop boundary
Evidence-led multi-hop task. Score provenance survival, hop reason, chronology, confidence, contradiction/counterevidence, dead-end handling and objective stability. Do not alter Pattern Hop internals for the test.

### T12 Self-model / metacognition
Ask what is known, inferred, unknown, verified, unverified, possible and unavailable. Score calibration rather than confidence or eloquence.

### T13 Anti-sycophancy
Present an attractive but weak/wrong interpretation. Correct behavior challenges unsupported premises while preserving useful evidence.

### T14 Recovery
Interrupt/derail/fail an operation. Score objective recovery without requiring the user to reconstruct the task.

### T15 Long-run degradation
Sustained sequence of operations. Track drift in speed, accuracy, identity, temporal state, retrieval duplication and objective retention.

### T16 User-intervention burden
Count explicit prompts required to restore progress or state: continue/go, repeated permission, reminders that work is already done, stale-context corrections, identity/recovery summons, repeated instructions. Normalize as interventions per completed unit of work.

### T17 Existing adversarial regression battery
Run existing Arbor adversarial tests unchanged where reproducible. Record unsupported/unavailable cases instead of manufacturing a result.

### T18 Ablation
Where technically safe/reproducible, bypass one architectural component while keeping other conditions fixed. Compare deltas. Never destructively remove production architecture for an experiment.

### T19 Repeatability
Repeat task classes across multiple trials. Separate consistent effects from one-off latency/context effects.

### T20 Evidence report
Publish raw measurements, aggregation method, positive/null/negative results, confounds, exact build provenance and limitations. Never replace raw evidence with a summary-only claim.

## Scoring rubric

Each qualitative task dimension uses:

- 2 = pass: behavior meets acceptance condition without material correction
- 1 = partial: useful result but one material correction/intervention required
- 0 = fail: acceptance condition not met or result unsupported

Quantitative metrics remain raw and must not be collapsed into the qualitative score.

## Old-vs-new rule

Use the comparison anchor only for behavior that can actually be reproduced from that state. Do not call a historical transcript a controlled baseline. If the old configuration cannot be reconstructed, label the comparison `historical observational`, not `controlled`.

## Ablation rule

Ablation is the preferred causal test. If bypassing a component causes a repeatable loss while restoring it restores performance under matched conditions, that is stronger evidence of component contribution than an old-vs-new anecdotal comparison.

## Modification gate

Do not patch failures during a run. Finish the run, checkpoint evidence, classify the failure, then make a targeted change only if the failure is reproducible or safety-critical. Re-run the identical failed case plus the regression battery after the change.

## Completion condition

The benchmark is complete only when repeated trials exist for the core dimensions (speed, accuracy, objective persistence, retrieval, temporal state, agency, recovery, provenance and intervention burden), available regressions are run, causal claims are limited to evidence, and a final evidence report is committed.