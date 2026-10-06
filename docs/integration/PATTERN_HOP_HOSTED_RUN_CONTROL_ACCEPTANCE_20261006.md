# Pattern Hop hosted run-control acceptance — 2026-10-06

Preparation only. Proposed migration remains unapplied.

After reviewed hosted schema approval:
1. apply only PROPOSED_pattern_hop_run_control_20261006.sql to preview;
2. verify owner/project isolation and expected indexes/constraints;
3. create one bounded Pattern Hop run with deterministic request/run identity;
4. acquire its lease once; second worker must not acquire an unexpired lease;
5. checkpoint after a bounded hop;
6. request STOP;
7. prove no later hop/checkpoint advances after STOP is observed;
8. resume only a non-stopped checkpointed run using the same run identity;
9. simulate expired lease takeover and prove only one new owner;
10. retry same request/run id and prove no duplicate run;
11. verify provenance/source ids survive checkpoint/resume;
12. verify contradiction, independence, alias/entity gates and bounded branching still pass existing Pattern Hop tests;
13. remove disposable acceptance rows; do not enable scheduler.

LIVE_PROVEN requires hosted receipts for lease, STOP and resume. Source/CI success alone remains SOURCE_TESTED.
