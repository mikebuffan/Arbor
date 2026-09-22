# One Arbor — current cross-lane assembly handoff

**Checked September 21, 2026 (America/Los_Angeles) / September 22 UTC.**
**Scope:** integration-owned coordination and evidence only. The actual component implementations remain with their lane owners. This is a dated snapshot, not proof of production activation or background execution.

## One structure, separate trust boundaries

Private Grove = private interactive product and device shell; ARK = durable owned projects/objectives/checkpoints; Arbor Layer = identity, behavior, correction, scoped inference context; independent Arbor LM = model service; library/attachments = permission-checked sources. The separate official public Arbor App is a *distinct account, provider, database, service and release*, not a Grove flavor with a different launcher icon. Epstein Evidence Project has its own research/evidence pipeline and should enter the private workspace only through separately approved scoped interfaces.

Do not treat an APK as a separately authenticated app, a GitHub test as a deployed service, model text as a task receipt, or a queued ARK objective as a running worker.

## Integration preflight, now executable offline

- [`integration_manifest_v2.json`](integration_manifest_v2.json) pins the current *external* lane heads without attempting to self-pin this branch (that would change its own SHA).
- [`check_integration_v2.mjs`](check_integration_v2.mjs) validates exact SHA/stack-base relationships, branch ownership, distinct products, current-head evidence stage, and optional observed GitHub metadata to detect stale pointers. It is fail-closed on missing current observations when an observation file is supplied.
- [`check_integration_v2.test.mjs`](check_integration_v2.test.mjs) contains 20 positive/negative regression cases. Fifteen core validations were exercised in the connected tool runtime when authored. **The committed Node 22 test suite subsequently ran: 20/20 passed, 0 failed.** Exact Git blob hashes checked for executed validator `94a1e2ed35d37876f09231eb2f916fcf5bdb82db`, test file `7882eb07c678ea064889cdecee54be7d0918a0f1`, and manifest `ad97438be4c3a0976b15004bb3c92a2931cc09e4`. The separate fresh-GitHub-observation `--observed` preflight also passed on September 21 local. Both receipts are still read-only and not release approval. No protected shared workflow was changed to force CI.
- Example from the repository root: `node --test docs/integration/check_integration_v2.test.mjs` and `node docs/integration/check_integration_v2.mjs docs/integration/integration_manifest_v2.json`. A PASS on the latter **without** `--observed` means a consistent *dated* snapshot, not current-branch or merge approval. To validate currentness, fetch the current main and tracked PR metadata, write the minimal `{main_sha,pull_requests}` observation object, then pass `--observed fresh.json`. Never commit real secrets or user data.

## Refreshed authoritative heads and inherited work

