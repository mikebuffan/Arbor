# ONE ARBOR — Real external outcome readback and model-acceptance gate (2026-10-10)

## Purpose and authority

Continue the existing D10/E09 and D09/D12 review, without another recommendation engine or another task ledger. Original 97 task IDs and #446's pure advisory planner remain unchanged. This is a read-only external software-outcome check; it does **not** authorize live model calls, private data import, source promotion, self-update, grant/STOP changes, deployment, or action execution.

## Independently observed outcomes

The authenticated GitHub connection was used to read two fixed push-run results from the existing recommendation change:

- **Reproduced regression:** [GitHub Actions 38062557479](https://github.com/mikebuffan/Arbor/actions/runs/38062557479), exact source SHA `1f8c058c79cf1019ee417dfd0b0fff95508409f2`, source workflow `One Arbor verified boundary receipt and chat source acceptance`, completed **failure** specifically in `Verify identity issuer negative and positive controls`; exact source-fingerprint and Vercel no-deploy gates both succeeded. It was an intentionally red test, **not** an adverse real-world choice consequence.
- **Repaired source:** [GitHub Actions 38062786120](https://github.com/mikebuffan/Arbor/actions/runs/38062786120), exact source SHA `ec1fcb9b01ea7cecf2930906ab5416737fb9a9cd`, same reviewed branch and workflow, completed **success**; all required focused/typecheck/full backend/build gates and source safety checks succeeded. These two real CI records demonstrate a source regression and its repair, not a deployed model that learns.

`ops/integration/one-arbor-ci-outcome-readback.mjs` uses the existing authenticated, read-only GitHub API reader. It pins repo, branch, workflow, event, run ID, exact source SHA, job and required safety/test steps. It fails closed if any record is missing, inconclusive, wrong scope, skipped, forged, or inconsistent. Its output is explicitly `software_test_outcome_only` with `realModelDecisionProved=false`, `realWorldChoiceConsequenceProved=false`, `grantsExecution=false` and `changesTaskStatus=false`. No arbitrary CI log text is treated as a source of instructions.

## Live evidence inventory (read-only, no private row contents)

- Supabase Grove project `fqjqpuaoifgbweiguacf` has the three owner/bridge/ARK-grant tables with RLS enabled; it does **not** have `grove_private_turns` or `grove_private_turn_claims` installed. Existing migration ledger contains only the first two Grove access/grant migrations. Private transcript save/reopen with a live model is not accepted.
- ARK Preview `tzbpjbhroxiqftqwatnb` lists zero rows in `decision_outcomes`. Firefly `ncpdlyakrzfvobmwzbon` has 54 `decision_outcomes` rows, but the actual table schema and its writer at `apps/backend/lib/safety/decisionOutcome.ts` show this is **safety telemetry** (severity, risk band, action_taken, postcheck flags), not an exact decision/choice/consequence receipt. Do not pass those rows into D10/E09 as learning truth or copy private contents.
- A Vercel project named `grove-private-api` exists, but its project metadata says `live=false`, its most recent deployment is **CANCELED**, and older `READY` deployment records are historical. Existence of a project or historical ready build does not establish an approved, authenticated Grove private API/model receiver at the required exact source revision.

## Gate for the actual later-model-decision experiment

Do not claim causal model learning until all the following are separately evidenced: (1) approved exact model/provider/revision with explicit spend cap and route; (2) authenticated, owner/project/conversation-scoped producer of distinct decision ID, choice ID and independently observed consequence receipt, with robust replay/foreign-scope rejection; (3) controlled baseline versus candidate real-model decisions on frozen unseen cases with equivalent prompts, tools, permissions, objectives, budgets and evaluator; (4) a different independently authenticated readback of each observed result and negative controls for missing/false/duplicate data; (5) source-to-host-to-device readback, with owner authorization for any new private migration, deployment or real-user data.

**Current acceptance:** genuine external GitHub **software CI** readback and negative tests; NOT real-model generalization, real user consequence, independent choice, or production acceptance. Keep this source-only and draft until exact-head read-only CI confirms the new route.
