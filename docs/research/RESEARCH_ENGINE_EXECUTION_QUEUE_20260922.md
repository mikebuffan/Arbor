# ARK research engine — execution queue (September 22/23, 2026)

This is a dependency-ordered engineering queue, not a promise of background execution. Keep this branch distinct from core ARK, The Grove, and the public app. Read PR #181 and other branch heads before touching shared files. User approval covers harmless public PDF and isolated no-cost synthetic tests ONLY. No merge, deployment, paid resources, production/preview database mutations, live worker, real sensitive ingestion, or publication.

## Verified baseline

- [x] Reconcile privacy sibling code into research draft #181; existing tests and draft preserved.
- [x] Fix session/settle lock-wait timestamp sampling in proposed SQL.
- [x] Fix external benign PDF CI label-grep brittleness.
- [x] Run independently published blank IRS 2025 1040 through CI: 2 physical pages, original SHA-256, distinct extracted text, page-1 no-egress sandbox PNG. GitHub Actions run 35803380628: SUCCESS.
- [x] Run backend, control backend, Flutter/Android, synthetic PDF smoke on same exact head: SUCCESS, run 35803380628.
- [x] Add synthetic auth/projects fixture and disposable PostgreSQL 17 CI service, no Supabase writes.
- [x] Write database claim, settle, duplicate, RLS, STOP, grants and deadline/lease/fencing/revocation test cases.
- [x] **GATE:** disposable DB CI executed and passed; run 35806347563, commit c54ca183208c5b09c2454cfbfdf8ee576b956c17, all six jobs SUCCESS.

## DB acceptance — next safe engineering steps

- [ ] Inspect CI job logs; fix SQL syntax, mock auth/role assumptions or grants without touching real DB.
- [ ] Verify PostgreSQL version, role permissions and synthetic fixture isolation in logs.
- [ ] Record pass/fail for owner A vs owner B under authenticated RLS.
- [ ] Confirm anon/authenticated cannot execute privileged claim/settle/STOP RPCs.
- [x] Verify STOP before/after claim and race STOP against settle; no settlement after STOP wins the lock (run 35806347563).
- [ ] Verify pre-start and expired-deadline claims denied.
- [ ] Verify lease expiry, reclaimed lease and stale-token fencing.
- [ ] Verify one receipt and one charge on duplicate settlement.
- [ ] Verify max cost reservation and cost commitment bounds.
- [x] Separate-connection claim vs claim, duplicate settle and STOP vs settle; CI synthetic tests PASS (run 35806347563). Claim vs STOP remains a separate test case.
- [x] Test session row-lock wait past claim deadline and lease expiry during settlement wait (40-lock-waits.sh; run 35806347563).
- [ ] Test pause, block, authorization revocation, completed/timebox-ended settlement rejection.
- [ ] Test work-unit attempts exhausted, failure retry and recovery after worker crash.
- [ ] Test restart with persisted session/unit/receipt state; no phantom completion.
- [ ] Review SECURITY DEFINER ownership, search_path, grants, role bypass behavior against actual Supabase in an explicitly approved disposable Supabase environment if necessary. CI mock auth is not final Supabase acceptance.
- [x] Confirm GitHub Actions disposable PostgreSQL service teardown in job logs; only synthetic credentials/data (run 35806347563).

## External benign PDF — remaining manual checks

- [ ] Obtain the original blank PDF bytes in a reviewable retained artifact, if approved and safe; CI logged hash alone is not archive.
- [ ] Record fetch timestamp, redirects, final URL, byte count, hash and image digest in an immutable source manifest.
- [ ] Compare sandbox-rendered physical pages 1 and 2 against original independently published viewer.
- [ ] Confirm printed folio vs physical index, line 11a/11b/38 and signature page, or mark extraction limitation.
- [ ] Record image-only, parser errors, text order and clipping as explicit failures/uncertainties.
- [ ] Complete signed human acceptance; keep all release HOLD.

## Worker integration — only after DB gate

- [ ] Reinspect newest worker-v5 and ARK branch state; reconcile before touching shared code.
- [ ] Add narrow research adapter using only validated owner/project/session binding.
- [ ] Keep external capture and scheduler OFF by default.
- [ ] Limit one bounded work unit per tick; enforce deadline, STOP, budget and lease fencing at settlement.
- [ ] Durable objective, checkpoint, receipt and error persistence.
- [ ] Simulate restart, retry, duplicate callback, missing source and cancellation.
- [ ] Reconcile evidence reference only after immutable evidence write; preserve source URL/version/hash/page.
- [ ] Test claim↔evidence↔counterevidence graph, document-family independence and identity gate.
- [ ] Enforce privacy HOLD and no automated public release.
- [ ] Run synthetic end-to-end rehearsal and inspect receipts.
- [ ] Draft operator start/stop/rollback and 60-minute benign rehearsal checklist; ask separately before live worker.

## October 19 research delivery — separate source/release authorization

- [ ] Agree exact official public sources, acquisition manifest and privacy scope.
- [ ] Ingest only authorized original bytes with bounded parser and immutable hashes.
- [ ] Reconcile corpus manifests, scheduling/message books, calendars, travel, payments and witness documents without assuming guilt by association.
- [ ] Cluster mirrors/reports as one evidence family, not independent corroboration.
- [ ] Keep unresolved identity candidates separate until manually resolved.
- [ ] Produce versioned internal evidence packets with exact original-page citations, contrary evidence and uncertainty.
- [ ] Independent privacy/redaction review and explicit human publication decision.
- [ ] Report actual pages processed and remaining backlog, not a fictional comprehensive review.

## Current stop condition

No shared database, external worker, production deployment or sensitive records are touched. All six jobs green at commit c54ca183208c5b09c2454cfbfdf8ee576b956c17, run 35806347563. DB acceptance is a disposable PostgreSQL mock-auth proof, NOT final Supabase security acceptance or worker rehearsal.
