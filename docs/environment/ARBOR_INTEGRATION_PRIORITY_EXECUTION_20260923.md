# ARBOR / ARK / GROVE — ONE INTEGRATION EXECUTION QUEUE

Maintainer goal: **get EXISTING systems talking, preserve their owners, ship a private verified pause→return conversation and only then permit bounded ARK work**. This is a priority-ordered acceptance ledger, not an invitation to invent more cognitive subsystems. Source work is *not* the same as production deployment.

Last reconciled: 2026-09-23 UTC. This is the canonical **planning/acceptance document for the integration candidate**, NOT an instruction to merge any stacked experimental PR.

## Status legend

- **VERIFIED-CI**: exact head tested in GitHub CI, synthetic fixtures; NOT proof of live deployment.
- **CODE-DRAFT**: source exists behind OFF flag, needs exact-head CI/review.
- **REVIEW**: engineering/privacy/security owner decision required.
- **OWNER**: Danelle's explicit account, access, cost or rollout choice required.
- **EXTERNAL**: needs real private infrastructure and/or separate LM workstream.
- **NEXT**: safe source-level step assistant can take on the existing branch.
- **HOLD**: intentionally forbidden until prerequisite is met.

## Source-of-truth and non-duplication contract

- Cognitive stack: #188 associative pathways → #190 learned routing → #191 assembly → #192 durable cognitive state + Firefly/Human Rhythm in ORIGINAL knowledge roundabout.
- Source-level composite: #193 private Grove owner/conversation/ARK Layer → strict signed private LM receiver.
- Private transcript extension: #194; CI-only mirror #195. **#194 is the CURRENT continuation**; never merge #195 separately.
- Grove private owner and environment #179, signed LM transport #166, Arbor Layer #160, ARK objective/work authorization, Grove Flutter house/UI each have their own owners/branches. Do not cherry-pick a stale copy or recreate an existing subsystem.
- #194 CI head at initial roadmap verification: 1a9c72856321a753842196c23e96e7c4f7e17b7e, workflow 35829424636 success. Later commits require NEW exact-head checks.
- Firefly Principle: Observe → first Choice → Awareness → second Choice → Consequence → Observe; a choice is not a verified consequence. Human Rhythm: stability → instability → return, preserving unfinished work; neither infers the user's health/mental state.
- Original diagram's roundabout ROUTES; existing bridges transform information. No novel parallel translator. A private LM generates language; ARK verified tools execute; neither substitutes for proof.
- Never copy private chat/files/secrets into GitHub. No implicit assistant authority to migrate, grant, spend, deploy, train on the user's content, or claim live task completion.

## Phase 0 — Freeze reference and eliminate duplicate work (dependency gate: before every new branch)

- [x] 00.01 Identify latest #194 exact candidate, #193 parent and independent Grove/ARK/Layer/LM branches. **VERIFIED-CI at previous head**.
- [x] 00.02 Verify parent #193 integration CI and prior #192 roundabout CI. **VERIFIED-CI**.
- [x] 00.03 Preserve private Grove vs public Firefly vs ARK Preview Supabase identities and backend roles.
- [x] 00.04 Keep new model/cognitive/turn features default OFF and all existing production deployments untouched.
- [ ] 00.05 Recheck PR heads and both sides' changes before any future edit; do not overwrite another thread's work. **NEXT each turn**.
- [ ] 00.06 Refresh this queue with exact commit, CI run, test count and current blockers after each milestone. **NEXT**.
- [ ] 00.07 Review full ancestor dependency diffs and GitHub branch topology before a controlled integration/release PR. **REVIEW**.

## Phase 1 — Trusted PRIVATE Grove identity and scope (must precede ANY private data, model or worker)

