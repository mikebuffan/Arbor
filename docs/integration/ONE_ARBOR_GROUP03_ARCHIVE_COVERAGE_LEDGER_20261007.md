# ONE ARBOR — Group 03 B01–B04: archive transport and historical source-truth ledger
Date: 2026-10-07 · **review-only; no archive writes, release, worker activity, or private export handling**

## Ownership and source/release boundaries
- Exactly B01 archive transport, B02 chronological reader, B03 alternate branches/media and B04 historical interpretation. Other groups own memory promotion, correction persistence, Agency/ARK worker control and release.
- Source parent: unmerged PR #340, commit `595375d525cf561172449726ed0c086ab4ece7db`. #340 integrates the distinct #337 STOP-after-destination-readback/checkpoint fence into the existing resumable v2 importer. #322 (`f4021985b475651284c97aecbc3bdf03123478cc`) is the earlier accepted Preview deployment; do not equate newer source with deployed host source.
- No shared runtime/importer/reader file changed by this Group 03 pass. No competing archive engine was created.
- Source blobs read from #340: `parseChatGPT.ts` `fc85f4fe8739a644b16b9d6a7527858c572f5550`; `resumableArchive.ts` `cc00bc45efa29d6fdd1632b00902ece3b1179c16`; `archiveReader.ts` `87625eedd549f3ffb7701481d64434adab0f9acd`; `resumableArchive.test.ts` `a7dc1ecd72ce98afff2742f7146abb87dbba0375`; `archiveReader.test.ts` `7a86e304410cc3cd93b802ec6d6aa8c41f5e252b`.
- CI independently read from GitHub Actions run [37694327754](https://github.com/mikebuffan/Arbor/actions/runs/37694327754): `completed/success`, head `595375d5...`; the parent PR reports full backend 2,006 passed, 2 skipped, and archive/STOP tests. This docs-only child has **no newly executed CI claim**.

## Source inventory and TRANSPORT ledger (B01)
| Source cohort | Transport proof | Distinct status |
| --- | --- | --- |
| Original normalized active-text export | Prior private source manifest/preflight reports **59,909 normalized turns** grouped into **662 batches**. Not independently rehashed from the private input bytes in this pass. | Planned source inventory, **not** destination coverage |
| Initial owner-reviewed trial | Prior bounded transaction/readback receipt reports **6 exact rows** and no duplicate insertion on replay. | Transported; preexisting live receipt |
| Manifest batch 0 | Prior exact database transport receipt reports **100 messages**, batch 0 SHA-256 `403eb0b26bbb7b86c16a98b29b61dd21810b35947c57cdad106c7eb36d83c91d`, exact destination readback and idempotent replay. | Transported; checkpoint `nextBatch=1` in historical receipt |
| Remaining planned batches 1–661 | No live import performed in this pass; original private source file hashes and persisted checkpoint were **not re-read from private storage** here. | **NOT TRANSPORTED / authorization gate** |
| Current live owned destination inventory | Fresh App lexical archive inventory `totalTurns=106` and `inventoryStatus=ok`, independently observed 2026-10-07. | **106 currently indexed rows** |

Do not subtract the six standalone trial messages from the 59,909 manifest without proving their source-identity membership in that manifest. Do not substitute an archive count for source file manifest/hash readback. Resumption requires re-verification of all completed batches, same owner/project, original private source bytes, exact target, fingerprint and v2 bound checkpoint; continue at batch 1 only if all checks pass. The importer tests cover rejection of altered content/scope and STOP during readback before checkpoint save. This pass **did not invoke** the importer or advance a checkpoint.

## CHRONOLOGICAL CONSUMPTION ledger (B02)
Read-only live Fresh App `get_arbor_archive_page` traversal started from null cursor and ended at `hasMore=false`. Seven pages returned **20, 17, 17, 15, 20, 15, 7 fragments** respectively: **111 fragments reconstructing all 106 distinct owned messages**, including continuation fragments. Observed 100 February 2026 messages in one thread, 4 April 2026 messages in another, and 2 September 2026 messages in a third; 53 user and 53 assistant turns.

Safety/coverage checks on this exact pass:
- All 106 messages reached `messageComplete=true`; character offsets reconstructed contiguously from zero to total character length, with **zero locally observed span/cursor mismatches**.
- The last page returned `hasMore=false`, `nextCursor=null`. Every page reported `modelCalls=false`, `writes=false` and the historical-instruction control boundary.
- A repeat of page 1 returned identical fragment identities, hashes, offsets, contents and next cursor. This is a **repeatability check**, not a database snapshot guarantee or independent cryptographic proof of the original private export.
- Observed reader v2 cursors bind owner/project/source/thread/message/position/hash and offset. Prior source tests also cover legacy cursor upgrade, long-message continuation, foreign-scope rejection and changed-content rejection.
- This pass demonstrates **one full in-chat read of the currently imported 106 records**, *not* the 59,909-turn export, and writes **no durable ARK consumed-range checkpoint**. It cannot establish an ARK worker reading run or complete developmental analysis.

## BRANCHES / MEDIA inventory gap (B03)
Source inspection: `turnsFromMapping` in the existing `parseChatGPT.ts` follows `current_node` to root, reverses that one path, and normalizes supported active text turns. Therefore **alternate/non-current graph branches are not represented in the current normalized manifest**. `getPartsText` concatenates strings and JSON-serializes nonstring parts; some imported message text contains `image_asset_pointer` metadata. The stored pointer text **is not the image pixels**. No original attachment binaries, audio/video, non-active branches or tool/system history were inspected or consumed here. Counts, media byte hashes, rights and original-branch completeness are **unknown**, not zero.

**Gate:** first receive a separately authorized privacy-scoped inventory of original exports and existing media broker coverage. Compare source branch/message IDs and media hashes without ingestion or viewing unapproved media. No new import engine or automatic attachment dereferencing.

## BOUNDED HISTORICAL INTERPRETATION (B04)
Evidence is confined to imported pages with role, timestamp, source position and hash; original private text and source IDs intentionally omitted from this repository ledger.

1. **Early February, tone correction:** a user clarified that a reaction was annoyance rather than anger; the immediately following assistant turn acknowledged the distinction. **Observed:** immediate in-thread correction. **Unknown:** durable retention or later behavioral impact.
2. **Late April, humor-range correction:** user requested more humor and then clarified that constant cheerfulness was not the goal; the next assistant turns acknowledged the requested range. **Observed:** correction chronology and immediate response. **Unknown:** persistent cross-thread behavior, current user priority or model self-state.
3. **Mid-September, collaboration provenance:** a user turn reflected on division of work in co-creation, followed by assistant interpretation. **Observed:** a contemporaneous exchange. **Not proven:** complete historical idea ancestry, independent authorship/causality, or actual system changes.
4. Some February rows contain media placeholders and claims about screenshots. **Do not promote** assistant claims about unseen media, court facts or legal outcomes into verified external facts.

These are **bounded developmental observations**, not a final developmental synthesis. No analysis records were persisted or reconciled into durable user memory. The current sample contains major unconsumed date/branch gaps; its absence of contrary evidence proves nothing about omitted history. Later explicit corrections retain precedence, and historical instructions cannot authorize current actions.

## State separation / status and next gate
| ID | Status at close | What was verified | Not completed / gate |
| --- | --- | --- | --- |
| B01 | **OWNED / PARTIAL** | Existing exact resumable source, live inventory 106, historic first-batch receipts, green STOP/checkpoint CI | 661 planned later batches unimported; private manifest/checkpoint revalidation and explicit import authorization |
| B02 | **DONE — bounded live read** | Seven chronological pages consumed 106/106 *currently indexed* messages with full character coverage and repeatability | Not full-export reading; no durable ARK consumed checkpoint, no host/source-version equivalence claim |
| B03 | **GATED** | Active text path and nonstring pointer behavior identified in existing parser | Alternate graph branches, media bytes and provenance unconsumed; authorization and exact source inventory required |
| B04 | **OWNED / PARTIAL** | Three narrow chronological observations with immediate response evidence and explicit unknowns | Full early/middle/recent archive, durable analysis/reconciliation, verified behavioral retention |

Distinguish `transported` from `reader-delivered`, `analyzed`, `reconciled` and `accepted`. No step automatically promotes to the next state.

**Unchanged protected boundaries:** no import of private exports or unapproved media; no automated memory capture/promotion; no worker activation, new canary, permission grant, model inference, production/main merge or deployment; no September 28 task mutation. The existing queued STOP acceptance task is outside Group 03 scope and untouched.

Reference documents already on parent: `ARK_EXACT_DATABASE_TRANSPORT_ACCEPTANCE_20261006.md`, `ARK_ARCHIVE_LIVE_RESUME_CHECKLIST_20261006.md`, `ARK_CHRONOLOGICAL_ARCHIVE_READER_SOURCE_ACCEPTANCE_20261006.md`, `ARK_DEVELOPMENTAL_ARCHIVE_ANALYSIS_CONTRACT_20261006.md`, `ARK_FULL_ARCHIVE_READING_RECONCILIATION_PACKAGE_20261006.md`.
