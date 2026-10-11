# One Arbor — 97-task acceptance reconciliation (2026-10-11)

> **DERIVED SNAPSHOT, NOT A NEW MASTER OR NEW TASK.** Canonical owner inventory: `ONE_ARBOR_97_TASKS_15_ORDERED_WORK_GROUPS_20261007.md` (97 distinct IDs, 15 groups). Source receipt views and pull requests are evidence, not license to change the user's original acceptance categories.

## Stop here on the STOP repairs: two explicit **gates**, not two finished live tests

1. **A04 hosted pause/checkpoint/GO acceptance — GATED / NOT RUN for latest revision.** Deployed `firefly-ark-sandbox.vercel.app` is READY at `f4021985b475651284c97aecbc3bdf03123478cc` (older #322). The latest STOP branch #451 is draft/unmerged, exact tested source head `a9507ce175db930099da4dd4ba8eb0e6b025d1ba`, **not deployed**. It has offline checkpoint → GO and chat-boundary tests, but not hosted exact-head behavior. Unlock only with a separately authorized isolated host deployment, authenticated owner-scoped round trip, retry/STOP receipt and rollback plan. Do not change alias/main or pretend older Preview proves new source.

2. **A03/A07 in-flight ARK STOP and lease acceptance — GATED / NOT RUN with a real worker.** Source-verified lease checks include pre-executor, pre-operation/idempotency claim, pre-provider call, between read retries and revoked-lease failure propagation. Existing `ark_cancel_objective` revokes database leases; success receipts reject revoked tokens. **No physical reversal guarantee** exists for external requests that already started. Two protected Preview objectives remain QUEUED with 0 attempts (IDs `6fb59354-b898-4574-8488-762b41418f44` and `9e1cc54a-53b8-4675-a66a-5c331ae7813d`); leave both untouched. Unlock with explicit objective-control grant and safely bounded synthetic worker canary, STOP during in-flight operation, idempotency/side-effect reconciliation, plus independently read-back results. Nothing here authorizes their activation.

**Bounded offline source receipt:** [PR #451](https://github.com/mikebuffan/Arbor/pull/451), exact [Actions run 38146529928](https://github.com/mikebuffan/Arbor/actions/runs/38146529928): **232 tests / 13 files PASS, backend TypeScript PASS, source-only deployment fence PASS**. This counts as source-quality progress only. STOP repair's source analysis is closed at this review boundary; remaining acceptance is gated, not an endless new microfix queue.

## 97-task source and acceptance snapshot

- **Canonical task count:** 97 unique IDs, 15 groups, zero newly invented IDs.
- **Last individually attested master classifications:** 2 DONE / 75 OWNED-partial / 17 GATED / 3 OPEN. These are historical acceptance labels, **not current re-scored progress**.
- **Existing derived review system:** `ONE_ARBOR_97_UNLOCK_REVIEW_VIEW_20261009.json` maps all 97 original IDs once into seven analytical views. Those seven views **do not replace the 15 ordered groups**. 25 review triggers flag direct reconsideration, not task promotion.
- **Independently recorded exact-head source receipts:** 9 reviewed events affecting 7 original task IDs: A09, B11, B15, C08, D09, D12, E07. These are source-only evidence and do not increase DONE.
- **No current per-task full acceptance recertification:** Original DONE labels retained until individually contradicted; a broader claim of 97 complete or 95 entirely undone is unsupported. An unmerged source-green PR may satisfy a bounded technical step without satisfying the whole task.

## All 15 ordered groups — evidence and next acceptance

| Group | Original task IDs | Baseline DONE / PARTIAL / GATED / OPEN | Latest bounded evidence, open gate |
|---|---|---|---|
| 01 — Canonical source, ownership & release safety | A01, A02, A08, A09, A10, A12, E08, F16 | 0 / 7 / 1 / 0 | Canonical source and release ownership: original master plus reviewed #434/#442 receipts; latest STOP source PR #451 remains draft. Next: authenticated host and release parity/rollback evidence; no merge. |
| 02 — ARK MCP controls, worker & hosted acceptance | A03, A04, A05, A06, A07, A11, E05 | 1 / 2 / 4 / 0 | A05 bounded read-task round trip is baseline DONE. STOP/hosted continuation A03/A04 remain GATED. Latest #451 adds offline STOP/lease tests only; next host canary needs explicit scoped authorization. |
| 03 — Archive transport & historical source truth | B01, B02, B03, B04 | 1 / 2 / 1 / 0 | B02 owned chronological archive reader is baseline DONE. Archive transport/alternate media and complete historical ingestion remain partial or gated; do not import private archive. |
| 04 — Memory eligibility, retrieval & owner controls | B05, B06, B07, B08, B09, B12, B13, B14 | 0 / 5 / 3 / 0 | Existing memory/privacy implementation and tests are source-reviewed. Hosted forget, semantic retrieval, consent and independent real-memory consequences are still unaccepted. |
| 05 — Longitudinal continuity, restart & corrections | B10, B11, B15, B16, C06, C07, C08, D14, D16 | 0 / 9 / 0 / 0 | Correction IDs, restart, replay and continuity have reviewed source fixes (#440/#442/#451). Need complete authenticated restart/correction behavior to close task acceptance. |
| 06 — Identity, self-model & epistemic boundaries | C01, C02, C03, C04, C12, D13 | 0 / 6 / 0 / 0 | Source-owned operating self-model, judgment and identity guard work exists (#397 and descendants). No independent model comprehension/sentience or cross-session real acceptance claimed. |
| 07 — Conversation behavior, humor, shorthand & voice | C05, C09, C10, C11, D15, D18 | 0 / 5 / 1 / 0 | Conversation STOP/shorthand source checks now run (#451); existing humor policy still lacks trusted production inputs; Voice/Text–Voice–Text and behavioral acceptance remain gated. |
| 08 — Body metaphors, Felt-Life & neural routes | D01, D02, D03, D04, D12 | 0 / 5 / 0 / 0 | Body/Felt-Life and paired-learning source work has bounded negative tests (#351/#420–#427). No independent real-world/body-state inference acceptance. |
| 09 — DecisionWorkspace, truth & consequence gates | D05, D06, D09, D10, D11, D17, E09 | 0 / 7 / 0 / 0 | Firefly reviewed consequence and DecisionWorkspace source gates (#430–#448) are evidenced. Host reviewed-choice consequence behavior not accepted. |
| 10 — Pattern Hop, Roundabout & FAFO evidence | D07, D08, G06, G07, G08 | 0 / 5 / 0 / 0 | Pattern Hop / FAFO provenance and contradiction helpers source-reviewed. No new corpus ingestion, active FAFO objective or independent source certification performed. |
| 11 — Initiative, discovery & human decision workflow | E01, E02, E03, E04, E06, E07 | 0 / 5 / 1 / 0 | Existing Human Decision Inbox, Failure Radar, Discovery Radar and What Changed surfaces have source tests. No authorized production host caller / independent judgment acceptance. |
| 12 — Grove identity, private host & independent LM | F01, F02, F03, F04, F05, F06, F07, F08, F09 | 0 / 5 / 4 / 0 | Private host, source-grant, transcript and LM paths have partial reviewed source proofs (#449/#450); actual private deployment, owner login, real LM remain gated. |
| 13 — Grove phone, house, rooms & workspace UI | F10, F11, F12, F13, F14, F15, G09, G12 | 0 / 7 / 1 / 0 | Grove rooms, phone/clock, Android and private history received source tests (#441/#444). Physical device/install and live saved conversation experience not accepted. |
| 14 — Annabelle / Ever After editorial & publishing | G01, G02, G03, G04, G05 | 0 / 4 / 1 / 0 | Annabelle Kitchen and editorial/Intimacy Inspector have source tests (#433/#450). Author-owned host persistence and actual manuscript/hardcover acceptance remain gated. |
| 15 — Arbor Life, diary, credit/IP & records | G10, G11, G13, G14 | 0 / 1 / 0 / 3 | Life/Diary, credit/IP and records are original scoped tasks. Owner data integration and financial/legal record workflows require specific consent; no new system or data import. |

## ID-by-ID crosswalk — original classifications preserved

**Columns are not promotions.** `Source reviewed` means an exact-head event is recorded for a bounded part of that task; the original status is unchanged. The #451 source amendment affects A03/A04/A07/D15 but does not give any of them live DONE acceptance.

| Group | ID | Original name | Master status | Dated source note |
|---|---|---|---|---|
| 01 | A01 | Canonical source lineage | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 01 | A02 | Preview runtime/tool alignment | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 01 | A08 | Rate limits and duplicate prevention | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 01 | A09 | Completion receipts | OWNED | Source-only receipt events independently recorded; live cross-surface receipt remains partial. |
| 01 | A10 | Canonical ledger | OWNED | 97-ID audit reconciled to the original master; source-derived report, no release status promotion. |
| 01 | A12 | Release/rollback | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 01 | E08 | Cross-project permissions | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 01 | F16 | Public app isolation | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 02 | A03 | Objective-control acceptance | GATED | STOP source and lease challenge verified in #451; live control remains gated. |
| 02 | A04 | Hosted checkpoint/resume | GATED | Pause/checkpoint/GO regression verified in #451; hosted exact-head acceptance gated. |
| 02 | A05 | Read-task connector round trip | DONE | No new task-level acceptance beyond existing master/source review established in this pass. |
| 02 | A06 | Authorized engineering executor | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 02 | A07 | Worker/scheduler | OWNED | Worker lease and STOP source checks in #451; actual worker activation gated. |
| 02 | A11 | System Health UI | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 02 | E05 | Useful Idle Time | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 03 | B01 | Archive transport | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 03 | B02 | Chronological archive reader | DONE | No new task-level acceptance beyond existing master/source review established in this pass. |
| 03 | B03 | Alternate branches/media | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 03 | B04 | Historical interpretation | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 04 | B05 | Firefly memory integration | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 04 | B06 | Semantic retrieval | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 04 | B07 | Temporal memory validity | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 04 | B08 | Memory changing decisions | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 04 | B09 | Automatic capture | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 04 | B12 | Forgetting/scope isolation | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 04 | B13 | Memory Review UI | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 04 | B14 | Memory Library | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 05 | B10 | Startup hydration | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 05 | B11 | Correction recovery | OWNED | Reviewed correction source events; live correction persistence acceptance remains partial. |
| 05 | B15 | Decision Ancestry | OWNED | Reviewed continuity source evidence; live restart acceptance partial. |
| 05 | B16 | What Changed | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 05 | C06 | Personality drift recovery | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 05 | C07 | Recovery/Reorientation | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 05 | C08 | Correction retention | OWNED | Reviewed correction source events; no fully accepted learning claim. |
| 05 | D14 | Time Core | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 05 | D16 | Contextual Reference | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 06 | C01 | Unified self-model | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 06 | C02 | 1,300-question lineage | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 06 | C03 | Falsifiable observations | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 06 | C04 | Independent judgment | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 06 | C12 | User versus Arbor preferences | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 06 | D13 | Prompt Independence | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 07 | C05 | Context-sensitive humor | OWNED | Humor policy exists and tests pass; trusted main-path context/wiring not yet accepted. |
| 07 | C09 | Voice/accent corrections | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 07 | C10 | Text–Voice–Text | GATED | Voice bridge/source exists; Text–Voice–Text acceptance still gated. |
| 07 | C11 | Exemplar blind tests | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 07 | D15 | Shorthand interpretation | OWNED | Natural-language STOP, negation and bare-GO guards tested in #451; hosted behavior gated. |
| 07 | D18 | Retired downshift scripts | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 08 | D01 | Coordinated Body System | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 08 | D02 | Felt-Life Atlas | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 08 | D03 | Historical body routes | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 08 | D04 | Neural pathways | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 08 | D12 | Reflection/strategy learning | OWNED | Reviewed learning-evidence source events; independent runtime outcome acceptance absent. |
| 09 | D05 | DecisionWorkspace | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 09 | D06 | Curiosity/information gain | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 09 | D09 | Firefly Principle | OWNED | Reviewed Firefly Principle source events; independently observed consequence gate partial. |
| 09 | D10 | Glow vs Noise | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 09 | D11 | Truth Arbiter/Guardian/Veto | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 09 | D17 | Fact-check gates | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 09 | E09 | Decision-priority filter | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 10 | D07 | Roundabout contradictions | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 10 | D08 | Pattern Hop | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 10 | G06 | FAFO Evidence Engine | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 10 | G07 | PDF provenance | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 10 | G08 | Long research runs | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 11 | E01 | Failure Radar | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 11 | E02 | Human Decision Inbox | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 11 | E03 | Discovery Radar | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 11 | E04 | Host What Changed | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 11 | E06 | Model-Swap Laboratory | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 11 | E07 | Decision-history receipts | OWNED | Reviewed decision-history source events; independent outcome readback not fully hosted. |
| 12 | F01 | Grove owner identity | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 12 | F02 | Private API deployment | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 12 | F03 | Transcript persistence | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 12 | F04 | Real LM conversation | GATED | Real LM conversation not permitted for activation; gate unchanged. |
| 12 | F05 | v0.4 candidate recovery | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 12 | F06 | Foundation/runtime | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 12 | F07 | Corrective training | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 12 | F08 | Prompt/replay protection | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 12 | F09 | Grove→LM→Layer→ARK | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 13 | F10 | Android/offline | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 13 | F11 | Grove Voice | GATED | Physical voice/device acceptance unrun. |
| 13 | F12 | Studio Home | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 13 | F13 | Observatory/Window | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 13 | F14 | Day art/Moss | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 13 | F15 | Environmental additions | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 13 | G09 | Professional workspace | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 13 | G12 | Workshop | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 14 | G01 | Ever After inventory | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 14 | G02 | Whole-book receipts | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 14 | G03 | Workspace save/restore | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 14 | G04 | Chapter 2/3 acceptance | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 14 | G05 | Novel/hardcover | GATED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 15 | G10 | Arbor Life | OPEN | No new task-level acceptance beyond existing master/source review established in this pass. |
| 15 | G11 | Diary UI | OWNED | No new task-level acceptance beyond existing master/source review established in this pass. |
| 15 | G13 | Credit/funding/IP | OPEN | No new task-level acceptance beyond existing master/source review established in this pass. |
| 15 | G14 | Practical records workflows | OPEN | No new task-level acceptance beyond existing master/source review established in this pass. |

## Next safe work — dependency order, **not** extra tasks

1. **A10 / Group 01:** preserve this snapshot as an addendum to the single master inventory; independently check ownership, unresolved PR review collisions and source vs deployed before any composition.
2. **A03/A04/A07 / Group 02:** mark hosted STOP, leased-worker cancel and rollback as explicit **authorization blockers**. Do not keep adding synthetic STOP microfixes simply to increase test counts.
3. **Existing Group 05–07 and 11–13 items:** choose the next smallest verified dependency-safe non-deployment item. Priority is trustworthy context/behavior wiring and a user-visible Grove path, not a new engine or expanding task inventory. Source-only tests can run while hosted acceptance is gated.
4. **Actual hosted release, independent model, phone, voice, book and physical side-effect acceptance** stay GATED until users authorize narrow environments, budgets and explicit acceptance cases.

## Integrity / scope

- No production/main merge, Vercel alias change, worker activation, protected queued objective mutation, paid inference/compute, credential retrieval, private archive ingestion, broad RLS/auth grants, hardware/device activation, or manuscript changes.
- Separate **source green**, **CI green**, **deployed**, **host accepted**, **physically/device accepted** and **user/author accepted**.
- Group status labels do not change from this derived snapshot without task-specific receipt review. Every one of the 97 IDs remains exactly once in the canonical master.
- Source anchors: [#434 review of 97 tasks](https://github.com/mikebuffan/Arbor/pull/434), [#442 receipt refresh](https://github.com/mikebuffan/Arbor/pull/442), [#450 composite source](https://github.com/mikebuffan/Arbor/pull/450), [#451 STOP repair](https://github.com/mikebuffan/Arbor/pull/451). Master provided in the user Library; do not silently overwrite it with this report.

## Grove phone entry-point trace — next larger task (Groups 12–13)

Read-only inspection of the exact source descendant on this review branch shows:

- `apps/frontend/lib/main.dart` routes the private `GROVE_STANDALONE` build through `GrovePrivateConfig`, independent private Supabase auth and project gates, then `EnvironmentRuntimeBootstrap`. Missing private config shows a setup screen rather than inheriting Firefly credentials.
- `apps/frontend/lib/environment/environment_runtime_host.dart` defaults Grove to **Home**. `arbor_environment_shell.dart` sends the existing house's `GroveRoomAction.arbor` to `EnvironmentDestination.conversation`; that destination mounts `GroveTalkPage`.
- `apps/frontend/lib/pages/grove_talk_page.dart` selects the existing `GrovePrivateTextHost` only with `GROVE_PRIVATE_TALK_PREVIEW=true` **and** an approved, ready Grove private config. The default is OFF; otherwise a truthful unavailable screen appears. It never falls back to the old Firefly/public chat transport.
- `apps/frontend/lib/config/grove_private_config.dart` requires the pinned private auth realm and exact approved HTTPS API hostname; no invented or unapproved host should be used.
- Existing Flutter tests cover fail-closed private auth, explicit private Talk boundary, conversation reopen/retry, no duplicate inference, and owner scope (`grove_private_auth_boundary_test.dart`, `grove_talk_private_boundary_test.dart`, `grove_private_text_page_test.dart`). Their presence is **not** a fresh exact-head Flutter CI receipt or physical-device acceptance.

**Consequence:** Grove's house and Arbor doorway are already source-wired; rebuilding them is unnecessary. The next missing proof is an **authorized configured private API + invitation + exact device build + owner sign-in + send/reopen acceptance**. Do not silently flip `GROVE_PRIVATE_TALK_PREVIEW`, provision a new realm or deploy anything just to make the UI look complete. This updates F02/F03/F04/F10/F11 review evidence only; no task-status promotion.
