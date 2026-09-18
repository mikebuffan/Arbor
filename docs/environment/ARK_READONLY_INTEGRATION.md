# Environment → ARK Read-Only Integration

Status: isolated verification lane. **Do not merge or deploy from this document.**

## Immutable anchors

- Recovered ARK: `2bc30e1c564ca12104d4d7f7752a5bb387b527b8`
- Frozen known-good ARK integration: `d3b216884e279a7add53a72649e421972d0ca557`
- Frozen production/rollback anchor: `16e304442a1f05bfb0db531f396a121bb656f3c0`
- Combined verification branch: `feature/arbor-environment-ark-readonly-20260918`

## Contract

The Environment is an observability surface, not an orchestration engine.

It may:
- read authenticated project-scoped ARK status;
- render objective/task/checkpoint/completion state;
- render attempts, failures, blockers, and stale state;
- fall back to explicitly labeled demo data when ARK cannot be read.

It may not:
- enqueue objectives;
- claim tasks;
- heartbeat workers;
- checkpoint, complete, block, fail, verify, cancel, or retry ARK work;
- enable `ARBOR_ENABLE_ARK_EXECUTION`;
- mutate production.

## Read path

`EnvironmentRuntimeBootstrap`
→ current Supabase user
→ durable `ArborSession` project
→ `ArborApiClient.get('/api/ark/status')`
→ authenticated ownership gate
→ ARK read model
→ `EnvironmentSnapshot`
→ objective strip / objective workspace / work queue / health surface.

The HTTP status route is `GET` only and emits `Cache-Control: no-store`.

## Truth mapping

- ARK queued → Environment IDLE
- ARK running → WORKING only when a next action can be identified
- ARK awaiting_verification → WORKING with an explicit verification next action
- ARK checkpointed → CHECKPOINTED only with a checkpoint receipt
- ARK blocked → BLOCKED only with a concrete blocker
- ARK completed → COMPLETE only with completion evidence
- ARK failed/cancelled or malformed proof state → DEGRADED
- missing/uninstalled ARK runtime → UNAVAILABLE or visibly labeled demo fallback

Task states preserve queued, running, checkpointed, blocked, completed, failed, and
cancelled distinctions. Attempts and checkpoint sequence are shown in task detail.

## Verification gates

The combined branch CI is responsible for:
- backend TypeScript;
- backend tests;
- ARK/status-route lint;
- optimized backend build;
- isolated PostgreSQL migration/ownership smoke;
- Environment-focused Flutter analysis;
- full Flutter analysis as an informational legacy-debt signal;
- Flutter tests;
- Flutter web compile.

A known-good combined checkpoint may be frozen only after the required gates pass.
