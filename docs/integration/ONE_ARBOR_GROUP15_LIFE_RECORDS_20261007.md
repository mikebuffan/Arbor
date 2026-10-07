# ONE ARBOR — Group 15 / Life, Diary, Project Attribution, Records

Date: 2026-10-07 Pacific. Owner: Group 15. Tasks G10, G11, G13, G14 only.

## Source and concurrent owner map
- Deployed Preview canonical remains PR #322 SHA f4021985b475651284c97aecbc3bdf03123478cc. New composite PR #340 SHA 595375d525cf561172449726ed0c086ab4ece7db remains source-only.
- PR #341 G09 Professional Workspace and PR #342 G11 optional diary manual UNSAVED UI are source-green, not device/deployment accepted.
- Group #13 PR #356 owns Grove navigation/room/workshop surfaces; Group #4 owns scoped memory/storage; Group #12 owns private host/LM; Group #9 owns Glow vs Noise evidence/ranking.
- This branch adds a stand-alone pure typed review projection plus tests and this specification; zero shared UI/runtime edits and no new database, network route, engine, worker, grants or canaries.

## G10 — Arbor Life: requirements recovery, no new product execution
Original scope: a separate capacity-aware practical life-support and personal-strategy experience using existing Arbor Layer, ARK, Grove/private UI, authorized memory/Time Core, reviewed Glow vs Noise and continuity. It is NOT the public mental-health product, a competing Arbor, Grove scenery, a legal/coding/IP workbench, or an independent model. Its primary job is helping a person preserve their explicitly chosen time, priorities, and long-range interests, **not** inferring medical or psychological capacity.

Safe bounded MVP concept: read-only overview of user-entered plans and verified project/task state, time windows from a trusted clock, explicit user-reviewed priority labels, clear Known/Unknown/Next and optional deliberate edits. Never interpret time stress as diagnosis, decide user's capacity, infer family or health facts, rearrange priorities without review, or continue hidden work without owner permission. No auto-collection, location tracking, private-data migration, unapproved model calls, or new persistence. Before implementation, owner must approve actual UX/scope and which existing host surfaces provide each input.

Acceptance: baseline vs candidate must show helpfulness on manually supplied priorities with irrelevant/contradictory negative controls, no cross-project disclosure, stale-data disclosure, STOP retention, and actual user consent for any persistent plan. Not accepted yet.

## G11 — Diary
- Existing PR #342 provides title, text, optional day context, preview, clear, in-memory session draft with visible NOT SAVED. Flutter CI 37699549851 was source-green: 10 tests passed. Do not duplicate or overwrite.
- This task owns privacy and consent requirements, not Group #13 navigation or Group #4 storage internals.
- Recording events/mood/health is voluntary user entry only; no automatic scraping, sentiment diagnosis, medical prediction, shadow copy, or cross-project memory promotion.
- Real save/restore only after explicit decision: where stored (device vs owner-scoped service), encryption/access, retention, selective export, correction, deletion, backups, revocation, failure recovery, and device tests. An unsaved preview is not an accepted durable Diary.

## G13 — Project contribution, credit, funding and IP evidence
- Reuse one immutable project/source/commit artifact lineage, user-provided contributor labels, and owner-reviewed records. Build attribution **candidates** only; rights, copyright, licensing, patentability, compensation, partnership and revenue-share need actual agreements and independent qualified review.
- This branch adds pure reviewContributionEvidence(projectId, rows), which validates local project scope, artifact reference, recorded work, duplicate IDs and reused contributor+artifact claims. Every candidate is labeled REVIEW_ONLY and legalOwnershipEstablished=false/financialAuthorizationGranted=false.
- Keep human disagreements, counterevidence, contributions by time, and disputed ownership visible. No signed instrument, trade, funding, filing, licensing or money movement.
- Future authorized workflow: select project -> view evidence references -> human verify original repo/document and status -> record optional party statement with actual signoff provenance -> legal counsel/owner decision separately. Never present mechanical Git authorship or assistant-generated text as definitive legal authorship.

## G14 — Practical records workflow
- First safe workflow: manually identify a project-scoped document and purpose; obtain explicit owner consent to *review metadata*; check sensitivity; present a human review receipt. This branch builds reviewManualRecordIntake, not an import pipeline.
- Source content is NOT read. Output always says contentsOpened=false, recordImported=false, retentionApproved=false, legalActionExecuted=false. Consent to review does not authorize processing, disclosure, storage, legal filing or external action.
- Fail closed for missing purpose/source, wrong project, duplicate intake IDs, absent consent and sensitive/unknown privacy class. No family, school, medical or legal records copied automatically.
- Later authorized workflow: source owner/provenance/rights and purpose -> exact consent -> classification -> isolated preview/read -> source/lineage/retention decision -> user-approved action -> independently verified receipt. Each stage has a separate permission boundary.

## Closeout gates
1. Tests and exact-head TypeScript verified on isolated review branch. Source-green only.
2. Group 15 owner review of Arbor Life MVP boundaries and Diary storage choices, without claiming approval through this draft.
3. Group #13/Grove UI integrates only after concurrent file-owner reconciliation; Group #4 handles privacy/storage; Group #9 decision model must not infer user values; Group #12 actual host/device use.
4. Qualified legal/financial decision on any ownership or funding claims, with verified agreements and evidence, never inferred by code.
5. No main merge, Preview/prod deploy, personal-data capture, paid inference, ledger migration, worker/control permission change, task/STOP canary, or Sept 28 ARK research task mutation.

Status summary: G10 design recovery / owner approval GATED; G11 existing UNSAVED source UI / persistence GATED; G13 source metadata review prototype / legal decision GATED; G14 source metadata review prototype / actual record handling GATED. NONE live-complete.