- [x] 01.01 Grove token must verify against Grove Auth issuer/audience/signature, not merely decode a JWT. **CODE-DRAFT**.
- [x] 01.02 Require active invite in Grove; never auto-create an invited account from prompt content. **CODE-DRAFT**.
- [x] 01.03 Verify exact Grove→Firefly owner mapping before using any Firefly service-role client. **CODE-DRAFT**.
- [x] 01.04 Verify explicit active Grove-granted Firefly project + actual Firefly project ownership. **CODE-DRAFT**.
- [x] 01.05 Verify exact Firefly conversation ownership/project; reject different conversation fallback. **CODE-DRAFT**.
- [x] 01.06 Read private transcript only after a fresh owner/bridge/grant/conversation authorization. **CODE-DRAFT**.
- [x] 01.07 Re-authorize invitation/bridge/project/conversation after private-model inference and before transcript write; changed/revoked scope aborts persistence. **CODE-DRAFT, latest CI pending**.
- [ ] 01.08 Ensure post-inference reauthorization also gates delivery for responses when transcript is OFF and any future worker/tool, not only transcript writes. **NEXT**.
- [ ] 01.09 Add timeout/race tests for token revoked between the last check and commit, including an explicit transaction policy. **NEXT/REVIEW**.
- [ ] 01.10 Approve real Grove invited owner identity, Firefly mapping and exact ARK project grant. **OWNER**. Current audited active grant/owner/bridge counts were each zero; recheck before setup.
- [ ] 01.11 Decide how to select/create a legitimate Firefly conversation for Grove; NEVER invent or reuse an unrelated public chat ID. **OWNER/REVIEW**.

## Phase 2 — Grove PRIVATE transcript and continuity (requires Phase 1)

- [x] 02.01 Build Grove-only complete-turn store, not Firefly public chat messages. **VERIFIED-CI at prior head**.
- [x] 02.02 Scope each row/query to Grove owner + Firefly project + exact conversation. **VERIFIED-CI**.
- [x] 02.03 Persist only after model responds and read back the saved pair; no false persisted:true on DB failure. **VERIFIED-CI**.
- [x] 02.04 Store retry request ID as idempotency metadata, not authorization or model identity; conflicting text rejects. **VERIFIED-CI**.
- [x] 02.05 Rebuild bounded completed-pair model history after process restart without browser-supplied roles or history. **VERIFIED-CI**.
- [x] 02.06 Expose separate owner-scoped GET /api/grove/chat/history; no-store, sanitized errors, six-pair truncation flag. **VERIFIED-CI**.
- [x] 02.07 Draft separate Grove Supabase migration, with proposed RLS+FK; do NOT apply to Firefly. **CODE-DRAFT only**.
- [ ] 02.08 Add explicit transcript retention, deletion, export and backup policy including user opt-in and revocation behavior. **OWNER/REVIEW**.
- [ ] 02.09 Trial proposed Grove SQL on a disposable database; verify FK, grants, default RLS deny, service role, delete cascades and data isolation. **REVIEW**.
- [ ] 02.10 Add bounded paginated full-history UX contract or disclose exactly six-pair latest-only window; do not call six turns full history. **NEXT**.
- [ ] 02.11 Add per-conversation message ordering, concurrent request stability and response-size edge tests with monotonic ordering strategy. **NEXT**.
- [ ] 02.12 Add durable recovery of *current goal/unfinished work* from canonical ARK/continuity read—not a summary guessed from chat text. **NEXT / depends Phase 3**.
- [ ] 02.13 Apply reviewed Grove-only migration ONLY after owner approval, test restore/rollback, and verify actual RLS. **OWNER + REVIEW**.

## Phase 3 — ARK read and executable work boundary (read can precede LM; execution cannot)

- [x] 03.01 Authenticated Grove→Firefly ARK read uses existing Layer read model and explicit project scope; no simulated worker heartbeat. **VERIFIED-CI**.
- [x] 03.02 Preserve objective/task/checkpoint/event source and partial-window limitations; do not call bounded count exhaustive. **VERIFIED-CI**.
- [ ] 03.03 Reconcile ARK's existing canonical objective selector with read model (original work-order/agency PR owners); NO duplicate selector. **NEXT / REVIEW**.
- [ ] 03.04 Verify objective status, authorized next action, checkpoint revision, blocker and owner-decision semantics using original ARK code. **NEXT**.
- [ ] 03.05 Put executor behind explicit owner-approved project, actor/tool allowlist and bounded permissions; LM prose cannot grant permission. **REVIEW / HOLD**.
- [ ] 03.06 Introduce host-verified outcome receipts with objective/task/actor/time/evidence, scoped across projects. **REVIEW / HOLD**.
- [ ] 03.07 Verify failure, ambiguous output, stale lease, retry/dedup, cancellation and rollback never become false completed status. **NEXT / disposable only**.
- [ ] 03.08 Verify pause/checkpoint/restart and “list and go” resumption only for authorized work; clarify blockers rather than guessing. **NEXT / disposable**.
- [ ] 03.09 Separate ARK Preview research/excavation permissions from Grove personal objectives and public Arbor App. **REVIEW**.
- [ ] 03.10 Enable real work execution only after security, owner approval, revocation and evidence acceptance. **HOLD**.

