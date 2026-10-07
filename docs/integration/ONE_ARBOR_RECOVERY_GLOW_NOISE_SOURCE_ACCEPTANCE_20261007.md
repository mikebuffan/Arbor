# One Arbor — recovery and Glow vs Noise source acceptance
Date: 2026-10-07
Mode: isolated draft, synthetic/read-only, no deployment

## Canonical lineage / ownership

Start from the already green review-only #336 candidate (May-route synthetic compatibility),
which preserves the #335 combined green candidate underneath. Do not recreate or
replace original agency, memory, Roundabout, Body, decision workspace, model or ARK.
This handoff is an appendix to the existing One Arbor master, NOT a second ledger.

## Recovery / reorientation

Existing owners:
- Agency state and protected blockers: `lib/arbor/agency/engine.ts` + session.
- Goal and language continuation: `continuity/longitudinalPolicy.ts`.
- Contradiction/uncertainty routing: `runtime/knowledgeRouting.ts`.
- Tool/route failure recovery: `arbor/adapters/recovery.ts` and control backend agency recovery catalog.
- Correction promotion / durable context: existing runtime and memory stores.

New source-only `continuity/conversationRecovery.ts` is a **projection** over
trusted-host observations and the existing agency snapshot, not another loop,
detector or executor. It yields Known / Unknown / Next data while preserving
the current objective and actual blocker. Repeated response trouble is flagged
only after distinct verified observation IDs/sources; a stable result closes
prior diagnostic signal windows but does not delete source history. Contradictory
completion claims cannot close durable work. Missing records remain unknown.
No inferred user medical/emotional state, background work or fabricated recall.
Every diagnostic receipt still needs an authenticated real caller.

## Glow vs Noise / future-outcome protection

Recovered principle: prioritize user-defined consequential outcomes over distractions,
but do **not** label somebody's life priorities from keyword or emotion heuristics.
Actual implementation owner is the existing control-backend
`cognitiveDynamics.ts` function `rankCounterfactuals`.

New source-only `glowNoiseDecision.ts`:
- Accepts explicitly provided user-stated or trusted reviewed-plan priorities.
- Keeps unknown/unreviewed priorities in a review queue, not "Noise".
- Requires source references and nonzero evidence confidence for classifications,
  but never treats references themselves as verified proof.
- Ranks only eligible, reversible, unblocked Glow candidates using the EXISTING
  counterfactual sorter. Optional items cannot be promoted solely by numeric utility.
- Flags irreversible and blocked options for human decision; it grants no action
  permission, personal-capacity determination, or override of human choice.
- Refuses foreign owner/project items and duplicates.

## Acceptance and deliberate negative controls

Recovery:
- ordinary safe unfinished goal keeps its next action;
- 2 distinct response-error receipts produce review, not automatic rewrite;
- duplicate events and shared source are not independent verification;
- stable verified continuation clears old diagnostic window, not durable goal;
- correction after stability reopens review;
- completion conflict holds; blocked goal never unblocks;
- completed work does not resurrect;
- missing goal, foreign owner/conversation, malformed receipts fail closed.

Glow/Noise:
- explicit value label outranks unrelated optimistic heuristic score;
- absence of authority/evidence does not become low importance;
- irreversible/blocked choices are not ranked as actions;
- foreign scope and duplicate IDs are rejected;
- no action, model training, memory promotion, auto-reminder, or task submission.

## Evidence levels and next gates

1. **Source tested**: bounded synthetic cases and existing regressions/TypeScript.
2. **Host wired**: authenticated owner/project caller feeds real state and reviewed
   observation/priority sources. This is NOT achieved by a test fixture.
3. **Behavior accepted**: prospective, privacy-reviewed multi-turn transcript shows
   recovery after real drift and useful Glow/Noise advice with negative controls.
4. **Release accepted**: approved Preview deployment/device/owner grants; separately
   evaluated safety/undo/STOP gates.

No production, main merge, broad ARK worker enabling, new canaries, September 28
task mutation, private corpus publication, paid inference/training, or Grove phone changes.

Do not call this complete until the relevant source CI, trusted-host proof and
real behavioral acceptance are each independently established.