| Lane | Current head or proof | Existing work / next gate |
| --- | --- | --- |
| Grove | [#155](https://github.com/mikebuffan/Arbor/pull/155), draft head `560ddd42e10ab4ff23bf255a558cb46744ad8a5b`, stacked on [#154](https://github.com/mikebuffan/Arbor/pull/154) → [#153](https://github.com/mikebuffan/Arbor/pull/153) → private-auth [#151](https://github.com/mikebuffan/Arbor/pull/151) → #150 → #148 → #145 → #138 → #137 → #133 → #132 → #130 → #129 → #122 | Private Grove ARK outage preserves unavailable rather than invoking demo fallback (#153). Separate private Supabase Grove project now exists and dedicated deny-by-default owner-access schema is applied. UI checks matching owner grant (#154). Two revocable bridge tables now exist after user-approved manual SQL Editor application and passed read-only RLS/privilege/empty-row inspection. #155 read broker code is untested; API route and Flutter path writes were blocked. Flutter CI, account invitation, OTP, independent API, actual ARK bridge and phone sign-in pending. Dedicated Grove config fails closed if absent/shared; separate phone Talk and Living Window/Moss work inherited. [CI 35678497172](https://github.com/mikebuffan/Arbor/actions/runs/35678497172) green at tested implementation SHA `23963c2a081f241361212b875863102c291be65d`; later head includes post-CI workflow/docs edits, **not a live login receipt**. Dedicated private Grove provider/database is now provisioned; no private API or owner real-phone sign-in. Do not independently merge inherited Grove PRs. |
| ARK × Layer | [#147](https://github.com/mikebuffan/Arbor/pull/147), draft head `ce70f72287e172e7650604e47872c6facdfd3107` | Scoped read context + work-order reconciliation and Layer projection. [CI 35678320547](https://github.com/mikebuffan/Arbor/actions/runs/35678320547) green at that head across backend/control/Flutter. Does not wire or execute a live broker; selected objective handoff belongs to [#125](https://github.com/mikebuffan/Arbor/pull/125), already selectively incorporated into Grove #138. |
| Independent LM | Private Library `/Arbor Integration/Arbor_LM_Broker_Handoff_2026-09-21.md`, isolated v0.3.5 **service candidate**, not a new trained adapter | Strict scoped broker receiver and optional signed host-context route exercised with synthetic/fake-model tests. Must review compatible host binding with #147 and run actual v0.3 adapter inference in a private GPU host; live v0.3.3 semantic failures remain unresolved. No private weights or credentials in this public repo. |
| Public Arbor App | [#146](https://github.com/mikebuffan/Arbor/pull/146) draft head `aea0318d9ff07d9c6e22d0627d3582325053b320`, stacked on #140 | Alpha-only account/history/export/API-gate additions. [Public alpha CI 35674855319](https://github.com/mikebuffan/Arbor/actions/runs/35674855319) and [integration CI 35674855296](https://github.com/mikebuffan/Arbor/actions/runs/35674855296) passed. Needs **separate** alpha provider, host, real model, two-account test, deletion/retention/consent gates. No private Grove migration. |
| Epstein Evidence Project | [#152](https://github.com/mikebuffan/Arbor/pull/152), draft head `d049301558a2129cbb5d38f88fa7a407b0822dc5`, stacked #144 → #142 → #141 → #139 → #136 → #135 → #134 → #131 → #123 | Disposable offline Poppler sandbox landed in isolated draft. [CI 35680347043](https://github.com/mikebuffan/Arbor/actions/runs/35680347043) passed **including the Disposable PDF sandbox smoke** on implementation SHA `cb1cfe133e00e46dc497a4c9f75933b2baa37dd8`; latest research head is a subsequent documentation update. Synthetic PDF only. Security review and independent approval are still required before external/untrusted PDFs or live ingestion. Do not independently merge parent research branches. |
| Cross-lane integration | [#149](https://github.com/mikebuffan/Arbor/pull/149) review-only, based on main `d46f6b46fc51ac3db4e158cddfc592c52cc2b5ef` | This index + dated handoff; no component code, service, SQL, worker switch, model weights or deployment. |

## Critical path to a *usable private* Grove

1. **No-Mike / code-review work:** reconcile #151's user/project auth assumptions with #147's authenticated read-context contract and #125/#138 selected-objective shape. Keep read-only status distinct from authorization for work execution. Add synthetic tests in the owning lane for user A/project P/conversation C vs user B/project Q; stale async response on account/project switch; duplicate messages; unavailable ARK or LM. Integration lane only records findings and requests owning-lane changes.
2. **Dedicated private provider:** decide the account/provider topology, quote any cost, have Danelle authorize paid resources or other irreversible changes. A Grove Supabase project with invite-only user creation, working OTP delivery, owner JWT and RLS, dedicated Grove API, cross-provider read-only bridge and verified redirect configuration must exist before describing sign-in as working. Mike is needed only if access/credential ownership actually requires his action; his involvement is not an automatic gate for code review.
3. **Host/model seam:** trusted Grove backend verifies user/project/conversation and builds per-request scoped context from #147. Only the host may sign/pass bounded context to private LM. The LM must not receive user-asserted owner identity or infer task completion from text. Establish a real private adapter inference receipt before enabling the option. Public app uses its own versioned contract.
4. **One physical acceptance pass:** sign in to actual separate Grove on Samsung; open nighttime home; Living Window preview→Return to Now; Moss state persists after force-close/relaunch; memory/document/ARK shelves blank immediately when identity changes; Text→Voice→Text continuity; expired or unavailable service shows truthful state; verify sign-out and private-provider isolation. Owner participation is needed for device observation, not general code chores.
5. **Only after gates:** decide exact branch promotion order and rollback, run deployment and migration preflight for the **chosen** provider and environment, obtain explicit owner authorization for production/paid/irreversible actions. Do not silently flip `ARBOR_ENABLE_ARK_EXECUTION`, replay uncertain research work or claim a hosted model from CI.

## Supabase provisioning and next live gates (September 21 local / September 22 UTC)

After Danelle expressly approved an additional **$10/month** under Aurixus Studios Pro in `us-east-1`, Supabase `create_project` created **The Grove** as a third, independently healthy project. Firefly and ARK Preview remain separate. The project's provider URL and enabled publishable key were verified privately through the connected Supabase integration, **not committed as credentials**.

Applied Grove-only migration `20260922035539_grove_private_owner_access` creates forced RLS and a private owner-entitlement read: anon cannot SELECT; authenticated may read *only own active grant*, not create/update/delete; admin provisioning is privileged. Verified owner row count **zero**; security advisor had no lints. See [Grove #154](https://github.com/mikebuffan/Arbor/pull/154) release handoff. A new Grove account, email OTP delivery, separate Grove API or ARK broker connection **has not** been deployed. The Flutter owner UI grant test is draft and remains CI-unverified.

**Additional manual DB receipt:** [Grove #155](https://github.com/mikebuffan/Arbor/pull/155) documents the manually executed Grove-only mapping schema. Verified 0 owner, 0 account mappings, 0 project grants; RLS enabled+forced and no anon/authenticated read/write on bridge tables. Supabase migration history **does not** include the manually applied second DDL; reconcile ledger before later automatic migration replay. Two `rls_enabled_no_policy` INFO findings are intentional deny-all for client roles. No private API route or real ARK access has been deployed.

Connected Vercel was last observed with the existing `firefly` project only. Do not deploy a Grove JWT handler into Firefly by accident or reuse its project/API host. Separate API configuration, owner invitation and actual user/device acceptance are the next gates; no further paid project is automatically authorized.

## Verified client → private API → ARK/Layer → LM seam (read-only source inspection)

Inspected Grove #151 `apps/frontend/lib/main.dart`, `config/arbor_config.dart`, `api/arbor_api_client.dart`, `environment/environment_runtime_host.dart`; inspected ARK/Layer #147 `apps/backend/lib/arbor/behavior/arkLayerReadContext.ts` and `behaviorProjection.ts`; consulted the isolated private LM v0.3.5 broker handoff in Library. This is a **contract analysis**, not a working live end-to-end test.

1. Grove #151 initializes a *new* private Supabase client, gates UI on a session with its issuer, routes `ArborConfig.apiBaseUrl` to `GROVE_API_URL`, and sends that Grove session access token in `ArborApiClient` Authorization header. This prevents accidental Firefly host inheritance at client startup; the client does not verify server entitlement or create a bridge.
2. #147 `readArkLayerContext` expects a Firefly-side Supabase client and a user ID validated by the trusted host; it checks project ownership and optional conversation/attachment scope **before** fetching ARK or continuity. Its `activeObjectiveHandoff: 'not_resolved'` and `liveExecutionVerified:false` are intentionally weaker than #125/#138 selected-objective handoff. Never substitute counts for an active goal or tell the LM that a worker ran.
3. The isolated v0.3.5 Python receiver accepts the strictly versioned #147 read context behind a trusted host; the optional signed HTTP request is not installed in Grove. Its synthetic/fake-model tests do not establish real Qwen inference. The public alpha `POST /generate` payload has a separate strict schema and must not receive these extra private context fields.

**Necessary crossing, owned by private Grove backend/ARK+Layer collaboration:** verify Grove JWT against *Grove issuer* + signature/audience/expiry and owner invitation; resolve a revocable owner-approved mapping to the *Firefly-side* project/user; create properly scoped Firefly DB context server-side (never transplant the Grove JWT into Firefly or use one global admin project); call #147 with a validated conversation/attachment binding; optionally read #125/#138 selected-objective handoff separately; make a bounded, per-request signed private LM envelope; return truthful availability and receipt metadata. Existing Firefly/ARK status endpoints must remain protected against cross-provider tokens. The public app must not access this mapping. Design/API changes belong to the lane owners, **not** an integration-doc patch.

**Synthetic acceptance matrix before a real release:**

| Test | Expected |
| --- | --- |
| No Grove auth configuration or missing private API | Fail closed/setup state; no Firefly fallback or fake login |
| Firefly/ARK Preview/public JWT sent to Grove API | Reject before project, memory or model read |
| Grove JWT sent directly to Firefly/ARK API | Reject; must not be implicitly recognized as Firefly owner |
| Valid invited Grove owner, mapped Firefly project P, conversation C | Only P/C authorized read context, explicit `liveExecutionVerified:false` unless a separate real proof exists |
| Same Grove token requests another owner's project Q, or wrong conversation/attachment | Deny before any context or attachment metadata returns |
| Invitation revoked, token expired, mapping removed | Deny, invalidate cached client-visible shelves and broker context |
| Grove session A→B or P→Q while network read in flight | Clear immediately; discard old late response at every screen and backend cache |
| Missing/stale ARK, selected objective or model endpoint | Truthful unavailable/unresolved status; no invented task success |
| Two simultaneous calls / lost response / retry | No duplicate model side effects; no fabricated completed turn or ARK task receipt |
| Real model response with bound host context | Review private adapter's actual text, identity/correction behavior and tool/payment claims; success HTTP is **not** evidence of ARK work execution |

**Gate before Mike:** these developer-review tasks, synthetic tests and draft backend work can proceed in their owned lanes without local-only access. Provisioning requires Danelle's exact organization and cost authorization, not automatically Mike. Mike enters only for genuinely inaccessible private host/runtime, release signing or resources he alone controls.

## Owner-facing handoff: when to ask whom

| Need | Responsible next step |
| --- | --- |
| Component code, contracts, tests, PR collision review, reproducible developer artifacts | Arbor in the active work session, within GitHub/connected-tool permissions and lane ownership |
| An exact provider organization/cost decision, production permission, public launch, or real device acceptance | Danelle |
| Local machine not accessible through tools, private GPU/runtime only Mike controls, required release key/credential held by Mike, or infrastructure approval he owns | Mike, **only after** identifying the exact missing operation and why the connected tools cannot do it |
| An unverified claim of execution or a running indicator | Obtain actual worker/receipt evidence; neither Danelle nor Mike should be asked to treat a model statement as proof |

### Hard stop / no duplicate work

Do not merge #125 separately into a Grove candidate that already includes its selected handoff. Do not merge #122/#129/#138/#150 and #151 as independent whole-product releases. Do not feed private Grove/ARK Preview state to public alpha. Do not activate the Epstein pipeline because a synthetic renderer passed. Do not commit private LM weights, user records, provider keys or protected research material to this public GitHub repository.

**Next integration-owned action:** obtain current *exact* heads and changed file paths before each edit; maintain this index; route code changes to the right lane; require dated, source-specific receipts at each milestone. Older 2026-09-21 manifests are historical snapshots until refreshed.