## Phase 4 — Existing Arbor Layer, memory, pathways and cognition

- [x] 04.01 Reuse the original roundabout, its road map and selective bridge functions. **VERIFIED-CI**.
- [x] 04.02 Preserve Firefly's two distinct choices and outcome gate; contradictions hold, corrections backtrack. **VERIFIED-CI**.
- [x] 04.03 Preserve Human Rhythm instability/return without identity reset or inferred clinical state. **VERIFIED-CI**.
- [x] 04.04 Compose original Pattern Hop, sparse pathway route, body/felt-state read and cognitive snapshot *source* without another learner. **VERIFIED-CI synthetic**.
- [x] 04.05 Do not promote memory/source-family duplicates into independent corroboration or tool authorization. **CODE-DRAFT and tests**.
- [ ] 04.06 Review/provision versioned, owner/project-scoped cognitive snapshot schema on approved isolated trial database. **OWNER/REVIEW**.
- [ ] 04.07 Connect real trusted scoped retrieval; preserve original provenance and independent source families. **NEXT / REVIEW**.
- [ ] 04.08 Enable cognitive preview only when a real snapshot+provider exist; absent provider must HOLD, not invent a brain. **NEXT**.
- [ ] 04.09 Test protected corrections, identity merging gate, hallucination/uncertainty, model feedback and no unapproved training. **NEXT**.
- [ ] 04.10 Prove “objective→interruption→return→correction→verified consequence” in a disposable end-to-end fixture. **NEXT after 3–4**.

## Phase 5 — Private language-model connection (separate LM training lane)

- [x] 05.01 Preserve existing strict signed host→Python v0.3.5 receiver contract; browser cannot submit context/owner/tool roles. **VERIFIED-CI source seam**.
- [x] 05.02 Keep Firefly cognitive JSON host-only until Python receiver accepts a reviewed *data* schema; never smuggle it into strict ARK Layer context. **CODE-DRAFT**.
- [ ] 05.03 Define versioned bounded optional Firefly cognitive payload on both sender and receiver; validate scope/provenance/size/authority. **NEXT / LM lane**.
- [ ] 05.04 Add HTTP auth freshness, nonce/replay defense shared across receiver instances, timeouts and cost caps. **REVIEW / LM lane**.
- [ ] 05.05 Verify approved private inference host, real v0.3 adapter/checkpoint, signed request and real text response. **EXTERNAL**.
- [ ] 05.06 Test private-data logging/tracing/redaction, failures, retry behavior, model overload and graceful refusal. **REVIEW / LM lane**.
- [ ] 05.07 Confirm a real model turn with trusted Layer context; no fake worker receipts or model-reported completion. **EXTERNAL**.
- [ ] 05.08 Do NOT gate Grove architecture work on finishing a new trained LLM checkpoint; connector can be tested with a stub. **ONGOING RULE**.

## Phase 6 — Grove PHONE interface and environment (after owner/conversation selection)

- [x] 06.01 Keep approved house/Living Window/Observatory/Moss assets and private app boundary unmodified. **EXISTING Grove UI drafts**.
- [x] 06.02 Keep private Talk unavailable instead of silently sending Grove conversations to public Firefly /api/chat. **VERIFIED Grove UI baseline**.
- [ ] 06.03 Reconcile current Grove Flutter branch with #194 backend contract; avoid overwriting other Grove UI authors' work. **NEXT**.
- [ ] 06.04 Create a private project/conversation picker that loads only approved scope from live Grove broker; no old public ID. **OWNER/REVIEW**.
- [ ] 06.05 Feature-gated private Text view: POST /api/grove/chat and GET /api/grove/chat/history with same project/conversation, Grove JWT. **NEXT after 6.04**.
- [ ] 06.06 Show bounded saved history, persisted vs not persisted, explicit loading/HOLD/retry/error state, no fake completed work. **NEXT**.
- [ ] 06.07 Preserve retry request ID across mobile network retry; reject changed text and duplicated submit. **NEXT**.
- [ ] 06.08 Clear private in-memory text and account-scoped local selection on sign-out, grant revocation and app account switch. **NEXT**.
- [ ] 06.09 Voice remains OFF until a similarly scoped and testable private transport, consent and clock/continuity behavior exist. **HOLD**.
- [ ] 06.10 Verify the original approved Grove environment still passes responsive/sundial/room navigation regressions. **NEXT**.

