# Grove workshop — 10 evidence-first execution groups

Date: October 9, 2026 PDT · derived from the **one** existing 82-item Grove checklist; **not** a new project, owner map or 97-task ledger.

Validation: exact original `G01–G82` mapped once each; 82 unique; no omissions or duplications. Group status tracks test evidence, not implementation or live readiness.

| Batch | Meaning | IDs | Finish criterion |
|---|---|---|---|
| 01 | Isolation, original checklist and Flutter test runner | G01, G02, G03, G04, G05, G06, G07, G08, G59, G65, G66 | UI source changes only. Run tests, preserve owner boundaries, save exact proof. |
| 02 | Private entry and scope safety | G09, G10, G11, G13, G14, G15, G16, G20, G25, G29, G30 | Verify auth navigation, source-only scope and access revocation. Host acceptance separately gated. |
| 03 | Text, draft, retry and reopened sessions | G17, G19, G21, G22, G23, G24, G26, G28, G62, G63 | Existing text UI, request identity, offline/force-close/reopen. Device and API acceptance later. |
| 04 | Studio, time, Living Window and Moss | G31, G32, G33, G34, G35, G36, G37, G38, G39 | Source phone-sized scene, clock, world state and scene semantics; do not replace approved art. |
| 05 | Rooms, Observatory, Library and Kitchen | G41, G42, G44, G45, G46, G48, G49, G58 | Existing navigation and false-claim protection, Annabelle edits owned elsewhere. |
| 06 | Professional workspace, Diary and Workshop | G50, G51, G52, G54, G56 | Read-only truthful ARK snapshots and unsaved draft/workshop behavior. |
| 07 | Cross-owner host, model, memory and ARK handoffs | G12, G18, G27, G47, G53, G67, G68, G69, G70, G71, G72, G73, G74 | Review-only dependencies; no mutation of other owners' code. |
| 08 | Ergonomics, accessibility and battery | G60, G61, G64 | Flutter/phone tests without changing application authority. |
| 09 | First owner-authenticated Android acceptance | G75, G76, G77, G78, G81, G82 | Integrated private Text, persisted/reopened turn, correction and verified ARK receipt; approved device/build. |
| 10 | Deliberately parked expansion | G40, G43, G55, G57, G79, G80 | Day art, room extras, diary persistence, functional workshop and voice follow first test. |

## Work protocol

1. Read the most recent cleanup head and the isolated Grove head, compare exact file paths, and preserve private/public scope before edits.
2. Enter one batch and inspect existing production callers and test coverage. Never create a new implementation solely because its original checkbox is open.
3. For a justified Grove-only defect, reproduce with a focused red regression where feasible; repair narrowly; rerun targeted Flutter tests, source guards and truthful CI.
4. Keep `EXISTS`, `SOURCE TESTED`, `HOST ACCEPTED`, `DEVICE ACCEPTED`, `GATED`, and `PARKED` distinct. A green Flutter fixture is not a real conversation.
5. On a true backend/model/auth/ARK or author-owned requirement, document the handoff and keep working on independent frontend tasks. Never edit their files from this lane.
6. Finish each batch with exact paths, commit/test/CI receipts, failures, what is blocked and what dependency might unlock it; move to the next batch without another user prompt.
7. If a later change unlocks a previously gated item, perform a focused recheck; don't restart old complete batches or duplicate the One Arbor engine.

## Batch 01 — active

- Existing isolated draft: [Grove PR #410](https://github.com/mikebuffan/Arbor/pull/410), based on reviewed #408, no merge or deployment.
- Confirmed Grove-only privacy defect: when a list refresh removes a prior authorized conversation, stale private text and Send could remain rendered. Scoped source repair and two Flutter regressions are committed in PR #410.
- Added branch-scoped, read-only Flutter source CI for private Text/auth/draft cases and existing Home/navigation; no backend/test fixtures were rewritten.
- Flutter branch acceptance **SOURCE-TESTED**: exact source run [38032600648](https://github.com/mikebuffan/Arbor/actions/runs/38032600648) green with 50 private scope/draft/conversation tests plus 8 house/navigation tests. Analyzer had 20 nonfatal info lints; no warnings or errors.
- Vercel source-only branch entry verified; prior automatic branch build was canceled.
- Group 01 exit: source-only branch and owner boundary reviewed, Flutter CI result recorded, no hosted/private/production changes; screenshot/device tasks G65 remain gated for actual Android hardware.

## Batch 02 — private entry / authorization source repair

- Current isolated draft #410 also includes a distinct source-only project gate foreground-revalidation repair plus regression test. `GrovePrivateProjectGate` now hides its previously authorized room while rechecking projects after device resume, and rejects a failed/revoked refresh rather than leaving stale private UI visible.
- Outer `GrovePrivateAuthGate` now also rechecks owner invitation on resume. Its backend grant remains server-enforced; physical-device and real-revocation acceptance are still outstanding.
- Exact source CI run [38032957993](https://github.com/mikebuffan/Arbor/actions/runs/38032957993) green: **51 private scope/draft/conversation/auth/project tests, 8 existing house/navigation tests**. Analyzer exited success with 22 informational lints, no warnings or errors.
- G11/G12 trusted actual owner sign-in/hosting remain cross-owner integration gates; no Supabase configuration, grants, private access, or Vercel deployment activated here.

## Batch 03 — continuity and recovery source checks

- Existing tests already cover stable retry identity, saved draft restoration, stale history, account/project scope, failed write, explicit discard, and private/public Talk isolation. Reuse those tests rather than inventing another draft store.
- Next independent check: expand existing isolated Flutter CI to cover runtime scope, truthful private projects, public/private Talk boundary and composed Grove regression; no app code changes unless a real failure is reproduced.
- Actual Android force-close/airplane mode acceptance remains for later device testing.

## Dependency notes

- Groups 02 and 03 can be source-tested on fixture-backed frontend while Group 07 host/model owners work independently.
- Groups 04–06 may proceed despite private host blocks; never alter house art as a workaround.
- Group 08 can move earlier if phone viewport issues block another group; retain one Grove source owner.
- Group 09 needs owner-authenticated private host, a genuine accepted model, saved/reopened transcript, safe correction receipt, an actual ARK read/action receipt, and a tested Android build.
- Group 10 remains explicitly parked until the first practical Grove is accepted.

## Non-negotiable boundaries

No main merge, prod/Preview deployment, secrets, grants, model spend, independent LM training, ARK worker activation, private archive ingestion, Annabelle manuscript edit or change to other thread's shared backend. All Groves changes are reviewable, independent and source-only until authorized.
