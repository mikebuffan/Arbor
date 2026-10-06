# Annabelle Engine Suite — implementation audit
Base: Buffalo head `65f7ae96a4162b6ef5f069713d685c01c4517b19`
Branch: `feature/annabelle-engine-suite-20261006`

## Rule
Do not duplicate existing Arbor/Annabelle systems. Reconcile first. No production activation or inference activation from this branch.

## Verified existing foundation
- Annabelle workspace persistence + revisions/rollback.
- Canon, locked passages, scene state, unresolved decisions, working delta.
- Editorial evidence bridge with canonical manuscript selection, source hashes, supersession/rejection filtering, epistemic status and Gold/voice evidence.
- Felt-Life Atlas implementation exists but is a starter atlas, not the intended full corpus.
- Continuity/runtime memory projection exists.
- ARK/editorial read boundary exists on the separate editorial preview line.

## Immediate gaps converted to executable diagnostics
- sensory default vocabulary / expansion prompts;
- archive/evidence-humor density;
- "your face"/face-says-it shortcut density;
- internal commentary/prose-tic clustering;
- clean-turn dialogue naturalism warning;
- duplicate/assembly warning.

These diagnostics are advisory: they flag density, never ban a word, joke, construction or motif.

## Remaining implementation
Use `ANNABELLE_ENGINE_CATALOG` as the reconciliation ledger. Priority:
1. Expand Felt-Life Atlas substantially, preserving hypothesis-not-verdict behavior.
2. Explanation/redundancy + trust-reader detector.
3. Repetition-intent classifier so motifs are protected.
4. Rhythm/fragment density.
5. Raw Gravity.
6. Camera/discovery density.
7. Internal clock + scene-change + screen-time.
8. Post-rewrite Book Engine regression.
9. Wire diagnostics to existing editorial record/checkpoint system with provenance.
10. Chapter Two acceptance fixture: must flag repeated default sensory language, archive-humor density, face-says-it family and overly polished banter without rewriting automatically.

## Safety / authority
Diagnostics propose evidence-backed editorial problems only. They do not rewrite locked text, change canon, merge branches, deploy, or activate autonomous work.
