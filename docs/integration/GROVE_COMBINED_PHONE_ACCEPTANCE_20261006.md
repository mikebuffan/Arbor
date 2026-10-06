# Grove combined phone acceptance — October 6, 2026 UTC

This isolated child restores omitted acceptance fixtures to the combined One Arbor source. It does not update the actively edited integration branch, rebuild engines, import personal data, deploy, activate execution or perform inference. Pattern Hop and original-thread memory/archive work retain their owners.

## Exact source anchors

- Independently tested Grove draft #246: `f324fbf7f1e61843dac5d74ade7d29d3e880441a`, tree `c676e6d14da3ebb4c4a6c3a741a590a1ef2e542e`. Its source run `37407345989` passed 36 focused fixtures, 192 total Flutter tests and synthetic Grove-flavor debug compilation.
- Combined draft #249 inspected at `65f7ae96a4162b6ef5f069713d685c01c4517b19`, following failed combined head `0f2deb03519776a198f8636d8b21c482cf734acd`.
- This child branch: `arbor/grove-combined-acceptance-20261006`, based exactly on the inspected combined head. A later parent change requires reconciliation and affected checks before treating this child's evidence as current.

## What is actually carried over

Git blob IDs show that the combined head has the exact tested implementations of ArborSession, DeviceStringStore, private config/realm parser, pending draft store, private conversation client and private Text panel. The other thread added the missing private config/session/client dependencies; its subsequent analysis and existing Flutter test stages passed as observed during this review.

However, the combined head omitted the private Text widget and conversation-client tests, and retained only the older session fixtures. This child copies those three existing test files byte-for-byte from #246. The already identical pending-store tests and fake device store are preserved. No duplicate test engine or new runtime implementation is introduced.

The restored 36-case focused suite covers session adoption/reset/clear failures and serialization, unknown records, scope isolation, remount recovery, frozen retry IDs, lost replies recovered from authorized history, failed save/cleanup, explicit discard, owner revocation during save, preview-off denial and fixed private endpoints. The complete combined Flutter suite must also pass; its total differs from the older Grove composite because other suites were not composed into #249.

## Combined compilation does not establish a private Grove connection

At the inspected combined head:

| Connection | Evidence | Status |
| --- | --- | --- |
| Tested phone recovery implementations | Matching blob IDs | Present |
| Recovery/session/private-client acceptance | Three omitted fixture files restored by this child | Requires this child CI receipt |
| Private Grove launch | `main.dart` initializes the original SUPABASE_URL realm; no GROVE_STANDALONE branch | Missing |
| Owner and project UI gates | `grove_private_access_page.dart` and `grove_private_project_gate.dart` absent | Missing |
| Caller into private Text | Only its own declaration exists; no app entry/navigation reference to GrovePrivateTextHost | Missing |
| Independent signed phone package | Android Gradle has one original app package, no Grove flavor, and debug signing for release | Missing; do not install/release as Grove |
| Private server routes | `/api/grove/chat`, conversation/history, ARK project/status route files absent | Missing |
| Trusted broker, LM transport, transcript custody | Existing `lib/grove/privateReadBroker.ts`, `privateLmHostTransport.ts`, `privateConversationLoop.ts`, `privateTranscriptStore.ts` absent | Missing |
| LM receiver contract | Preserved receiver is 2026-09-21.1; latest behavior source is 2026-10-05.1 | Blocked until reviewed alignment |
| Private chat to ARK checkpoint writer | Older tested Grove saves transcripts; no checkpoint caller established | Disconnected |

These are omitted composition inputs, not permission to replace the original app entry with an unverified private route or to merge the whole old composite. Relevant memory/correction/objective reconciliation remains with the original workstream. A research-specific ARK custody repair is not proof of a private chat checkpoint writer.

## Safer source-only checks

`.github/workflows/grove-combined-phone-acceptance-ci.yml` reuses #246's pinned Flutter SDK, metadata firewall verified before checkout/bootstrap, proxy removal, read-only permission and locked dependencies. It triggers only for this child into the inspected integration branch, checks out the immutable child head, runs analysis, all 36 focused fixtures and the full combined Flutter suite. It publishes no APK and uses no private credentials, live endpoints or paid model. Both Vercel configurations skip this exact child branch while preserving their existing cron configuration.

The active parent's original Android compilation may provide original-app compile evidence. This child changes tests and acceptance instructions only; it does not repeat that build or label it a configured Grove APK. Local Flutter is not rerun after the earlier automatic approval rejection. CI success, source SHA and counts are recorded in this child's PR receipt when available.

## Remaining acceptance order

1. Original-thread integrator reviews the restored fixtures and missing-input table against the current moving #249 head. Incorporate existing private entry/auth/project gates, navigation caller, independently signed Grove flavor and trusted private-host graph selectively, preserving current engines. Reconcile contracts and the assigned context inputs, then rerun the affected combined acceptance. Keep private flags off.
2. Administrator reviews the existing transcript/claim schema and active owner bridge/project/conversation grants. Live provisioning/deployment requires separately scoped authorization; no server keys belong in phone/chat.
3. After exact source/receiver and owner-configured package/host review, Danelle logs into the invited Grove realm. Record package/source/hash, backend and receiver IDs. Prove foreign/revoked scopes deny before LM, then perform separately budgeted Text inference and inspect actual identity, corrections, objectives, memory and local time.
4. On the actual phone, test retention off, explicit retention on, leave/reopen, process kill, lost reply, frozen same-ID retry, failed saves/clears, stale history, confirmed/cancelled discard, account/project/conversation changes and foreground timezone changes. Require no automatic resend and no unsupported ARK action claim.
5. Treat checkpoint saving separately: only an existing reviewed objective-scoped writer may be used. If no private chat caller is composed, record BLOCKED. Never replay the consumed first ARK canary or enable general execution for this test. Return source/device/host/receiver/save evidence to the original master ledger.

The older full acceptance sequence remains in #246's `docs/integration/GROVE_INDEPENDENT_LM_CONNECTION_HANDOFF_20261005.md` and `GROVE_PHONE_RECOVERY_SOURCE_HANDOFF_20261005.md`. No immediate owner ARK action is required by this source-only child.
