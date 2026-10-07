# ONE ARBOR — Group 01 canonical source, owner, receipt and release-gate ledger

Snapshot: 2026-10-07, approximately 23:15 UTC. **Review evidence only; not a runtime ledger, release, or authorization grant.**
Scope exactly: A01, A02, A08, A09, A10, A12, E08, F16.
Reference: owner's ONE_ARBOR_97_TASK_MASTER_G09_G11_20261007.md (Library). This document is the single Group 01 **review** reconciliation, not a competing scheduler, engine, private memory store, or substitute for ARK's durable source of truth.

## 1. Authority and the five separate notions of "done"

1. **Source:** immutable Git SHA/PR head. A draft PR has not merged merely because CI succeeded.
2. **Deployed:** a Vercel deployment ID, READY status, target, source SHA, plus exact alias resolution. A URL displaying a site is not automatically the intended release.
3. **Permission:** current authenticated principal, authorized project, capability grant, and tool visibility. Source code flags do not establish live grants.
4. **Completed:** the task's durable terminal state *and* result/checkpoint/evidence receipt. A submit, queue, build, or cancellation is not success.
5. **Released:** an explicit owner-approved version, independent production/Preview acceptance, proven rollback target and correct alias. This is **NOT AUTHORIZED** here.

No claim should cross one of these boundaries without a separate observation. Snapshot drift requires a new dated ledger revision, not retroactive rewriting.

## 2. Current source lineage and collision map

