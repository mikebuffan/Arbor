# Correction / memory integration review — safe read-only pass

## Current ownership
- Runtime correction state lives in `arbor/runtime/runtimeState.ts`.
- Durable behavior promotion/readback lives in `arbor/runtime/correctionPromotion.ts`.
- Prompt hydration merges durable corrections with conversation runtime state in `buildPromptContext.ts`.
- Memory retrieval uses `memoryRecallQuery` to orient retrieval around the current goal for acknowledgments/continuity cues without converting a saved goal into authorization.
- Behavior projection turns current corrections into guard requirements while preserving one Arbor across Text/Voice/Annabelle.

## Temporal / supersession behavior verified in source
- `mergeCorrections` resolves same-ID observations to the latest timestamp while accumulating genuine occurrences.
- `mergeCorrectionSnapshots` deliberately uses the largest persisted occurrence count rather than summing duplicated cross-thread snapshots.
- durable promotion refuses an older thread replacing a newer permanent calibration by comparing `last_observed_at`.
- durable behavior records are restricted to exact global keys and validated for scope/payload.
- durable promotion requires explicit durable authorization.

## Added safe regression
A #263-only regression test now verifies newest observation wins and copied snapshots do not inflate occurrence counts.

## Boundaries
This review does not copy older divergent memory branches, alter hosted memory records, import more conversation history, or change user scope. Older retrieval/self-memory branches remain a separate reconciliation lane unless a concrete missing behavior is demonstrated.
