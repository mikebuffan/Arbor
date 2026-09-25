# ONE ARBOR — single-thread integration work queue
**Dated:** September 21, 2026 PDT / September 22 UTC. **Owner:** cross-lane integration. **Source:** [live-reviewed assembly handoff](CURRENT_ASSEMBLY_HANDOFF_20260921.md), [v2 manifest](integration_manifest_v2.json).
**Definitions:** [x] is a verified change or read completed within its narrow scope; [ ] is open. A draft PR is not a production release. Integrating work does not transfer the component lane's code ownership.

## LIVE ASSEMBLY PRIORITIES — 2026-09-24 PDT (supersedes the older status below)

**Definition of this finish line:** The SAME authorized ARK project and persisted state can be read in ChatGPT and the private Grove; a bounded worker can accept a NEW approved objective, execute, checkpoint, resume after interruption, and report a real receipt. This does not mean the separate public app, private LM research quality, or broad Epstein corpus is released.

**Verified now, not inferred from a checklist:**
- ChatGPT's installed ARK Preview connection authenticated and fetched the completed existing `canary.read` task: one attempt, verified result and completed objective. Its `get_arbor_continuity` truthfully returned unavailable for that Preview project. Four installed MCP methods remain **read-only**; there is no create/resume/stop command capability exposed to ChatGPT.
- ARK recovery draft [#214](https://github.com/mikebuffan/Arbor/pull/214) exact head `cc6aa8697d600fd87bd7404a51ac551d20e33a6e`: GitHub integration CI run [36054156355](https://github.com/mikebuffan/Arbor/actions/runs/36054156355) SUCCESS; 484/484 backend tests and build are recorded in PR body. Adds protected, default-OFF bounded dedicated heartbeat route and checkpoint canary, **not** a configured live scheduler or successful live restart receipt. Route hard-binds one approved objective, max 2 tasks / 10 seconds; do not describe it as general background research.
- Research [#212](https://github.com/mikebuffan/Arbor/pull/212) maintains the existing real Preview one-shot receipt and an isolated offline benign PDF pilot. Preview MCP host boundary source [#213](https://github.com/mikebuffan/Arbor/pull/213) remains draft; the connected ChatGPT app already proves live Preview read access, so do **not** recreate that connection.
- Private Grove source has real owner-scoped read route `/api/grove/ark/status` and source-only house/Text integration, but private phone login, live cross-provider grant, conversation/model round trip, and same-state comparison have no owner/device receipt. [#211](https://github.com/mikebuffan/Arbor/pull/211) is CLOSED/UNMERGED; do not use it as an approved deployment just because its source branch exists. Reconfirm the chosen current Grove release candidate before deployment.
- Connected Supabase lists three ACTIVE_HEALTHY, distinct projects: Firefly, Firefly ARK Preview, The Grove. Connected Vercel team `mikes-projects-4d16734a` currently lists only `firefly`; prior owner screenshot of `grove-private-api` is not independently readable through this connected Vercel account. Do not create a duplicate host or deploy into Firefly by mistake.

**ONE execution queue — own a seam, do not fork another architecture:**
1. [x] Reconcile actual ChatGPT ARK readback, isolated Supabase providers, latest ARK PR head and exact-head CI. This section is the single current coordination queue; historic work below is evidence, not a release plan.
2. [ ] **ARK execution owner:** inspect exact Preview-host deploy SHA/config for #214; keep every flag OFF until safe, isolate the protected heartbeat; verify CI+host routing. Create a fresh approved synthetic checkpoint objective, NOT the consumed canary, and prove start → persisted checkpoint → interruption → next scheduled invocation → verified completion. A route + test alone are not a scheduler.
3. [ ] **ARK/MCP owner:** reuse the four existing read tools; add minimally scoped authenticated command tools for explicit request/resume/stop with audited receipts, owner/project authorization, bounded tasks/time/cost, and STOP enforcement. Test through ChatGPT on the SAME Preview objective. Never send service-role secrets to the app or pretend a read-only connector can write.
4. [ ] **Grove owner:** pin the correct Grove source head (closed #211 is NOT a release), confirm existing isolated Vercel project/team/deploy SHA via owner who can access it; verify private Supabase account invitation, revocable project bridge and Grove API read of the SAME owned ARK state. Cross-provider auth must happen server-side; no Firefly JWT accepted as a Grove JWT.
5. [ ] **Grove conversation owner:** prove authenticated private Text turn + stored continuity read/write; inspect current default-OFF flags and proposed unapplied transcript/claim migrations before any live schema mutation. Device sign-in, app restart and wrong-account isolation must pass. Private Qwen inference is a separate explicit gate; don't claim it from mocked tests.
6. [ ] **Research owner:** plug existing bounded research capability into the proven worker contract; run ONLY an approved benign small corpus, verify provenance/checkpoint/no-duplicate results and ChatGPT/Grove receipt readback. No uncontrolled bulk EFTA ingestion or publication.
7. [ ] **End-to-end acceptance:** ChatGPT and Grove both display the same project/objective/checkpoint/continuity (where populated), and a new bounded task is accepted, interrupted, resumed and reported without another ChatGPT 'continue'. Record exact deployment SHAs, environment, test evidence, costs, remaining feature flags and rollback before calling the **private ARK/Grove/ChatGPT integration** operational.

**Do not block independent code review on Mike sleeping.** Ask Danelle/Mike only for a concrete inaccessible Vercel account/project, owner/device login, protected credentials, cost/privacy decision, or owner-authorized environment switch. Do not merge/rebase unrelated stacked PRs, enable production workers, provision paid resources or apply live migrations from this queue.

---

## Phase 1 — recover state, no rebuild
- [x] Confirm `mikebuffan/Arbor` active and `firefly-backend` archived.
- [x] Refresh current primary draft PR heads and bases: Grove #151, ARK/Layer #147, public #146, research #152.
- [x] Distinguish incorporated #125 handoff from Grove #138 and later Grove descendants; do not re-merge it.
- [x] Check read-only infrastructure inventory (three existing Supabase projects, one Vercel project; no separate Grove project visible to connected account at observation).
- [x] Read existing owner documents and LM private handoff rather than rebuilding them.

## Phase 2 — one dependable integration map
- [x] Update [master index](ARBOR_MASTER_INTEGRATION_INDEX_20260921.md) and [current handoff](CURRENT_ASSEMBLY_HANDOFF_20260921.md) so older source PR references are historical, not active.
- [x] Record private Grove vs public app product, auth and provider isolation.
- [x] Record the private Grove JWT → private API → owner-approved Firefly read broker → #147 Layer context → private LM trust crossing.
- [x] Record a 10-row synthetic account/project/message/retry acceptance matrix.
- [x] Compare current top-level #149/#147/#151/#146/#152 changed-file lists: 6/9/7/12/6 files; no exact cross-PR file-path overlap at observed heads. Shared API/behavior/workflow paths are NOT proof of interface compatibility.
- [x] Create [v2 manifest](integration_manifest_v2.json) with dated exact PR refs, changed heads, base chains, capability proof stages and gated pending work.

## Phase 3 — executable no-duplicate-work checks
- [x] Inspect pre-existing Library ZIP collision checker and run its original ten Python tests (historical manifest only).
- [x] Add [v2 checker](check_integration_v2.mjs), snapshot-versus-live `--observed` contract and lane path ownership.
- [x] Exercise 15 validation scenarios in the authoring runtime against the committed v2 manifest.
- [x] Commit [20-case Node regression suite](check_integration_v2.test.mjs).
- [x] Run the committed Node suite in Node 22: **20/20 passed, 0 failed**. Git blob-hash verification confirmed the executed checker `94a1e2ed35d37876f09231eb2f916fcf5bdb82db`, test file `7882eb07c678ea064889cdecee54be7d0918a0f1`, and manifest `ad97438be4c3a0976b15004bb3c92a2931cc09e4` exactly matched the committed GitHub files. This is an offline validator test receipt, not a deployment or live GitHub freshness receipt.
- [x] Obtain fresh connected GitHub main/10-PR metadata and run `--observed`: PASS against this dated manifest on September 21 local. This is a one-time observation, **not** a watcher or future merge approval; rerun at promotion time.
- [ ] Review whether a dedicated CI workflow should run the checker; `.github/workflows/` is shared and must be cross-reviewed, not modified unilaterally here.

## Phase 4 — private Grove integration dependency order
- [x] Refresh Grove release tip to stacked private child [#153](https://github.com/mikebuffan/Arbor/pull/153): private ARK fallback now stays unavailable instead of demo; five synthetic Flutter regression cases committed, **not yet Flutter-CI verified**. Parent #151 unchanged.
- [x] Recheck connected Supabase organization: Aurixus Studios is **Pro** and Supabase quotes **+$10/month** for a new project; two existing active projects remain Firefly and ARK Preview, no Grove project yet.
- [x] Danelle approved Aurixus Studios Pro, US East, +$10/month; Supabase confirmed cost and created the distinct **The Grove** ACTIVE_HEALTHY project; checked empty public schema, publishable key availability and provider isolation.
- [x] Apply and verify Grove-only migration `20260922035539_grove_private_owner_access`: forced RLS, no anon reads or authenticated writes, only own unrevoked SELECT, **zero grants** and no security advisor lints.
- [x] Draft [#154](https://github.com/mikebuffan/Arbor/pull/154) on #153: require matching RLS owner grant before showing private house; four pure regression cases committed, Flutter CI still pending.
- [x] Danelle successfully manually ran Grove-only bridge DDL in Supabase SQL Editor: independently verified both tables exist, forced RLS, anon/authenticated deny all operations, 0 owner/mapping/project grants. **Manual apply is NOT recorded in Supabase migrations list**; see Grove [#155](https://github.com/mikebuffan/Arbor/pull/155) receipt.
- [ ] Reconcile second migration's manual SQL Editor application with Supabase migration ledger before any automatic migration replay; do not blindly rerun the DDL or claim recorded migration.
- [x] Finish and test private Grove API route `/api/grove/ark/status` and Flutter private-only URL selection: [Grove #155](https://github.com/mikebuffan/Arbor/pull/155) exact implementation head `a39dd78123f8b80d4981c2fd56c079e482e17501` passed [CI 35687588013](https://github.com/mikebuffan/Arbor/actions/runs/35687588013): 505 backend tests, TypeScript, backend build, Flutter analyze/test. Prior TS cast error corrected. **No live deployment or actual auth/ARK read receipt.**
- [ ] Secure isolated Grove API hosting/config; verify owner invitation/OTP and explicit Grove↔Firefly user/project mapping before a real signed-in ARK read. Current Vercel inventory: `firefly` only. Preserve Firefly/ARK Preview and public app.
- [ ] Configure provider invite-only email OTP, trusted owner invitation/grant, separate Grove API JWT verification and scoped ARK bridge; no owner is silently authorized.
- [x] Verify code-path *shape*: #151 boot requires dedicated Grove config; Grove API client reads Grove Supabase token; #147 scoped ARK/Layer broker assumes separately authorized Firefly context; LM signed receiver remains isolated prototype.
- [ ] Grove lane + ARK/Layer lane review owner-approved cross-provider user/project mapping, issuer/audience/signature validation, revoke and late-response handling.
- [ ] Grove lane + LM lane review signed bounded per-request context transport; no client-authored project ID or fake task receipt.
- [ ] Source lane adds/tests the actual private API and authorized read-only bridge; do **not** modify Grove/ARK component files in the integration lane.
- [ ] Private LM real v0.3 adapter inference through bound host context in a protected GPU host; review identity/privacy/tool-claim failures.
- [ ] Grove physical Android: sign-in, night room/window, Return to Now, Moss persistence, A/P/C vs B/Q isolation, Text→Voice→Text, unavailable states and app restart.

## Phase 5 — independent programs, not release blockers for private Grove
- [x] Public alpha candidate #146 is isolated from private Grove in the index and manifest; CI is code-level, not hosted/accepted.
- [x] Research sandbox #152 smoke test passed on prior implementation SHA `cb1cfe1...`; newer docs head `d0493015...` recorded, without inventing a new exact-head code receipt.
- [ ] Public app lane handles its own provider/host, real model, account isolation and retention/deletion gates.
- [ ] Research lane handles independently published benign-PDF page fidelity acceptance before any untrusted source processing or evidence publication.

## Human decision gates — only interrupt for these
1. **Danelle:** original Grove Supabase project/cost/region decision **completed**; any further paid infrastructure, private owner invitation or production migration still needs appropriate authorization.
2. **Danelle:** invited Grove email/owner identity when ready, real-phone observations and final release/public-product decision.
3. **Mike:** only an exact local-machine, protected runtime, signing key or infrastructure operation inaccessible to the connected tools after alternatives are checked. Do not ask for credentials in chat.

## Release hard stops
- No merge/deploy/paid service or `ARBOR_ENABLE_ARK_EXECUTION` change from this integration queue.
- No private Grove or LM weights in public app, and no Firefly/ARK Preview JWT accepted as Grove JWT.
- No independent merges of superseded stacked source branches, no invented model/worker receipt, no live Epstein/EFTA PDF ingestion from a synthetic sandbox pass.
- After interruption, refresh live heads, exact proof and ownership before resuming. This queue is a **checkpoint**, not evidence of asynchronous work.

**Next safe integration-only action:** refresh PR heads and rerun the dated manifest against newly fetched observations at release time; integrate #155 manual application receipt and owner-lane handoffs. The next real-world gates are private owner invitation, verified email-code template, protected Grove API/backend and physical sign-in; original Supabase organization/cost decision is done.
