# One Arbor safe-work archaeology — 2026-10-06

Scope: read-only comparison of historical branches against the isolated #263 source lane. No merges, rebases, deployments, migrations, grants, inference activation, live ARK execution, phone changes, or hosted writes.

## Annabelle / Felt-Life
- Historical `fix/annabelle-editorial-context-20261002` is an ancestor of the current #263 lineage.
- Historical `fix/annabelle-context-reconciliation-20261002` is already represented in the current lineage.
- `arbor/felt-life-atlas-v1` has three commits not literally in current ancestry, but its original atlas and prompt-context wiring are present in current source and have since been expanded. Do not copy the old branch wholesale.

## Agency
- `arbor/agency-durable-continuation`, `arbor/agency-follow-through-guard`, and `arbor-control-agency-durability-recovery` are ancestors of current source.
- `arbor/agency-resume-fix` has five unique historical commits. Its core semantics — persisted agency state, checkpoint-as-continuation, completion proof and no intermediate yield — are present in current `apps/backend/lib/arbor/agency/engine.ts` and the #263 continuation contract. Do not overwrite current engine with the old branch.
- `arbor-agency-host-recovery` contains an old control-backend transient generation recovery helper not present at the same path now. Current adapter recovery already owns retry/alternate/block decisions. This historical helper remains evidence, not an automatic port target.
- `fix/agency-runtime-auto-resume-20260918` contains old runtime auto-resume changes. Current prompt/host continuation rules and durable objective state supersede that location. Preserve semantics; do not resurrect the old runtime wholesale.

## Memory
- `fix/memory-reconciliation-20261002` is an ancestor of current source.
- Older self-memory/retrieval branches still diverge substantially. They are outside this isolated safe lane and must be reconciled by ownership/behavior, not bulk cherry-pick.

## Pattern Hop
- Read-only archaeology of `feat/pattern-hop-combined-source-20261006` and its current run-control/STOP siblings showed that the canonical research lineage already owns the real implementation: run controls, entity resolution, evidence comparison, finding integrity, lead dedupe, timeline analysis, investigation graph, document-hop execution/host, session restart, research bridge and proposed durable run-control storage.
- Duplicate Pattern-Hop helper source briefly added on #263 was removed after this reconciliation.
- #263 must not build, merge, or overwrite a second Pattern-Hop engine/control stack. Remaining Pattern-Hop work is reconciliation and live acceptance in the canonical research lane.

## Conclusion
Historical behavior with a clear current owner was recovered or verified before adding new source. Reconciliation outranks rebuilding. Divergent legacy branches remain evidence until a specific missing behavior is demonstrated.
