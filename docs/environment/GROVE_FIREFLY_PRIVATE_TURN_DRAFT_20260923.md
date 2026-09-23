# Grove → Firefly → ARK/Layer → signed Arbor LM: verification checklist

Status: CI-only draft PR #193, stacked on cognitive PR #192, checked against Grove owner #179/LM transport #166 and ARK Layer #160. **DO NOT MERGE/DEPLOY** without security, privacy and release review. This is a private Grove-only endpoint; not the public app or the ChatGPT assistant.

## Existing source reused
- Exact owner/grant/project/conversation verification: `lib/grove/privateReadBroker.ts`, from #179.
- Scoped ARK/Layer read and attachment-conversation rejection: `lib/arbor/behavior/arkLayerReadContext.ts`, from #160.
- Signed v0.3.5 Python receiver transport: `lib/grove/privateLmHostTransport.ts`, already present in #179's ancestry from #166.
- Firefly stages + Human Rhythm on the original routing roundabout; existing cognitive session, body/Pattern Hop and project-snapshot code: #192. No second route learner.
- Existing Grove status and project-discovery API routes from #179 are added *unchanged* for a composite CI check. Other authors' source PRs remain draft, unchanged.

## Implemented synthetic host sequence
1. The new `/api/grove/chat` POST requires **both** `GROVE_PRIVATE_CHAT_PREVIEW_ENABLED=true` and `GROVE_PRIVATE_MODEL_TURN_ENABLED=true`, plus preexisting `GROVE_API_ENABLED=true`. All are OFF by default; no deployment or env edits here.
2. Reject user-supplied owner IDs, roles, history, context, turn IDs, work receipts, excessive bodies, and invalid JSON before touching the owner. Accept only UUID project/conversation + one bounded user message; invent turn ID server-side. Public Firefly backend must not enable the Grove flags.
3. Verify Grove JWT against Grove Auth, invitation, account bridge, explicit project grant, Firefly project and exact conversation ownership; then reread ARK/Layer with the mapped Firefly principal. Refuse another conversation's project-fallback context.
4. Optional cognitive preflight: separately scoped existing host read + project-level learned snapshot + *real host-provided* provenance-bearing Pattern Hop retrieval. Missing provider/snapshot, contradiction, review-needed or learned-route abstention holds **before** any model call. Not provisioned in product; turning this on without a provider fails closed. No fabricated evidence is created.
5. Signed LM host transport gets the **existing strict** ArkLayerReadContext and a single user message. The new cognitive JSON is *not* smuggled into the Python receiver's strict schema or presented as a trusted instruction; extend and test the receiver separately before model-visible cognitive payloads.
6. Response is explicitly `liveExecutionVerified:false`, `workReceipts:[]`, `persisted:false`; user-facing chat history and ARK execution remain unwired. No autonomous work claimed.

## Live blockers confirmed read-only
- Grove's active `grove_private_owner_access`, `grove_private_firefly_bridge` and `grove_private_ark_project_grants` counts were each **0** at the time of audit. A live authorized Grove turn must not be claimed.
- Cognitive snapshot proposed SQL remains in docs, not applied to Firefly. No actual approved project snapshot or private model disclosure path exists.
- No confirmed deployed Grove private backend or independently hosted v0.3.5 Python receiver, HMAC secret/nonce infrastructure, cost/privacy owner approval or signed real-GPU inference acceptance.
- Endpoint currently does *not* durably persist user+assistant messages. Avoid presenting it as a finished cross-session chat product. Do not auto-fill owner/grant rows, copy secrets, merge PRs or flip live flags to bypass this.

## Release acceptance
- [ ] Exact-head CI (backend tests+build, control backend tests+build, Flutter analyze/tests/debug APK); this is test evidence, not proof of a live deployment.
- [ ] Independent security/privacy review, including rate limiting, auth invalidation and multi-instance receiver anti-replay.
- [ ] Confirm actual Grove owner invitation, Firefly mapping and explicit ARK project grant with Danelle, using existing approved invitation workflow.
- [ ] Approve disposable Postgres trial and eventual private snapshot migration separately; never infer consent to train on user text.
- [ ] Supply real scoped retrieval and independently verified outcome receipts; cross-conversation isolation and no repeat-training acceptance.
- [ ] Upgrade signed Python receiver to accept bounded Firefly cognitive data as *untrusted data*, preserve strict schema, extend HMAC request tests.
- [ ] Persist turns with exactly-once user/assistant identity and recover current goal across phone/Voice; owner-approved release to independent Grove host only.
- [ ] Observe one authorized phone test: objective → pause → return → correct route. Never represent model text as completed work.