## Phase 7 — End-to-end acceptance and privacy

- [x] 07.01 Source-level composite #193 CI green; source-level private transcript #194 CI green at previously recorded head. **VERIFIED-CI**.
- [ ] 07.02 Green exact-head backend tests/build, control-backend tests/build, Flutter tests/analyze and Android debug APK after ALL new changes. **NEXT per commit**.
- [ ] 07.03 Test separate owner/project/conversation, expired/revoked grant, malicious role/history, forged outcome, omitted cognitive retrieval. **NEXT**.
- [ ] 07.04 Disposable Grove DB integration test: write → new process → read → correction → no cross-owner leakage. **REVIEW**.
- [ ] 07.05 Disposable ARK objective test: permitted work receives receipt; disallowed work HOLDs; cancellation/return preserves checkpoint. **REVIEW**.
- [ ] 07.06 Test recovery after process shutdown, phone app relaunch and text/voice distinction without model knowledge fabrication. **NEXT**.
- [ ] 07.07 Test privacy: no model payload/secrets in logs, accidental public Firefly writes, retraining on private content or implicit grants. **REVIEW**.
- [ ] 07.08 Independently review authentication, service-role boundary, HMAC replay across instances, rate limiting, retention, deletion and cost. **REVIEW**.

## Phase 8 — Approved rollout (requires all earlier gates)

- [ ] 08.01 Confirm genuine separate Grove Vercel/API host and env; DO NOT reuse public Firefly project as Grove host. **OWNER/EXTERNAL**.
- [ ] 08.02 Confirm owner-approved real Grove account/bridge/grant and acceptable private retention. **OWNER**.
- [ ] 08.03 Apply approved Grove-only migration with backup/restore plan and least-privilege/RLS verification. **OWNER/REVIEW**.
- [ ] 08.04 Review and merge stacked PRs in dependency order, independently, with final exact-head checks; NEVER merge CI-only mirror #195. **REVIEW**.
- [ ] 08.05 Deploy approved private Grove preview with all live model/execution flags OFF; verify no public behavior change. **OWNER**.
- [ ] 08.06 Turn on selected private chat/transcript/read features progressively; verify audit and rollback, no costs unexpectedly incurred. **OWNER**.
- [ ] 08.07 Attach separately approved signed independent LM; verify one real conversation, NOT model training success by inference. **OWNER/EXTERNAL**.
- [ ] 08.08 Observe Danelle's final private-phone test: “List and go” → see truthful next action → leave → return → correct → resume → receipt. **OWNER**.
- [ ] 08.09 Only after 08.08 and authorization tests, enable bounded ARK real execution for approved tools/project. **OWNER/REVIEW**.
- [ ] 08.10 Record exact deployment versions, DB migration, credentials owner, incident/rollback instructions, remaining feature flags and actual proof. **NEXT after release**.

## Stop rules, to prevent loops

1. **No new architecture if a matching owner/module already exists.** Prefer a small integration edit and a failing-then-passing test.
2. Never call CI-only “live”; never call proposed SQL “applied”; never infer a running worker from objective status.
3. Verify current branch+CI once at the start, then ACT. Do not keep refreshing the same status in a loop.
4. Do not perform private owner provisioning, production migration, cost-bearing inference or release without explicit authorization.
5. A user message of “list and go” authorizes safe *in-session work*, not invisible background execution. This file makes the queue durable across threads; each next turn should check actual head, complete the highest unblocked NEXT, run CI and update this ledger.
6. If an issue depends on a different lane (LM Flutter ARK), create a precise handoff to that lane, not a competing implementation.

**Current user-visible truth:** source-level connection and simulated pause/return exist; private owner mapping/grants, private DB migration, real cognitive snapshot/retrieval, actual LM host and private phone chat are NOT verified live. “Connected and talking” is only complete after 08.08, and “authorized independent work” after 08.09.
