# Grove combined connection source handoff — October 6, 2026 UTC

This child completes the demonstrated source composition gaps found in the combined One Arbor candidate. It reuses the existing Grove implementations and preserves completed engines and draft PRs. No production branch, deployment, private import, execution activation, paid inference or phone installation is performed. Pattern Hop and archive/memory reconciliation remain with their assigned workstreams.

## Source lineage and review boundary

Reported deployed sandbox: `fea53e279c66ea61e80de9891b3e20db97048829`. Published repair reported by the owner: `373fa57995985eb12613ae0f29678c98e41de39a`; deployment has not been established here.

Combined draft #249 was inspected at `65f7ae96a4162b6ef5f069713d685c01c4517b19`. Acceptance child #251 at `164f5f302e1b23e4fa5abd9f9dccb549e14d6d5a` restored the omitted phone fixtures and removed the broken SDK gitlink. This connection child, `arbor/grove-combined-connection-20261006`, is based exactly on that acceptance child, not the moving integration branch. Existing Grove inputs are selectively restored from tested #246 `f324fbf7f1e61843dac5d74ade7d29d3e880441a` (tree `c676e6d14da3ebb4c4a6c3a741a590a1ef2e542e`). The PR receipt records the immutable published child SHA and completed CI evidence. Parent changes require reconciliation and affected checks.

Required master/checklist/task-bridge documents remain authoritative for the broader integration. A source test or research-specific ARK bridge receipt does not establish live private Text inference or a chat checkpoint writer.

## Actual callers and repaired connections

| Stage | Actual caller / implementation | Result and limits |
| --- | --- | --- |
| Launch | `main.dart` → Grove app/config guard → `GrovePrivateAuthGate` → `GrovePrivateProjectGate` → environment runtime | Restored existing private realm and owner/project gates; invalid setup fails closed. Original Arbor launch remains available. |
| Text | House Talk navigation → `GroveTalkPage` → `GrovePrivateTextHost` → private conversation client | Existing default-off private Talk gate restored; no public chat/voice fallback in private mode. New conversation remains separately default off. |
| Trusted host | Fixed `/api/grove/chat`, conversations/history and ARK projects/status routes → `privateReadBroker.ts` | Restored existing host identity pin, owner authentication, bridge and project/conversation authorization. Middleware only allows the six existing paths/methods in private mode. |
| Context | `privateConversationLoop.ts` → `readArkLayerContext` | Authorization precedes privileged reads. Exact conversation state, canonical identity/personality, durable corrections, scoped ARK objective evidence, relevant read-only recall and local clock reach context before the mode overlay. |
| Independent LM | Conversation loop → `privateLmHostTransport.ts` → authenticated signed receiver request | Existing strict receiver/adapter proof and HMAC protocol restored. Current source context is intentionally rejected by the incompatible old receiver contract before any network inference request. |
| Response/reconnect | Conversation loop → existing transcript claim/store → route → Text panel/history | Existing bounded owner-scoped transcript and idempotent retry implementations restored. A transcript persistence receipt does not verify a completed ARK action. |
| ARK checkpoint | No private Text caller to an objective-scoped checkpoint writer was established | BLOCKED. Do not claim completion, invent a selector or replay a consumed canary. |

The current behavior engine version `2026-10-05.1` is preserved. Its context-in-prompt option is opt-in for Grove; original main-chat assembly retains its default. Current goal state cannot merge in a different conversation on the private path. Relevant recall uses the existing read-only memory implementation; no embedding, import or write is requested. The actual current user turn controls sensitive-recall disclosure even when the retrieval query also contains a saved goal. Durable correction failures and thrown context errors stop the turn. Existing recall reports partial/unavailable sources explicitly; this is not complete-memory proof.

A demonstrated import-time dependency previously initialized OpenAI despite read-only independent mode. Provider imports now occur only inside the existing embedding/promotion operations. A fixture imports the read-only path with an empty OpenAI key. Existing semantic retrieval and correction promotion behavior are preserved; no parallel memory system is introduced.

ARK objective evidence is a bounded owned window with IDs, goals and statuses. It is explicitly not an active-objective selection and grants no execution authority. `activeObjectiveHandoff` remains `not_resolved`. The actual current receiver must support the complete current behavior/context proof; changing a version string, truncating identity, relaxing proof validation or accepting an old synthetic fixture is not an alignment repair.

## Authentication, scope, switches and time

Phone configuration uses Grove's pinned auth realm and a distinct host origin. Server credentials stay on the trusted host. The broker rejects the wrong Vercel project, realm, origin, owner bridge or project/conversation scope. Privileged Firefly reads follow verified Grove ownership, not client-supplied user identity.

Private host, chat, model turn, transcript, claim and cognitive preview gates are separate. None is enabled by this source change. Phone Talk/new-conversation flags remain default off; pending draft retention remains explicit opt-in and unencrypted. Retention-off does not store draft text. Authorization changes invalidate the current scope; no restored draft automatically sends.

Text propagates the current device UTC offset on each request. Host context applies its existing validated offset/local-clock framing. Tests cover bounds and scope. Actual foreground timezone/DST behavior remains a device check; this source evidence is not a live clock receipt.

## Save, restart, interruption and retry

Existing session envelopes and pending records are versioned and scoped. Storage operations serialize per physical device store. The frozen request ID/text is retained through an interrupted request; failed save prevents dispatch. Lost replies are reconciled only against authorized history. Cleanup/save failures remain visible. Reconnect, remount, process restart, discarded/retained drafts, stale history and account/project/conversation changes are covered by existing restored fixtures. No automatic resend or fabricated checkpoint is introduced.

