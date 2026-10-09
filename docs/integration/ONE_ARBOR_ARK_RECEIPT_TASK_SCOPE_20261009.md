# ONE ARBOR — ARK receipt / task scope fail-closed review
New source-only child of PR #374 exact `c6e12afc80241356f9dc51682c25d533e2589b30`. Scope: Group 1 A09/E08 and Group 2 read-only ARK acceptance evidence. No worker/control/machine-auth changes, no deployment.

## Defect and bounds
`readArkProjectSnapshot` filtered each checkpoint and event row by owned objective ID, but accepted arbitrary `task_id`. A misrouted/provider-shaped receipt could attach a task from a foreign owner or a different owned objective and falsely appear under an allowed objective. This is a *source-level defense-in-depth hole*, not evidence that production data currently contains any bad rows.

## Repair
Use already-scoped task ID → objective ID membership to validate checkpoint references and task-bearing event references. Preserve legitimate objective-level events with `task_id=null`; reject omitted, unknown, blank, foreign or cross-objective task IDs and malformed task IDs. Never treat a checkpoint without a matching owned task as proof of work. Existing SQL ownership filters are retained, no schema migration. Synthetic tests include positive same-task and objective-event controls alongside negative cross-owner, cross-objective, blank and absent links.

## Verification / gates
Source-only CI required on exact new head: existing 15-lane full backend + control + Flutter and focused `readModel.test.ts` plus source SHA verifier. CI is NOT RUN at preparation.
ARK control grant remains OFF and STOP canary queued/zero attempts. No live host acceptance, private user data, migration, auth policy, Vercel settings, online grant or production.
