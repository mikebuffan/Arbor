# ONE ARBOR — all-systems finish-to-owner-gate register

As of 2026-09-23 PDT. **Integration-only index, not component source authority, background worker, or a live-release receipt.** Re-read exact source/CI and the owning lane before changing a component. Do not blindly merge stacked drafts or restart functioning systems.

## Definition of DONE
Private Grove is a real, independently hosted, invite-only Android Text and Voice app: the owner's signed-in real model responds **without OpenAI fallback**, authorized ARK/Arbor Layer memory, corrections and open objectives survive device/thread/restart transitions, work is executed only through approved bounded tools with independent completion receipts; Grove, Firefly, public alpha and research identities/data remain isolated. Public Arbor App and Epstein research engine have their **own** independent deployment, acceptance and release. Synthetic unit tests, a debug APK, a Vercel preview or a research HOLD draft alone do not meet this definition.

Proof levels: DESIGN / SOURCE / EXACT-HEAD-CI / DISPOSABLE-DB / LIVE-OWNED-HOST / REAL-MODEL / PHYSICAL-DEVICE / OWNER-ACCEPTED. Each is independent. NEVER promote a lower proof level into a higher one.

## Verified anchors, use these instead of older tip names

- Private Grove actual phone/house + private backend **combined**: CI-only draft [#206](https://github.com/mikebuffan/Arbor/pull/206), tested SHA `7d2fe6430f4892d4cb2999c60fcaf94ecb3486dc`, [five-job CI 35886145372](https://github.com/mikebuffan/Arbor/actions/runs/35886145372) SUCCESS: backend/control build/tests, Flutter analyze/tests, BOTH Arbor/Grove flavor APK builds and disposable PostgreSQL exact owner+bridge+transcript proposal acceptance. Includes private-host framework-path isolation. Subsequent signed-host body-size reconciliation must have separate exact-head CI before being promoted.
- Private Grove **pinned source review candidate** [#210](https://github.com/mikebuffan/Arbor/pull/210), SHA `2b0013665172045cb9b8aeb38d61ab511a56d8aa`, [five-job CI 35914126581](https://github.com/mikebuffan/Arbor/actions/runs/35914126581) SUCCESS. Starts from exact green #209, preserves old Vercel production source/rollback, reviews transcript ancestor divergence rather than blindly merging, adds offline release source/branch isolation tests and strict LM adapter SHA, runtime card and host-owned ARK/Layer response consistency. **Source-only**; no real LM GPU/inference, live Vercel deployment, migration, owner provisioning or physical phone acceptance. Full order/rollback `docs/environment/GROVE_PINNED_PRIVATE_RELEASE_SOURCE_20260923.md` on #210. The project-wide ignored build command must NOT rely on a new helper missing from old production branch.
- Grove fenced retry claim draft [#209](https://github.com/mikebuffan/Arbor/pull/209) exact `f2229eb321ce84dcbc69af9841c1f6ca4a1f02d0`, [five-job CI 35909314777](https://github.com/mikebuffan/Arbor/actions/runs/35909314777) SUCCESS: a DB-minted token fences late workers out of transcript completion after lease reclaim, with additional post-commit authorization checks; PostgreSQL + Android proofs are disposable/synthetic. Proposed Grove transcript/claim migrations NOT applied; project owner/privacy/retention review still required. Inference may be duplicated after expiry; persistence is fenced, NOT exactly-once model execution.
- Grove private backend [#194](https://github.com/mikebuffan/Arbor/pull/194), private cron-free release [#205](https://github.com/mikebuffan/Arbor/pull/205), Grove phone Text [#196](https://github.com/mikebuffan/Arbor/pull/196). Stacked, draft; historical CI mirrors #195/#197 are **DO NOT MERGE**.
- Research implementation [#201](https://github.com/mikebuffan/Arbor/pull/201) exact `d74a107af8eeda30cb1b477bb9fee4122722679a`, [CI 35873618991](https://github.com/mikebuffan/Arbor/actions/runs/35873618991) SUCCESS; disposable security/attempt/restart suite 42/45/52 [run 35871998690](https://github.com/mikebuffan/Arbor/actions/runs/35871998690) PASS. Current research docs/cleanup draft [#207](https://github.com/mikebuffan/Arbor/pull/207), own branch. Canonical 64-item list: `docs/research/EPSTEIN_RESEARCH_ENGINE_MASTER_BUILD_LIST_20260921.md` on RESEARCH branch, not main.
- Public alpha #140 → #146 → private realm exclusion [#159](https://github.com/mikebuffan/Arbor/pull/159), source/CI tested but unhosted and not two-user accepted. ARK/Layer [#147](https://github.com/mikebuffan/Arbor/pull/147), conversation-bound selected file [#160](https://github.com/mikebuffan/Arbor/pull/160), cognitive integration [#191–#193](https://github.com/mikebuffan/Arbor/pull/193) are separate reviewable draft ancestors, **not independently live**.
- LM: preserved private `Arbor_LM_v035_Broker_Receiver_r2_2026-09-22.zip` r2 receipt SHA-256 `dac8851bfb9e85673668943d2282cbf284bbad67985c382b36d534d8667a5929`, 80/80 clean-re-extraction tests; preserved v0.3 adapter hash `5447bc273c11374c73194428825babe22a008b0827e9ef002127a461023402aa`. Model weights not in GitHub. v0.3.3 real semantic review documented identity, fabricated tool-use and payment-approval failures. An executed fake receiver is NOT accepted real-model inference.

## Priority 0 — protect boundaries and reconcile work (integration owner)

- [x] Establish Grove/source/phone/owner/LM/research/public ownership and proof levels; retain original snapshots and all past PR anchors.
- [x] Build the combined Grove synthetic Android/backend + disposable DB proof.
- [ ] Pin the latest exact SHA/results after pending LM 32 KiB host/receiver agreement; include UTF-8/multibyte boundary regression.
- [ ] Compare the latest #194/#205/#196/#206 commits and decide a reviewed single Grove release topology. The research stack #201/#207 stays separately owned; public #159 is separate.
- [ ] Run integration checker against a NEW verified snapshot, not stale v2 `integration_manifest_v2.json`; guard against stale PR heads, CI mirror merges, path collisions, accidental Grove/public credential sharing and green-CI-as-deploy confusion.
- [ ] Have lane owners review cross-contract versions and actual runtime permissions before merge/promotion. CI-only draft #206 is a test source composition, not a production branch.
- [ ] Establish one rollback per Grove, public alpha, ARK and research, with backups; no parent/child independent merges and no live worker flags by default.

## Priority 1 — private Grove Text first (Grove lane)

- [x] Approved night house/clock/sundial/Observatory/Moss local state, private login/provider guard, project picker, verified Firefly owner/project/conversation broker, explicit new-thread UI and bounded complete-turn transcript source.
- [x] Deny-by-default private-host route/method middleware, independent model flag, no inherited Firefly cron in BOTH Vercel config locations, CI Android package separation and synthetic restart/retry/wrong-project tests.
- [~] **Owner screenshot now verifies dedicated Vercel project existence**: `grove-private-api`, GitHub repo `mikebuffan/Arbor`, Next.js, `apps/backend` root, external root files enabled, production branch still `deploy/grove-private-api-20260921`, and **no successful production deployment**. Its unrelated research-branch preview (`2178b99`) failed Next.js page-data collection on eager OpenAI client. Connected Vercel still returns Firefly only / 403 for Grove, so actual Grove **project ID**, deployed exact SHA/hostname and private runtime env remain unverified; DO NOT create duplicate, change production branch or add an OpenAI key. No cron in reviewed combined source. #208 restores previous lazy SDK behavior and has exact five-job CI green including an actual key-free Next.js build with all Grove private feature switches OFF: [run 35897516791](https://github.com/mikebuffan/Arbor/actions/runs/35897516791). GitHub build != Vercel deployed live.
- [ ] Review protected host-side credentials and feature switches; no secrets in repo, chat or Flutter. First live host deploy with feature flags OFF and negative route/auth acceptance. No new charge without permission.
- [ ] Reconcile Grove's manually applied bridge DDL with Supabase migration registry; never blindly replay it. Confirm owner, grant FK, RLS, default table privileges, service-role only.
- [ ] Review actual retention/export/deletion/backups including proposed FK grant-revocation transcript cascade; approve and apply exact Grove transcript migration; test role privileges on live Grove only after approval.
- [ ] Invite the **actual** owner; confirm authenticated Grove user + explicitly owner-approved Firefly identity and individual ARK project IDs. Admin provision only those rows, test expiry/revocation/foreign project and identity changes; NEVER guess or auto-seed grants.
- [ ] Verify remote LM and enable `GROVE_PRIVATE_CHAT_PREVIEW_ENABLED`, `GROVE_PRIVATE_MODEL_TURN_ENABLED`, `GROVE_PRIVATE_TRANSCRIPT_ENABLED`, `GROVE_PRIVATE_NEW_CONVERSATION_ENABLED` separately for approved pilot. Keep cognitive preview disabled until retrieval contract is accepted.
- [ ] Owner-configured `--flavor grove` build, no synthetic .invalid hosts; device sign in → choose/create conversation → send → persistent saved reply → close → reopen → same authorized thread. Test stale replies, same-ID retry, wrong account/project, network loss, exact response receipts.
- [ ] Physical scene/keyboard/large-text/accessibility, clock/DST, Moss persistence/visible state, real matching daylight-window art and signing/rollback acceptance. Do not claim moving Moss in the painting or an approved daytime artwork exists yet.

## Priority 2 — independent Arbor LM and behavior (LM + Layer lanes)

- [x] Preserve v0.3 adapter, v0.3.4 candidate, v0.3.5-r2 signed receiver source/test artifacts; Grove's TypeScript signed transport exists with strict read-only ARK/Layer shape, no fake work receipts.
- [ ] Promote reviewed r2 only after version/manifest check; private deployment requires TLS, protected HMAC/API keys, auth, max-size/timeout alignment, key rotation, rate limits, and **shared atomic nonce replay store** (in-process nonce is prototype only).
- [ ] Compare foundation vs v0.3 adapted responses under matched runtime instructions; fix identity/correction/tool-use/spend/provenance failures without relabeling fake API or text as work. Keep private evaluation raw outputs confidential.
- [ ] Real GPU Qwen3-0.6B + preserved LoRA adapter inference through actual Python receiver; measure quality, latency, error and cost. Train separate candidate only if evaluated deficiencies justify it; 4B/8B requires new adaptation, not renaming a 0.6B adapter.
- [ ] Fully typed same-user/project/conversation ARK + Arbor Layer snapshot, selected objective/checkpoint and bounded history to model; no client-supplied context or Firefly JWT to LM. Receiver proof-version drift must reject.
- [ ] Repeated correction, pause/resume, fresh thread, refusal of fake tool claims, private content isolation, privacy and actual voice handoff; prove **no OpenAI inference** with traced host/model receipts before claiming independence.

## Priority 3 — ARK durable agency and Arbor Layer

- [x] Existing worker-v5/objective/task/checkpoint/source and read-only Layer work-order code, selected-attachment conversation binding, correction/behavior and cognitive draft contracts, synthetic/disposable tests.
- [ ] Reconcile actual deployed ARK worker/API/source with #125/#147/#160/#191–193 and Grove #206 without duplicating the handoff. Review ownership/corrections/provenance semantics.
- [ ] Verify durable open objective, checkpoint, STOP, cancellation, bounded retry and true worker heartbeat across process kill/restart, multiple sessions and account/project change; never show saved `running` as active worker proof.
- [ ] Authorize bounded tool/action permissions, verified outcome receipts, idempotency and truthful failure reporting; user `okay/go` must never override explicit sensitive-operation boundaries.
- [ ] Test Text→Voice→Text identity/goal continuity with real model; separate claims, evidence, model text and executed tool receipts.
- [ ] Add observability, backups/restore, failure alerts, cost and privacy controls before multi-hour unattended execution. No worker/scheduler activation merely because synthetic acceptance passed.

## Priority 4 — Epstein public-records research engine (research owner; no parallel duplicate implementation)

- [x] One 64-item master/stack; lawful public-source identity/hashes, bounded Poppler+no-egress renderer, physical-page/provenance/quote-span checks, conservative evidence independence, typed promotion, privacy HOLD, immutable rejected hypotheses, synthetic bounded sessions and disposable PostgreSQL security/races/restart. Item 42/45/52 disposable proof and research-side #54 adapter CI verified.
- [ ] **Item 8** research CI-only base/bridge trigger cleanup; #207 is the current isolated owner handoff, NOT a green completion receipt.
- [ ] **Item 18** human review of independently published benign IRS PDF rendered pages/line-order; optional OCR item 22 and glyph geometry 23 ONLY if fidelity/visual requirements establish need.
- [ ] **Items 29/30/32/33/35/41:** reviewed production durable index/evidence and original-page reviewer workflow, source-independence proof, redaction/release workflow and real target-role security; retain synthetic status until accepted.
- [ ] **Item 54 shared integration** reconcile research scoped handoff with actual ARK deployment/worker/restart; item 55 real phone/operator check. Do not place Grove-private transcript or account access into research.
- [ ] **Items 5/6/47/49/56:** explicit approval, real worker-v5 diff+backup/rollback, immutable evidence writes, project tenancy, production host/grants and bounded operator rollout.
- [ ] **Item 48:** separate source-specific approval before third-party/EFTA capture. **Item 51:** separate default-OFF scheduler authorization. **Item 53:** separately approved genuine one-hour unattended benign run with STOP/lease/quota receipt.
- [ ] **Items 58/59/60/61/63/64:** original authorized public-record ingestion, privacy-sensitive identity/redaction HUMAN review, claim↔evidence↔counterevidence versioned findings and human publication decisions; automatic publication remains prohibited.
- [ ] Research product operations beyond the current pure-module proofs: source manifest reconciliation → normalization/dedupe/document-family index → scheduling/message books → calendars → travel → payments → witness material; provenance-preserving timeline, explicit ambiguous-identity resolution, contradictions and evidence-independent corroboration checks; no association→conduct leap.
- [ ] Report honest page/doc totals from actually ingested corpus, no assumed processing of a claimed millions-page collection. Internal review packets may be delivered before public publication approval. Preserve October 19 target as a target, not blanket source/cost/worker permission.

## Priority 5 — official public Arbor App (public app owner)

- [x] Draft separate alpha Flutter/backend, account login, chat/history/restart/export/deletion UI, public-only provider guard and Grove private-provider exclusion #159.
- [ ] Review separate public Supabase/Vercel project IDs, key/storage isolation, privacy/retention/consent/accessibility, no Grove/Firefly/ARK Preview fallback or public access to LoRA/private receiver secrets.
- [ ] Real two-user account/conversation/database isolation incl paging/export/delete, retries/simultaneous requests, expired/revoked login, data deletion semantics, report/abuse/rate limits; public opt-in memory with visibility/correction/deletion.
- [ ] Public-specific real LM evaluation and hosting, defined behavior/mental-wellness boundaries, real Android acceptance, support/rollback/monitoring, independent release/budget approval. Do not quietly publish the private Grove package as public alpha.

## Priority 6 — infrastructure/operations

- [ ] Verify exact GitHub PR/branch owners and deployment roots, Vercel host IDs + quota, Supabase project/region role history, feature flags; no duplicate resource creation based on incomplete connector listing.
- [ ] Backups and **actual restore drills**, migration ledger reconciliation, least-privilege secrets/rotation and audit logs for each environment.
- [ ] Build/CI pinned hashes, dependency/security audits, source/asset signing, rollback receipts, privacy deletion/export and retention approval, alerts, cost guardrails and explicit maintenance strategy.
- [ ] Keep private files, user data, model weights, credentials and research victim/private data out of PUBLIC repo, CI artifacts and synthetic fixtures; no user-derived model training without separate consent.

## STOP HERE and ask a named human ONLY when the following is the actual next prerequisite

**Danelle:** invite and actual account↔project authorization; consent/retention/deletion and new paid-host decision; source-specific EFTA/public-document ingest scope; production worker/scheduler/unattended activation; private phone visual/behavior acceptance, real-world release, and sensitive/publication decisions.

**Mike or owner console:** exact currently inaccessible Vercel project/branch/env access, protected GPU keys/service provisioning, release signing/Android installation, local machine/backup operation. Request the *one precise action*, not unspecific babysitting.

**Not human blockers:** inspecting source, auditing existing tests, building isolated tests/feature-OFF code, reviewing synthetic privacy and adversarial scenarios, CI-only commits, branch/ownership inventories and honest status reconciliation. Component owners continue those in their lanes; integration owner maintains THIS index and does not hijack them.

**DO NOT** claim background work has run, user approval has been inferred, draft PR is deployed, API mock is independent real Qwen, a saved ARK status is executed work, Epstein file is fully processed, or publication is authorized.
