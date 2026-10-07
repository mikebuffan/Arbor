# ONE ARBOR — Group 14 Annabelle / Ever After source and acceptance receipt

2026-10-07. **Source-only draft / private manuscript remains unchanged / no Gold lock or publication.**
Owned scope exactly **G01–G05**. All claims below separate archival docs, current connected state,
independent Library source inspection and new synthetic source tests.

## 1. Source and owner reconciliation

- Source base: open draft PR #340, SHA `595375d525cf561172449726ed0c086ab4ece7db`. This is **not deployed**.
- The existing Annabelle owner and source engine remain authoritative; reused
  `apps/backend/lib/arbor/annabelle/*` and `subsystem/annabelleWorkspace.ts`. No second reader/engine.
- Current authenticated Annabelle connector scoped to owned Preview project
  `9366c350-5d82-49f5-b9ef-862af750e3a0` returned `available=true`,
  two manuscript descriptors, **zero returned chapter rows, zero editorial records,
  zero checkpoints**, and `truncated=false`. No write or memory promotion occurred.
- Its whole-book canonical manuscript descriptor is `3e6f799e-1702-4282-b134-95e59aed2bb6`,
  labeled `Ever After Finished Novel(2).zip / ever-after-STANDARD.pdf`, 60 chapters,
  metadata `proseStored=false`; Chapter One original remains a separate reference.
- Older repository documents `ANNABELLE_CANONICAL_SOURCE_RECONCILIATION_20261006.md`
  and `ANNABELLE_FINISH_CHECKLIST_20261006.md` say *source-bound readComplete*
  records for Chapters 2–60 existed in their earlier read-only state, despite a stale
  checkpoint `nextChapter=2`. The current connected Preview returned no such records.
  **Discrepancy unresolved; do not erase old receipts, reread chapters 2–60
  automatically, or claim current hosted complete/read/unread from this mismatch.**
  Compare same backend/project/manifest, record IDs, exact source SHA and dates first.

## 2. Independent source inspection — manuscript versus working Chapter Two

- The owned Library `ever-after-STANDARD(1).pdf` is 2,996 physical PDF pages
  (`pdfinfo` readback). Its **file bytes** SHA-256:
  `3b302c803c46d13abe98b5b78adb620cf56e5bfeb1d47636ef8b68665d27c438`.
  The durable canonical record's `b8a28f...` is the original archive-source
  hash, not proved equal to the PDF byte hash; don't equate unlike provenance.
- Verified directly: Chapter Two begins on physical PDF page 99 (printed/source p. 91),
  ends physical page 184 (source p. 176). Chapter Three begins physical PDF page 185
  (printed/source p. 177). Earlier search also surfaced a **different**
  `ever-after-STANDARD[1].pdf` rendition; page ranges from that other rendition
  are **not accepted** as page locators for this source.
- `Ever_After_Chapter_Two_Rewrite.docx` (October 2 working candidate) locally
  hashed `8d735e8da8c1ac503687608515ce87e35c4af14da4e1bc50dcb118935ac213ac`.
  Word-count check: approximately **16,289** whitespace/token words in the
  source PDF's Chapter Two physical pages versus **8,632** in the DOCX candidate.
  The reduction is about 47%; extraction conventions differ and are not an
  exact editorial word count. This is a substantive compression, not copyediting.
- The DOCX preserves the material end-of-night door closing. Source Chapter Three
  begins **earlier at the same birthday-party evening**, through Will's viewpoint
  while karaoke, birthday sash, balloons and pool are ongoing.
  The page break lacks an early explicit flashback signal. The chapter-source and
  October 7 editorial delta independently agree on this time-reset issue.
- **Surgical recommendation only:** retain Chapter Two's community/aftermath arc;
  obtain the author's approval for a minimal temporal cue at the beginning of
  Chapter Three. Do **not** insert the cue, remove the closing scene, or advance
  the editing target before Chapter Two acceptance.
- Earlier Chapter Two editorial packet lists Mercer size/leverage, show-then-explain,
  cadence, body/hip continuity, and repeated donor-status explanations as local
  surgical targets. No automatic global cut, prose rewrite, or Gold promotion.

## 3. G03: existing workspace storage proof versus app proof

Library `ONE_ARBOR_ANNABELLE_PREVIEW_PERSISTENCE_ROLLBACK_RECEIPT_20261007.md`
documents an isolated reversible hosted SQL transaction: synthetic revision +
workspace inserted, read back, restored and rolled back, with zero rows
remaining. This **proves Preview SQL shape/readback/rollback only**, not an
authenticated deployed-app save/reopen/restart.

While inspecting the canonical source, found that
`persistDiagnosticCheckpointVerified` checked scope, sequence and separate
record-key storage readback but did not verify the *checkpoint row itself*
retained the intended completed record keys, diagnostic fingerprint or stage.
A stale/tampered checkpoint could therefore be reported as `verified:true`.
The existing adapter now requires the correct diagnostic fingerprint and stage
and a superset of expected checkpoint record keys; it accepts independently
added unrelated record keys without pretending their content was evaluated.
Five synthetic tests cover genuine readback, dropped keys, changed diagnostic,
changed stage and additive keys. This is source-only; it doesn't operate on
the live project.

## 4. Group 14 task register

| ID | Bounded state at this snapshot | Genuine next acceptance |
| --- | --- | --- |
| G01 Ever After inventory | Source and 60-chapter canonical descriptor found; independent PDF edition and source pages checked. **PARTIAL** | Full exact chapter inventory and cross-edition hash/locator reconciliation; avoid treating one descriptor as full chapter record set |
| G02 Whole-book receipts | Historical 60-chapter read-complete claim conflicts with zero chapter/record rows in current owned connector response. **RECONCILIATION HOLD** | Same-owner/same-deployment authoritative receipt audit before claiming completed or ordering any reread |
| G03 Workspace save/restore | Hosted disposable SQL transaction verified (Library receipt); checkpoint readback code hardened. **SOURCE REPAIR** | Exact-head CI, then approved deployed app-path save → readback → fresh-session restore |
| G04 Chapter 2/3 acceptance | Chapter Two October 2 compressed working candidate and Chapter Three time-reset issue verified. **AUTHOR REVIEW REQUIRED** | Author approval for surgery, then comparison/lock; no current Gold or Chapter Three advancement |
| G05 Novel/hardcover | Existing hardcover preference and publishing research is **planning only**. **GATED** | Author-approved final manuscript, format/trim/ISBN/cover/production decisions and explicit release authorization |

## 5. Source-test and behavior separation

Changed paths only:
- `apps/backend/lib/arbor/annabelle/editorialPersistenceAdapter.ts`
- `apps/backend/lib/arbor/annabelle/__tests__/group14PersistenceReadback.test.ts`
- `.github/workflows/one-arbor-group14-annabelle.yml`
- `ops/grove/source-only-ignore.mjs` (this branch only)
- this evidence ledger.

CI workflow tests the new regression plus existing editorial persistence,
canonical Chapter Two source checks, continuation, Gold protection and
backend typecheck. **Record exact-head outcome only after GitHub Actions
returns completed/success.** Synthetic results don't prove author-facing
generated prose, live permissions, physical-device state, or genuine reading.

**No prose, Gold exemplar, Chapter Two lock, editorial row, private manuscript,
publication product, main branch, production alias, permission or ARK worker was
changed.** No private source excerpts were committed. The post-rollback
Preview workspace is deliberately empty.

At final integration, union independently reviewed source-only Vercel ignore
entries from concurrent lanes; never blindly overwrite another group.
