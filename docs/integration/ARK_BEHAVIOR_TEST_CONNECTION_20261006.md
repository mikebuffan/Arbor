# ARK behavior-test connection — source handoff

October 6 UTC / October 5 Pacific, 2026. This isolated branch extends the previously tested acceptance runner. It does not replace newer memory, export-reader, Grove or Pattern Hop source.

## User's ordered list

| Step | Evidence / status |
| --- | --- |
| 1. Wire runner into existing host | Source implemented: existing ARK worker registry invokes the existing acceptance runner and agency loop. No second queue or model engine. |
| 2. Start-test and read-result controls | Source implemented: `start_ark_behavior_test`; existing `get_ark_task_result` remains the owned result reader. Submission queues, never executes inline. |
| 3. Restrict access and costs | Separate fresh server-owned client/project grant, flag-off by default, checked-in cases only, one run per case/campaign, durable paid-operation claim, twelve calls per case, bounded tokens/rounds/time. |
| 4. Test failures and retries locally | Backend suite and TypeScript checked; actual executor → runner → agent → verifier path crosses mock provider/storage boundaries. Live database/worker behavior is not established by these tests. |
| 5. Deploy reviewed preview | Open. Existing preview's newest Pattern Hop deployment failed with a type error. Reconcile all newer work before updating the connected preview; this older isolated base must not overwrite it. |
| 6. Grant access and refresh tools | Open. No grant, environment flag, connector refresh or worker activation performed. |
| 7. One small live canary | Open. Default server case list contains only `tired-familiarity`; no paid model call occurred. |
| 8. Eighteen comparisons and fixes | Open. Explicit full-pack activation follows inspected canary capture, then human scoring. |

## Actual source path

Validated MCP token → fresh application grant and owned project → existing atomic `ark_enqueue_objective` RPC → `arbor.behavior-acceptance` task → existing approved worker → current source identity/personality context comparison → durable `ark_events` capture and `ark_tasks` result → existing owned result reader.

`lib/ark/acceptanceContract.ts` owns the exact source, campaign, checked-in pack, model, prompts and fixed budgets. The client supplies only project UUID, request UUID and checked-in case ID. The candidate uses the existing canonical identity anchor and personality projection; the baseline omits that bundle. Both retain Arbor's agency engine and verifier. This is a bounded text/identity-context ablation, not a full-system/unmodified-model comparison or production prompt parity result. Synthetic fixtures do not prove durable memory, true process restart, subsystem switching or acoustic voice quality.

No new table, migration, dependency, general code executor or public context override was added. Captures are synthetic, owned and stored in the existing event table. Large task results retain the existing 20,000-character truncation indicator; a clipped result is not sufficient full evidence. Inspect/export the owned host capture when necessary. No scoring rubric is passed to inference.

## Authorization, costs and retries

The new permission is `ark.submit.behavior_acceptance`, independent of `ark.submit.read_tasks`. Fresh `app_metadata.arbor_ark_mcp` must contain the verified OAuth client ID, intended owned project ID, and new permission. User-editable metadata or claimed token scopes do not authorize it. The worker rechecks the current administrator-owned grant and project ownership before claiming paid execution. Profiles add `oauthClientId` and `canSubmitBehaviorTests`; these identify the validated connection after deployment, not a guessed client ID.

`ARBOR_ENABLE_ARK_MCP_ACCEPTANCE=true` is required for discovery, invocation and worker execution. Existing worker activation/canary gates still apply. Submission does not enable workers. Flag-off stops further model requests, but cannot undo an already-running provider request. Revocation blocks subsequent task starts; in-flight work is not retroactively cancelled.

The server's campaign/config/pack hash and case determine the objective key. A new request UUID cannot create a second run in that owned scope. Initial canary mode permits one case per configured project/campaign, at most twelve provider calls. Full-pack mode permits eighteen case slots, each with that same maximum; grants should cover only the intended test project. This is a finite campaign quota, not a distributed per-minute rate limiter or global multi-project spending ceiling. Changing reviewed server campaign/config creates a new quota and must be deliberate.

