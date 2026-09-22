# ONE ARBOR — single-thread integration work queue
**Dated:** September 21, 2026 PDT / September 22 UTC. **Owner:** cross-lane integration. **Source:** [live-reviewed assembly handoff](CURRENT_ASSEMBLY_HANDOFF_20260921.md), [v2 manifest](integration_manifest_v2.json).
**Definitions:** [x] is a verified change or read completed within its narrow scope; [ ] is open. A draft PR is not a production release. Integrating work does not transfer the component lane's code ownership.

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
1. **Danelle:** provider organization, exact quoted cost/region/retention decision for dedicated Grove Supabase, approval for new infrastructure or production migration.
2. **Danelle:** real-phone observations and final release/public-product decision.
3. **Mike:** only an exact local-machine, protected runtime, signing key or infrastructure operation inaccessible to the connected tools after alternatives are checked. Do not ask for credentials in chat.

## Release hard stops
- No merge/deploy/paid service or `ARBOR_ENABLE_ARK_EXECUTION` change from this integration queue.
- No private Grove or LM weights in public app, and no Firefly/ARK Preview JWT accepted as Grove JWT.
- No independent merges of superseded stacked source branches, no invented model/worker receipt, no live Epstein/EFTA PDF ingestion from a synthetic sandbox pass.
- After interruption, refresh live heads, exact proof and ownership before resuming. This queue is a **checkpoint**, not evidence of asynchronous work.

**Next safe integration-only action:** execute the committed checker suite in Node where available; refresh the owner PRs and route any cross-lane contract discrepancy to its owner. The first provider-provisioning gate is an owner decision, not automatically a Mike task.
