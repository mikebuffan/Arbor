# One Arbor Low-Conflict + ARK Reconciliation — 2026-10-06

## Purpose

Reconcile the current green ARK offline STOP/resume lane onto the green low-conflict One Arbor staging line without reintroducing stale shared code.

## Starting point

- staging PR: #302
- staging head: `7723e513f5dfd6b571fc7b801aeb4fc54600a601`
- focused staging acceptance: SUCCESS
- source base lineage: exact green #286

## ARK source

- source PR: #291
- source head: `ee71e456510ed4e329d7c30e0bfb22e576d8e327`
- source base: `3c599ffd655409d8f72116ec857b76dfa646bd50`
- workflow: ARK offline finish verification
- exact-head run: `37576404820`
- result: SUCCESS

That run covered focused ARK durability tests, lint, STOP/resume migration smoke, stale-worker fencing, repeated STOP idempotency, blocked-objective resume, concurrent-worker duplicate-claim prevention, Flutter status fidelity, full Flutter regression, and a synthetic Grove APK build.

## Reconciliation method

For every #291 changed path, compare the exact blob at:
1. #291 base,
2. #291 head,
3. #302 staging.

Result:
- 25 paths had #302 exactly equal to the #291 pre-change base and were safe to transplant directly.
- One path had independent canonical changes: `apps/backend/lib/mcp/registerArkTaskTools.ts`.

The ARK lane-specific workflow file was intentionally not copied into the integration tree; integration acceptance gets its own exact-head workflows.

## Semantic merge

Conflict path:
`apps/backend/lib/mcp/registerArkTaskTools.ts`

Canonical #302 behavior preserved:
- `arkTaskReadbackFlags`
- distinct terminal/completed task-status interpretation

#291 behavior added:
- `SupabaseArkStore`
- separate objective-control authorization gate
- `control_ark_objective`
- owned objective scope verification
- STOP/cancel and blocked-objective resume
- normalized objective-control errors

Merged blob:
`cd9022513351557c46bc2eaf2471cf250f8cf4b7`

Checks performed before commit:
- task-status flags present
- ARK store present
- objective-control tool present
- objective-control authorization gate present
- bounded read-task submission preserved
- Pattern Hop MCP registration preserved

## Integration commit

- composed tree: `660425b7393a75a33164644283993be8981ff17c`
- commit: `162361d7ae025cb5110f753ca9ef6bb85f2c1482`
- parent: exact #302 head
- changed files: 25
- behind #302: 0
- blind merge: no

## Boundaries

This source candidate does NOT:
- merge main
- deploy Vercel or production
- apply hosted migrations
- grant objective-control authority
- enable ARK submission
- activate workers
- execute live user research
- mutate live Preview
- install on a physical phone
- activate independent-model inference

Objective control remains separately gated and project-scoped.

## Required exact-head acceptance

Before treating this as the next One Arbor anchor:
- full canonical One Arbor regression
- low-conflict lane focused acceptance
- ARK focused durability acceptance
- STOP/resume disposable PostgreSQL smoke
- concurrency/lease fencing
- full backend build + TypeScript
- Flutter acceptance
- local-LM source/build acceptance

