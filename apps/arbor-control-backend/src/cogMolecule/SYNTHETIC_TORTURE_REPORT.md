# Cog Molecule Synthetic Torture Gate

Status: synthetic gate passed on the experimental branch. This is not evidence of general model superiority and is not a production-readiness claim.

## Gate covered

- late evidence that requires recurrence
- reordered evidence arrival
- single and multiple contradictions
- missing/required provenance
- unsupported claims that must SEEK rather than assert
- association versus culpability inflation
- late correction of an earlier hypothesis
- repeated/noisy retrieval
- identical repeated observations versus genuinely conflicting observations sharing an id
- selective compute escalation after late friction
- convergence must not substitute for validation

## Latest adversarial comparison

Constructed 11-case diagnostic using the same cogs/validator/projector for recurrent candidate and one-pass linear control.

Candidate:
- accuracy: 1.0 (11/11)
- false release rate: 0
- mean compute: 2.5455
- Brier score: 0.0724
- assert rate: 0.8182

Linear control:
- accuracy: 0.2727 (3/11)
- false release rate: 0
- mean compute: 1.0
- Brier score: 0.2309
- assert rate: 0.0909

Linear failures in this constructed set: late evidence, reordered arrival, contradiction, multi-contradiction, provenance verification, association qualification, late correction, noisy retrieval.

## Regression result

Full Arbor control-backend run on the expanded torture commit:
- 35/35 test files passed
- 116/116 tests passed
- TypeScript build passed

## Failure preserved during development

The first adversarial run failed late-evidence recurrence at 5/6 accuracy because the same late observation was appended each circulation, preventing convergence. The repair made packet normalization idempotent for exact repeated observations while preserving genuinely conflicting observations. Dedicated regressions now cover both cases.

## Interpretation

This result supports only the narrow statement that the recurrent runtime behaves as designed on these constructed adversarial diagnostics and can outperform the one-pass control on cases that require later information, reopening, or repeated circulation. It pays additional compute for that behavior.

The next meaningful gate is structured real material from the export pipeline. Do not switch production Arbor, merge the experimental branch, or claim broad cognitive superiority from this synthetic gate.