| Lane | Immutable source / GitHub evidence | Truth and ownership |
| --- | --- | --- |
| Frozen Preview source | [PR #322](https://github.com/mikebuffan/Arbor/pull/322), head f4021985b475651284c97aecbc3bdf03123478cc | Open draft, unmerged; observed READY on firefly-ark-sandbox Preview deployment dpl_HAzY1hSBgF87VbVnnFhjawDaVpap. **Deployed source**, not a main merge or production authorization. Group 01 owns version provenance. |
| Hosted acceptance lane | [PR #326](https://github.com/mikebuffan/Arbor/pull/326), head 85cb0e602cce9d07ceea31f1c6fadab33c3df390 | Open draft sibling off #322; Group 02 owns hosted trigger, STOP and checkpoint acceptance. Do not edit/replay its canary. |
| Successor integration | [PR #340](https://github.com/mikebuffan/Arbor/pull/340), head 595375d525cf561172449726ed0c086ab4ece7db | Open draft / unmerged, source-only. Includes #335 > #336 > #338 > #339 ancestry plus reconciled #337 STOP source. GitHub run 37694327754 completed SUCCESS. **Not a proven deployed live successor.** |
| Grove professional UI | [PR #341](https://github.com/mikebuffan/Arbor/pull/341), head 500b1ad6cf2127a7f98ed65be515a310faf6c1ee | Draft child of #340; G09/Group 13 owns. CI run 37696878118 SUCCESS. Not device accepted or deployed. |
| Grove Diary | [PR #342](https://github.com/mikebuffan/Arbor/pull/342), head b554eef0a967933c86c5ec13dda5d863177c7640 | Draft child of #341; G11/Group 15 owns. CI run 37699549851 SUCCESS. Manual unsaved draft only. |
| Group 01 | Independent branch review/one-arbor-group01-canonical-ledger-20261007 based on exact #340 head | ONLY this ledger and its branch-specific source-only Vercel build-ignore entry; no ownership of #326, #341, #342, worker or app runtime files. |

Existing source files from #340 audited read-only:
- apps/backend/lib/arbor/agency/state.ts scopes agency loads by user_id/project_id and uses revision/CAS or first-claim RPCs on guarded paths. It also has a non-CAS upsert fallback; do not infer universal concurrency safety.
- apps/backend/lib/arbor/runtime/runtimeStateStore.ts filters owner/project/conversation and checks stored state identity; scoped correction recall is source logic, not a live foreign-owner test.
- apps/backend/lib/arbor/continuity/conversationRecovery.ts deduplicates observation IDs, rejects conflicting repeated IDs and mismatched scopes, and explicitly grants no execution.
- apps/backend/lib/arbor/host/recoveryReadProjection.ts refuses to authenticate the user itself; its trusted caller must do that before supplying inputs. Do not promote a pure view into an authorization proof.
- #326 source: apps/backend/app/api/preview/ark/acceptance/route.ts requires preview environment, dedicated flag, machine authorization, configured canary UUID and exact header match. apps/backend/lib/ark/previewAcceptance.ts bounds the source cycle to **one task / 20,000 ms**. Not evidence that this draft route is currently live.
- ops/grove/source-only-ignore.mjs is an existing exact-branch ignore allowlist. This Group 01 branch adds its own explicit exclude; whether each Vercel project evaluates that command must be observed rather than assumed.

## 3. Deployment identity: Vercel readback (not release authorization)

| Project/URL or deployment | Observation | Consequence |
| --- | --- | --- |
| firefly-ark-sandbox; dpl_HAzY1hSBgF87VbVnnFhjawDaVpap | READY, target null, ref integration/one-arbor-prelive-final-20261007, SHA f4021985..., one branch-specific alias firefly-ark-sandbox-git-integrat-f7dda0-mikes-projects-4d16734a.vercel.app. | Confirms #322 **built Preview**. No stable generic alias should be claimed from this deployment's alias listing. |
| firefly-ark-sandbox-mikes-projects-4d16734a.vercel.app | Resolved to a different READY staging deployment dpl_AuZMp97F4eDsT44bV4rgWS1XJDCJ at fea53e279c66ea61e80de9891b3e20db97048829. | Never conflate this alias with #322 Preview. |
| arbor-ark-preview-mcp.vercel.app | READY production-target deployment dpl_5ZKRzaxsa6VZLsf9LgmZvrshdVa1 at a25a85c97db6ddfe6bf7c7673fb6c66482b3e1af (historical feature branch). | **Different project/runtime** from firefly-ark-sandbox. Current Fresh App source-to-endpoint mapping needs an authenticated connector/deployed manifest readback. |
| arbor-ark-preview-mcp latest observed attempt | dpl_kiSodMtdcnmdNMPektKNJLngTdSP, branch integration/one-arbor-reconciled-335-339-20261007, SHA a2c82a458ebb57bca2897ae35d8864fed709be7d, ERROR. | An ERROR *attempt* does not replace an existing READY target. No release. |
| firefly-coral.vercel.app | Public Firefly project production READY dpl_27yAaSNKTQYfmZnKrV8Er4nbfPnE, main SHA d46f6b46fc51ac3db4e158cddfc592c52cc2b5ef. | Public app source differs from private Preview; infrastructure separation observed, tenant/data isolation NOT yet end-to-end proven. |
| grove-private-api | Separate project prj_nw2X0SyLn4e8CXWZ83MEs4jwn1JN. Recent source-branch builds CANCELED; no verified active deployed/private endpoint in this inspection. | Do not call this live accepted or assume a public-facing alias. |

Deployment and Vercel project IDs are **observations**, not permissions to promote aliases. Additional attempts may appear after this snapshot.

**Additional read-only log proof (same day):** Vercel build events for sandbox deployment `dpl_5E3nGo82vyd2oVWL9jaifhqPvVxY` explicitly show `Running "node ../../ops/grove/source-only-ignore.mjs"` followed by `The deployment was canceled because the Ignored Build Step command returned exit code 0.` This proves the configured skip command executed correctly **for that sandbox project and #341 branch revision `36ffe15...`**, not for every Vercel project, newer Group 01 commit or public/private release. The current Group 01 branch is independently on the exact-name skip list; no build was found for it on the checked projects. The ARK MCP failed-build event retrieval returned 404, therefore its precise build-error cause remains **UNKNOWN**, not inferred from the sandbox log.

## 4. Authenticated ARK permission and completion receipts

Fresh App profile readback: access=read-and-submit-read-tasks; canSubmitReadTasks=true; canSubmitBehaviorTests=false; canControlObjectives=false. These are **effective connector capabilities now**, not global host or worker grant. No objective-control invocation is available. Fresh App read-task contract only allows arbor_read_runtime_state, annabelle_read_workspace or arbor_read_historical_archive_page, requires server-owned client/project grant and a UUID requestId reused on retries. Changed payload with the same requestId is rejected by contract.

Owned Preview project ID: 9366c350-5d82-49f5-b9ef-862af750e3a0. No cross-project grant authorized.

**Completed independently read back:** objective 74bb46f2-209c-4ec1-b28a-acafa4bd5b7d; task f0fb5a61-c1b9-43ed-a708-410dfa43cb8d; status completed, terminal=true, attemptCount=1, result.verified=true, capability arbor_read_runtime_state. This is a bounded hosted read receipt, not completion of all Group 01 tasks.

**Protected, untouched:** objective 6fb59354-b898-4574-8488-762b41418f44; task 012df6c6-aaa7-4e24-90b4-e9bd9845ae0a; status queued, attemptCount=0, terminal=false, completed=false, resultJson=null. Do not submit a duplicate or trigger it from this lane.

Historical objective statuses include completed, cancelled, failed and queued. Keep cancelled and failed distinct from completed. An old checkpoint on a cancelled objective is not evidence of successful resume.

## 5. Eight-task ownership/status register

| ID | Owner | This inspection's evidence | Correct disposition |
| --- | --- | --- | --- |
| A01 | Group 01 | #322 READY Preview SHA vs #340 candidate SHA; distinct PR ancestry recorded | **RECONCILED (snapshot)**; release lineage promotion still open |
| A02 | Group 01; Group 02 owns STOP | Fresh App permissions, Vercel sandbox vs distinct MCP production endpoint | **PARTIAL**: authenticated endpoint/build/tool-catalog hash alignment unproven |
| A08 | Group 01; Group 02 owns worker | requestId replay contract, scoped claims, exact-id source guards, #326 one-task/20s draft budget | **PARTIAL**: load/rate exhaustion, concurrent duplicate-action and retry collision acceptance unproven |
| A09 | Group 01 | Hosted read task result verified, queued STOP result separately nonterminal | **PARTIAL**: cross-surface source SHA/owner/executor/receipt correlation unproven |
| A10 | Group 01 | This one review ledger plus existing #223/#334/#340 sources | **RECONCILED (documentary)**; single promoted live canonical ledger not evidenced |
| A12 | Owner release decision, Group 01 gates | READY Preview observed, public production distinct; no current approved rollback manifest/rehearsal | **GATED**: no release, alias change, production rollback or main merge |
| E08 | Group 01; owning app API caller gates | Pure code rejects mismatched user/project; trusted host auth still external | **PARTIAL**: real authenticated foreign-project denial and grant ledger unverified; no new grants |
| F16 | Group 01 safety gate; public/private app owners implement | Vercel public Firefly, private Grove, ARK and sandbox separate projects/source | **PARTIAL**: session/token/storage/network negative controls and public/private release isolation not proven |

These are scoped receipts. None of the eight are declared globally DONE or live accepted merely from a documentary pass.

## 6. Required release gate matrix (fail closed)

| Gate | Proof required before passing | Now |
| --- | --- | --- |
| R0 Source freeze | Exact proposed SHA, PR ancestor graph, independent owners' approved file map, no competing edits; no draft==deployed substitution | Candidate lineage identified; owners not fully signed off |
| R1 CI/source | Exact-head full relevant tests, static checks, database/RPC contracts and build; independent check IDs | #340 CI green; NOT proof of live runtime |
| R2 Host parity | Read-only authenticated manifest at effective URL: project ID, environment, Git SHA, build/deployment ID, plugin/tool schema version and issuer | **FAIL/UNKNOWN**: sandbox and MCP projects differ |
| R3 Authority | Explicit owner/project/client/capability scope, separate STOP permission, negative foreign-scope & revoked-grant tests | **FAIL/UNKNOWN** for Group 01 E08 |
| R4 Idempotence | Same requestId replay, changed-payload rejection, concurrent submit race, lease/retry exhaustion, global rate-limit and duplicate prevention | **PARTIAL** bounded prior receipts only |
| R5 Completion | Durable task result + objective event + authenticated actor + exact input/output provenance + source/deployment ref; distinguish queued/cancelled/failed | **PARTIAL** one hosted read proven |
| R6 Isolation | Public vs private user/session/auth/cache/storage and network separation, denied cross-environment tokens, no accidental private endpoints; real end-to-end tests | **FAIL/UNKNOWN** |
| R7 Recovery | Verified restorable isolated DB/Storage backup, tested forward migration and rollback artifact; record immutable previous target and staged candidate | **FAIL/UNKNOWN**; historical 2026-09-19 rollback SHA is NOT automatically today's anchor |
| R8 Authorization | Owner signs off exact SHA, deployment/project/target, cost, rollback, scope and window after all gates pass | **NOT GIVEN** in this lane |
| R9 Stage + postflight | Stage only with authorization; independently verify effective alias, login, grants, receipts and rollback; then separately authorize production promotion | **NOT RUN** |

**No release decision may be inferred** from a green source CI, an old owner permission, a matching name, or Vercel READY in the wrong project. An ERROR/CANCELED newest build does not override an existing READY deployment. An alias resolution mismatch stops promotion.

## 7. Collision and next-owner handoff

- Group 02 owns PR #326, the queued STOP objective and any hosted worker/control/checkpoint actions. Group 01 performs **readback only**.
- Group 03/04/05 own archive ingestion, memory and longitudinal persistence; do not edit shared runtime stores.
- Group 13 owns G09 #341 and Grove navigation; Group 15 owns G11 #342; public app and private hosts need distinct consented end-to-end review.
- Group 01 branch only adds this review ledger and exact-branch Vercel ignore. It must **not** be merged automatically into #340 or its child branches; cherry-pick/reconcile only after owner review.
- Future owner-approved Group 01 acceptance should first capture endpoint manifest/source SHA/tool catalog and concrete current alias targets; next run safely scoped negative permissions/rate tests in a dedicated authorized environment; then require release/backup approvals. No synthetic results stand in for them.

## 8. Change and receipt policy

For any follow-up receipt append: date, project/environment, actor/authorization source, task ID, requestId if applicable (not secrets), action scope, exact Git SHA, Vercel deployment ID/alias target, task and objective IDs, status, attempt count, immutable result/evidence reference, CI/check IDs and negative-control outcome. Use NOT RUN, UNKNOWN, FAILED or BLOCKED when appropriate. No secret values, private transcripts, cross-owner IDs or hidden source may be published.

**This ledger records evidence; it does not certify a live ARK canonical runtime ledger, grant objective control, touch protected tasks, create a new canary, modify main/production or deploy any source.**
