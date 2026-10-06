# Research backlog reconciliation — 2026-10-06

This queue is architectural/investigative work-state, not a list of allegations.

## Existing stack — do not rebuild
- #224 ingestion/verification v1
- #225 corpus intelligence v2
- #226 investigation workbench v3
- #228 reproducibility/scale v4
- #229 security v5
- #230 preview integration v6
- #231 source privacy/operator controls v7
- #250 saved research custody handoff
- #262 durable Pattern Hop STOP/run lease

## Closed by this source audit
- explicit conservative independence assessment primitive;
- explicit Claim↔Evidence↔Counterevidence summary primitive;
- bounded failed-lead rerouting primitive;
- torture matrix for mirrors, aliases, timeline ambiguity, counterevidence, STOP/restart and privacy;
- large-corpus manifest/scaling/recovery contract;
- end-to-end acceptance contract.

## Remaining live/integration gates
- selectively reconcile this audit and #262 onto the eventual stable One Arbor candidate without overwriting newer research callers;
- hosted run-control schema approval/application;
- real bounded worker execution against authorized benign/public fixtures;
- live STOP/lease/restart receipt;
- corpus manifest/coverage measurements on actual authorized corpus state;
- operator dashboard wiring if current UI lacks the required metrics;
- real research backlog dedupe requires the actual saved lead/finding store, not architecture guesses;
- no scheduler/source capture activation without explicit authorization.

## Completion states
discovered → authorized → captured → parsed → indexed → reviewed.
lead_found → investigated → corroborated/contradicted/unresolved/closed.
These state machines must not be collapsed into "done".
