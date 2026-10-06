# Cross-workstream reconciliation — 2026-10-06

Base: Buffalo #249 head `65f7ae96a4162b6ef5f069713d685c01c4517b19`.
Current child: PR #263.

## Existing work recovered; do not duplicate
- Agency durable continuation: branch `arbor/agency-durable-continuation`.
- Agency follow-through behavior guard: `arbor/agency-follow-through-guard`.
- Agency resume blocker/checkpoint distinction: `arbor/agency-resume-fix`.
- Felt-Life live prompt wiring: `arbor/felt-life-atlas-v1`.
- Grove combined phone acceptance: `arbor/grove-combined-acceptance-20261006`.
- ARK spine continuation / Grove bounded ARK handoff: `arbor/ark-spine-20261006`.
- Pattern-Hop durable STOP siblings remain distinct unfinished live-run-control work.

## Source truth recovered from ARK spine
The ARK spine already has a bounded Grove -> ARK objective route, runtime-goal/capture proposals, owner/project/conversation/objective grant boundaries, restart acceptance, and terminal replay. Preserve these. Do not build another ARK queue, goal store, transcript store, or hydration engine.

The ARK spine explicitly leaves these protected/live:
- private LM foundation/tokenizer/receiver verification;
- exactly-once GPU generation participation by the private receiver/shared runtime;
- deployed Pattern-Hop durable STOP + atomic continuation lease;
- hosted grants/migrations;
- signed phone install and real private inference;
- live ARK objective execution;
- main merge/deployment.

## #263 source scope
#263 remains an isolated repair/audit child until reconciled with the newer Grove/ARK spine lineage. It contains:
- host checkpoint/continuation repair and source tests;
- Annabelle/Felt-Life executable source coverage and regression fixtures;
- advisory editorial provenance/checkpoint/dedup source;
- agency torture/completion-evidence fixtures;
- isolated Pattern-Hop STOP/lease/provenance/alias/contradiction/branching contracts;
- One Arbor identity/capability/reconciliation contracts.

It must not silently supersede #259/#260 or activate their gates.

## Cross-off status
- Root cause for chunk/status/wait-for-GO: FOUND.
- Lower-level checkpoint non-yield semantics: EXISTING.
- Host continuation contract/regression: SOURCE IMPLEMENTED in #263; LIVE PROOF PENDING.
- Same-action bounded ARK retry: SOURCE IMPLEMENTED in #263; requires reconciliation against #260.
- Durable background continuation: PARTIAL; live worker/heartbeat remains gated.
- Grove -> ARK bounded objective route: EXISTS in #260, protected.
- Grove restart continuity acceptance: EXISTS in #260.
- Felt-Life Atlas live prompt wiring: EXISTS; atlas remains intentionally open-ended/partial.
- Annabelle durable editorial state: EXISTS.
- Annabelle engine categories: EXECUTABLE SOURCE COVERAGE EXISTS; canonical Chapter Two/live acceptance pending.
- Pattern-Hop durable remote STOP/atomic run lease: SOURCE CONTRACT EXISTS in #263; hosted integration pending in research lane.
- Private LM exact tokenizer/context proof: BLOCKED on private runtime package.
- Exactly-once GPU generation: BLOCKED on private receiver/shared runtime participation.
- Preview deployment of #263: Vercel quota/rate-limit gated.

## Rule
Source-complete is not live-complete. Do not promote synthetic/source evidence into deployment or behavior claims.