## App and studio/navigation inventory

| Surface | Source status | Remaining acceptance |
| --- | --- | --- |
| Private setup, sign-in, owner project selection | Existing implementation restored | Actual invitation, owner grant and denied-scope checks |
| Talk/Text, conversation/history and draft recovery | Existing implementation restored | Approved receiver + real phone interruption/recovery run |
| House/world, Moss locations, navigation, local world journal | Existing implementation restored | Device persistence, dimensions, gestures and agreed visual review |
| Observatory, Living Window, local clock/sundial and astronomy | Existing implementation restored | Actual device timezone/foreground/resume and location policy review |
| Annabelle kitchen and guest room | Existing views restored | Owner visual/content acceptance; no unattended work claim |
| Room inventory and source locators | Existing scoped decorative/source registry restored | No fabricated documents; confirm real source links only |
| Projects, objectives, activity and attention views | Existing implementation preserved/restored | Live authorized ARK truth; no demo fallback in private mode |
| Memory, documents and ARK handoff shelves | Existing read views restored | Their legacy endpoints are denied on the six-route private host; report unavailable until reviewed private routes exist. No archive import in this child. |
| Private Voice | Unavailable in the existing private boundary | No public voice fallback; separately designed/authorized work |
| Additional office/walkway/studio editing features | No finished private implementation established by this inventory | Require exact requested feature/acceptance specification; do not invent scope or status |

## Source verification and safe CI

Local TypeScript checking passed. Full backend regression: 149 files, 938 passed, one skipped. The skipped historical receiver subprocess fixture requires an explicitly supplied compatible receiver contract `2026-10-05.1`; the available old artifact is incompatible. Another test proves the current context fails closed before LM dispatch. These are distinct results.

The first local production build was blocked by TLS fetching existing Google Fonts. The local system-certificate retry passed the complete production build. The isolated remote backend build provides a separate receipt in the PR. No production font or engine rewrite is used to mask an environmental failure.

`.github/workflows/grove-combined-connection-ci.yml` pins the child head and Flutter 3.47.6 source SHA, verifies a metadata firewall before checkout/SDK bootstrap, removes proxies, uses read-only repository permission and locked manifests, and publishes no APK. It checks all 36 focused phone fixtures, the complete restored Flutter suite, synthetic Grove and original Arbor flavor compilation, backend types, complete backend tests and production build. The PR receipt records the results actually completed; a queued stage is not a pass.

Root and backend original cron configurations are preserved. Both skip this exact source-only child and its acceptance parent. `apps/backend/vercel.grove.json` is the dedicated no-cron private-host configuration. A future explicitly authorized private deployment must deliberately select/review that config rather than silently reuse the original combined cron config. No hosted configuration is changed here.

## Exact remaining human/live acceptance order

1. Integrator reviews this stacked child against the latest #249 and #251 heads. Record the accepted combined source tree and preserve current engine/draft work. Rerun affected checks after composition. Keep private model/execution flags off.
2. Receiver owner supplies the actual authenticated independent runtime artifact supporting `2026-10-05.1`, including its runtime card, adapter hash and complete current behavior/context validation and prompt limits. Run the existing strict receiver contract fixtures against that artifact without loading weights or performing inference. Until it passes, private inference is BLOCKED; do not substitute the preserved 2026-09-21.1 fixture.
3. Administrator reviews owner invitation/bridge, project/conversation grants, existing transcript/claim schema, row ownership and revocation. Under separate deployment authorization, select the dedicated no-cron Grove config and inspect the actual deployed project/realm/origin and switches. Record source/host/receiver IDs and configuration receipt; never put service/HMAC keys in phone or chat.
4. Build/release owner supplies the approved `GROVE_ANDROID_APPLICATION_ID` and private release signing configuration using the existing guard. Record package ID, signer fingerprint, APK hash, accepted source SHA and public phone config. A synthetic debug compile is not an installable production acceptance artifact. Danelle installs only that reviewed distinct package and signs in through the invited private realm.
5. Before an authorized model turn, prove wrong owner, revoked grant, foreign project, foreign conversation, stale token and malformed/spoofed context deny before LM. Confirm private Voice, unsupported shelves and new-conversation-off remain honest. Confirm no Firefly credentials or route fallback. Record server-side denial evidence without private content.
6. After separately approved inference/budget authorization, one bounded Text turn checks identity, a known durable correction, exact conversation goal, relevant allowed memory, objective evidence and local clock before the task overlay. Capture authenticated receiver proof and the actual persisted transcript. Do not label objective selection or execution/checkpoint complete from that reply.
7. On the actual phone: test retention OFF; explicitly enable retention; enter draft; leave/reopen; kill/restart; disconnect during send; recover a lost reply via history; retry the same frozen ID/text; force save/clear failure; cancel/confirm discard; change account/project/conversation; change timezone and foreground the app. Require no automatic resend, no cross-scope leakage, no duplicate completed turn and visible storage failures. Record app/source/host/receiver IDs and each result.
8. Separately identify an existing approved objective-scoped ARK checkpoint writer and an actual private Text caller. If absent, record BLOCKED and return to the responsible bridge workstream. No general execution activation, duplicate memory/archive work or consumed canary replay is permitted. Return verified receipts and unresolved blockers to the master reconciliation ledger.

Danelle has no immediate ARK button or canary step to perform while these source/receiver/release gates remain. This child finishes the demonstrated source connections; live inference, provisioning, installation and checkpoint acceptance require the explicit gates above.
