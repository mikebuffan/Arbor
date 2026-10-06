# Grove / Buffalo source reconciliation checklist — 2026-10-06

Status: isolated source candidate; no branch update, merge to main, deployment,
hosted migration, real inference, export ingestion or worker activation.

## Provenance and preservation

- Buffalo draft #249 reviewed head: `65f7ae96a4162b6ef5f069713d685c01c4517b19`.
- Preserved Grove/private receiver host and archive preparation source:
  `f45ae61f124c8c8f58a21de44311904af672cacb`.
- Phone drafts #237 → #243 → #246 were reviewed in the preceding handoff.
- A three-way source reconciliation preserved both parents. The sole textual
  conflict was the Pattern Hop and archive-reader imports in
  `registerArkTaskTools.ts`; both are retained. Newer Buffalo acceptance and
  Pattern Hop implementations remain intact. Existing archive reader/preflight/
  resumable preparation are preserved, not reimplemented or executed.
- Buffalo's current public timezone change remains intact. The phone recovery
  files remain the reviewed #246 source. The reconciled app still needs a fresh
  integrated Flutter check; #246's 192 tests are upstream evidence only.
- Source build-ignore configuration also holds this continuation branch.
  Dedicated Grove config has no crons; actual project selection is a release gate.
- Historical handoffs retain their original receipts. This checklist supersedes
  their older “latest parent” and current combined-test counts.

## Work list, in order

| Work | Status / evidence |
|---|---|
| Inspect latest Buffalo and preserve concurrent work | Done; isolated continuation, no updates to #249 |
| Reconcile Grove phone/private host with latest source | Done; three-way integration, both import paths retained |
| Preserve completed memory/archive source | Done; existing source retained without export ingestion |
| Prepare Grove correction saving through the existing durable writer | Done as inactive adapter; ten scope, permission, retry and failure tests |
| Verify backend / TypeScript / build / offline host / SQL | See validation receipt below |
| Native multi-connection SQL races | Blocked by execution environment; not passed |
| Final integrated Flutter CI and signed release | Open; owner device not needed for CI, but safe runner required |
| Production-specific write grants, protected receiver and live phone/LM acceptance | Open; separately approved live session required |

`privateCorrectionWritePreparation.ts` reuses
`stageBehaviorCorrectionPromotion` and the existing durable recovery ledger.
It never grants writes from a read bridge. A distinct server-side write verifier
must derive and recheck authenticated Grove identity, mapped Firefly identity,
project and conversation immediately before staging. No API route imports the
adapter and no database write permission was added. The request UUID is preserved
on retry. Failed staging propagates; “staged” is never represented as permanent.
The existing recovery/readback path, not a second engine, decides permanence.
Runtime state writes and ARK objective/checkpoint writes remain separate open
connections. Do not claim either is wired by this adapter.

## Validation receipt

- Combined backend: 154 files, 980 tests passed, zero failed/skipped, including
  actual signed TypeScript envelope → private Python r3 receiver → fake model →
  validated response. Uses a synthetic OpenAI constructor key and denied network
  boundaries; no hosted/provider requests or model weights.
- Standalone TypeScript passed.
- Offline host/build checks: 11 passed.
- Exact disposable SQL fixture passed again with PGlite PostgreSQL WASM.
  No hosted writes; this does not prove native concurrent connection behavior.
- Production Webpack build passed with synthetic build configuration.
- Final changed configuration and correction adapter checks: 12 passed (included
  in the 980-test suite; repeated after the branch filter change).
- The inherited whitespace line in `grove_talk_page.dart:92` is retained to
  preserve reviewed phone bytes. Existing middleware/Sentry warnings remain.

Native trial: installed isolated test-only `pgserver`/`psycopg` dependencies and
prepared a 12-connection lease/retry/complete/revocation trial using synthetic
records. Server startup was blocked: root-mode helper user creation failed, and
switching to existing `nobody` failed with “cannot set groups: Operation not
permitted.” No native SQL was executed. No hosted fallback was attempted. Native
concurrency and revocation-vs-completion ordering remain genuine release gates.

Private receiver r3 is unchanged: archive SHA-256
`3da204d51f98d35c4d065534feb2b2de4d9d223b25b735418ed7a9210d93235d`.
Default token budget is still 2,400, which does not fit the reviewed 4,020-token
fixture. Proposed 8,192 is not activated and needs actual loaded-model context,
output reserve and real reply validation. Shared replay/rate protection or
reviewed single-process isolation remains required.

## Remaining engineering gates before asking for owner acceptance

1. Run native disposable PostgreSQL claims: 12 simultaneous same-ID claims,
   one winner; expired lease reclamation; stale completion fencing; concurrent
   canonical completions; lost-response restart; changed text conflict; revoked
   access and transaction-ordering checks. Then verify hosted schema/RPC state
   only after a separately authorized migration. Shared permanent-correction
   concurrent writes also need native database proof; adapter unit tests do not
   establish cross-process monotonicity.
2. Run final integrated Flutter analyzer/tests/synthetic APK in the existing
   metadata-blocked safe runner. Record exact tree and build receipt. No connected
   APK or local SDK bootstrap is implied by synthetic compilation.
3. Review and implement a distinct bounded Grove correction-write grant and its
   authenticated verifier before wiring the prepared adapter. Test authorization
   revocation, staged-save failure, recovery and final correction readback. Shared
   runtime update and ARK active-objective/checkpoint connections remain separate.
4. Validate protected receiver provenance, actual model config/token budget,
   replay/rate boundary, exact API identity and dedicated no-cron config. No live
   generation or settings changes until the owner approves that bounded session.

## Exact owner steps, later, in operation order

1. Choose and sign into the separate Grove owner account; confirm the exact
   private API origin, mapped Firefly project and existing conversation. Record
   reviewed backend/receiver IDs and signed APK package/hash privately.
2. Decide transcript retention/deletion and local unfinished-draft retention.
   Approve any required hosted migrations and bounded private preview release,
   then separately approve protected real-model runtime and a small compute budget.
   Supply secrets only through approved secret storage.
3. Install the reviewed signed Grove flavor and log in. Confirm unavailable/off
   behavior before pilot activation. General ARK execution, private Voice and
   unrelated previews stay off.
4. With engineering support, prove expired/foreign token, revoked invitation/
   bridge/grant, wrong origin and foreign conversation denials before model calls.
5. Test optional local draft retention (default off): saved indicator, leave/
   reopen, force-stop/reopen, same text and UUID, no automatic send. Test failed
   local save, logout hiding, and account/project/conversation/origin isolation.
6. After the separate inference approval, send one synthetic LM turn. Judge
   actual Arbor identity/humor, corrections, relevant memory/current goal and host
   time. Confirm transcript save/readback. Test a fresh turn/restart and Annabelle
   return. Use an already authorized correction writer until Grove writes are
   explicitly wired; echoed context is not behavioral acceptance.
7. Test lost-response and failed-save recovery with engineering support: unchanged
   UUID/text retries recover one canonical reply; changed text conflicts; failed
   pre-send local save prevents sending; uncertain text stays locked until retry
   or explicit discard. Test revocation during reads/inference/commit. Check phone
   midnight/timezone/foreground clocks and portrait/landscape navigation.
8. Switch pilot flags off and record actual acceptance/gaps privately. ARK
   checkpoint acceptance requires its own reviewed bounded writer and receipt;
   do not infer it from chat or queue counts or repeat a consumed canary.

No owner action is needed for the completed source checks. Deployment and real
inference remain unapproved and inactive.