Tasks have one attempt. Existing durable operation idempotency prevents paid replay after uncertain execution or crash; an unfinished operation blocks instead of pretending it completed. Captured operations replay their stored result. A server-reviewed new campaign is required for a deliberate rerun. A failed capture remains a failed task; partial events are retained, and no automatic retry buys another model call. Every request/response, tool and verification event is inserted into the existing owned durable event stream. Event-write failure stops generation. Worker heartbeats renew the lease; each provider request has zero retries and a timeout bounded by fifteen seconds and the remaining 45-second executor deadline. Storage/auth overhead still depends on the host's own timeout settings.

`verified: true` on a completed task means that both arms were captured, not that Arbor passed behavioral acceptance. The output says this explicitly and contains empty human judgments. The existing objective verifier validates task-capture completion only.

## Exact host activation work still required

1. Reconcile this branch with the current memory/export/Grove/Pattern Hop release. Preserve newer changes. Run its combined tests and build; verify the exact deployment source.
2. Keep acceptance submission and full-pack mode disabled for the deployment. Configure the host model using existing secrets; do not extract or paste credentials into chat. `VERCEL_GIT_COMMIT_SHA` supplies deployed source identity, with `ARBOR_ACCEPTANCE_SOURCE_COMMIT` available for a reviewed non-Vercel host. Set `ARBOR_ACCEPTANCE_CAMPAIGN` to a reviewed bounded campaign name. No client-controlled prompt configuration exists on this route.
3. Read the newly deployed profile to identify the actual OAuth client ID. Apply only the intended server-owned client/project acceptance grant through the trusted administrator path. Validate live ownership, grants, RLS, enqueue idempotency, event insert access and result readback; source mocks are not substitutes.
4. Enable `ARBOR_ENABLE_ARK_MCP_ACCEPTANCE` for that reviewed preview and refresh connector discovery. Verify ungranted accounts/projects are denied and the profile's effective permission is accurate. Existing approved objective-scoped worker canary procedure remains required.
5. Submit `tired-familiarity` once. Retry the same request and then a new request ID; verify identical durable task/objective IDs and no duplicate paid execution. Retrieve its actual status, complete capture and eight-or-fewer normal-path model receipts, preserving any failure. A queue receipt does not close this gate.
6. After independent capture inspection, deliberately enable `ARBOR_ACCEPTANCE_ALLOW_FULL_PACK=true`. This changes the contract hash/quota and is a new reviewed campaign boundary. Run each of the eighteen cases separately. Preserve failures, score replies blind to condition where feasible, and leave unsupported memory/acoustic criteria unknown. Do not call an unscored capture a passing test.
7. Disable acceptance submission and revoke the separate grant when appropriate. Read-only results remain available; retain audit history.

## Observed preview blocker

Read-only Vercel inspection found preview deployment `dpl_EEvFiA2RPdcpcZpMcXhnijgg3RGh` in ERROR for `feat/pattern-hop-memory-integration-20261006`, source `446404000792487d928c6e47bb7ba4c4ba34dc03`. Its build log reports `apps/backend/lib/arbor/agency/arborTools.ts:93:27`: property `handoff` does not exist on the Pattern Hop return type. This is separate newer work, not an acceptance-runner failure. It is not assumed to be the serving deployment, and no alias was moved or deployment retried. The connection update must preserve that work and its correction.

Current connection profile still reports read-only. No live permission change, database write, model generation, deployment, merge or broad worker activation occurred in this pass.

## Validation and references

Full backend suite: 741 tests pass, zero failures, 134 files. Standalone TypeScript and diff checks pass. The ten offline comparison-tool checks passed in the previous runner pass. The source integration test connects the actual executor, runner, agent and verifier with a mock provider/storage boundary and captures eight request/response pairs, without creating live acceptance evidence. The previous local production build was blocked downloading existing Google Fonts; no unrelated font/layout edits were made. The inspected remote build failure above concerns another source commit.

Authorization documentation checked: Supabase [token security and RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security), [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), and [changelog](https://supabase.com/changelog). The markdown changelog endpoint could not be fetched through the search service; its HTML changelog was inspected. Standard OAuth identity scopes do not grant application task permissions. No new Supabase feature or schema was introduced.
