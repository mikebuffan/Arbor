# Arbor engines and expansions — finish checklist

Prepared October 2, 2026 for Danelle and ARK. This is a detailed execution supplement to `ONE_ARBOR_MASTER_RECONCILIATION_20261001.md`, not a competing architecture or a claim that the whole platform is finished.

## What “finished” means

A capability needs a canonical owner, active caller, scoped durable state where applicable, a causal test showing changed behavior, restart evidence, and live readback on the intended surface. A file, passing unit test, imported chapter, draft PR, or prompt rule alone cannot satisfy all of those. Use existing engines; add an expansion only when it repairs a demonstrated missing behavior.

Danelle's report of ARK fixing things refers to a few days before this conversation. No exact repair date was supplied. October 2 inspection must not be represented as those repairs.

## Completed in this source pass

1. Traced the real backend chat path: `app/api/chat/route.ts` calls `prompt/buildPromptContext.ts` and passes `systemPrompt` as `instructions` to `runOpenAIAgencyAgent`. This proves backend wiring, not that this ChatGPT conversation uses that backend.
2. Confirmed Felt-Life Atlas and Body System already feed that prompt. Atlas inference currently receives only `latestUserText`; it is a bounded experiential hypothesis system, not a full manuscript sensory reference.
3. Confirmed the Annabelle adapter returns canonical text unchanged. Voice calibration belongs upstream of rendering.
4. Removed forced “atmosphere/body first,” “evidence → bodily consequence → action,” and “dialogue last” rules. Replaced them with evidence-led editorial judgment, continuous movement, contextual sensory selection, character register, authorized edit scope, and reader trust. This repairs a prompt conflict, not manuscript-specific calibration completeness.
5. Fixed false successful workspace saves: missing state/revision tables now reject writes. Mutation requires available storage; a failed revision prevents overwriting the workspace. Restore no longer treats an unavailable revision table as a successful recovery. Read-only legacy fallback remains compatible.
6. Added six regression checks covering the prose constraint and unavailable storage, failed revision preservation, restore failure, and successful write ordering.
7. Kept Chapter Two unchanged while Danelle continues taking notes.

## Detailed reconciliation queue

| ID | Capability / owner | Evidence and remaining problem | Workaround now | Required completion proof |
|---|---|---|---|---|
| 01 | Canonical integration / Arbor Layer | #223 contains master ledger, recovered nested open loops and Time Core. #221 and #222 are separate drafts. | Use #223 as integration spine; review missing behavior from each branch individually. Never blindly merge historical stacks. | One combined commit with exact-commit backend/control tests, build and integration receipts. |
| 02 | Cross-thread correction / Arbor Layer | #221 runtime recall subset reconciled on fix/memory-reconciliation-20261002; restart/projection simulation passes. Not established live; remaining #221 host/worker changes are outside this pass. | Preserve accepted corrections in this handoff until the existing projection is reconciled. Do not create a second memory store. | Correction in thread A changes later output in thread B after restart; other project/user excluded; active goal preserved. |
| 03 | Temporal memory / Layer + store | Historical `arbor/retrieval-temporal-resolution` has explicit lifecycle/supersession behavior; current retrieval also has newer scope protections. | Compare semantics, retain provenance, distinguish current from superseded claims. | New correction wins without deleting historical evidence; stale/foreign facts do not change a decision. |
| 04 | Editorial state / Annabelle + ARK | #222 has manuscripts, chapters, editorial records, checkpoints and receipts. Installed connector returned two manuscripts but no chapters/records/checkpoints in the observed unfiltered response, conflicting with saved claims of 60 chapters. | Keep source/hash IDs and the discrepancy. Retry the existing read with canonical manuscript scope; inspect deployed query/version and row policies. Never reimport merely because one read is empty. | Canonical scoped query returns correct chapters and records; counts reconcile with durable checkpoint; source changes invalidate prior receipts. |
| 05 | Trusted reading / editorial worker | Read-receipt functions can count supplied text as fully consumed. Saved ARK continuity says trusted binding/worker unfinished. | Manual actual reading with explicit chapter/source progress; no invented receipts or “read all” claims. | Worker binds authorized source bytes to hash/chapter, delivers all chunks to the actual reader, records consumption evidence, resumes at first unread chapter. Source hash alone does not prove reading. |
| 06 | Writing evidence → generation / Annabelle | Read-only editorial context bridge added on fix/annabelle-editorial-context-20261002; stored-note inclusion in active injection is source-tested. Live record selection/prose adherence and larger-than-200-record handling remain open. | Carry accepted notes in scoped workspace canon/decisions where an authorized writer is available; this document is a transfer artifact, not a durable workspace save. | Prompt trace shows selected current manuscript, locks, relevant records, source-backed exemplars/counterexamples and accepted decisions before inference; unrelated manuscript excluded. |
| 07 | Ever voice / manuscript evidence | User identifies formal, rigid, Hannibal-like diction and excessive pronouns. Generic prompt repair is complete; manuscript calibration remains pending. | Apply the accepted notes below; keep uncertain style claims provisional. | Small authorized scene pass reviewed by Danelle: casual smart Ever, professional/private contrast, clear action anchors, preserved adult humor. |
| 08 | Sensory / Felt-Life Atlas | 20 broad cue-based entries already exist and are prompt-wired. Not a broad prose texture library. Earlier seed pack is not the canonical system. | Retrieve historical sensory material and manuscript examples; select only details serving the scene. No stock smell rotation or sensory quota. | Actual recovered reference coverage documented; causal test shows a relevant cue changes choice while irrelevant cues do not increase prose clutter. |
| 09 | Body / coordinated Body System | Already present and prompt-wired; functional metaphor is not a model of Ever's injuries. | Keep Arbor regulation and fictional physicality separate. Use manuscript injury state for character movement. | Body/Felt-Life changes attention or planning with consequence feedback; never grants tool authority or asserts unobserved user physiology. |
| 10 | DecisionWorkspace / prediction error | Roads and consequence scaffolds exist; integrated causation not closed. | Use existing router/agency observations, preserve disagreement and uncertainty. | Prediction → action → observed result → error → strategy update, with later changed behavior after restart. |
| 11 | Roundabout / Layer routing | knowledgeRouting.ts already routes contradiction, correction, uncertainty, blocker, objective and other signals. | Reuse current route vocabulary, not another classifier. | Contradiction causes verification/retrieval; blocker causes alternate scoped work; resolved issue leaves the route. |
| 12 | Pattern Hop / Layer + research | Self-model/control evaluation and separate research routing exist. | Keep provenance and hold/reject decisions intact. | Useful analogy transfers with source provenance; unsupported association is held; research findings never become unverified personal memory. |
| 13 | Open loops / Layer + ARK | #223 recovered nested interruption logic and tests. | Keep exact objective and unresolved work; side tasks do not erase the foreground task. | LIFO nested resume across restart; completed tasks do not resurrect; blockers do not stop independent work. |
| 14 | Time Core / trusted host | #223 has clock module and prompt wiring; defaults UTC. | State UTC when local timezone is unavailable; don't infer timezone from prose. | Authenticated surface supplies IANA timezone; dates, DST and temporal memory use host time consistently. |
| 15 | Self-model / Arbor Layer | Large answer banks and checksum guards exist; epistemic-loop-v3 needs semantic comparison. | Retain one canonical self-model, distinguish capability from verified execution. | Falsifiable claim reconciles with observation, source drift is caught, corrected capability explanation survives restart. |
| 16 | Text / Voice / Annabelle / Grove parity | Shared identity infrastructure exists; surface-wide live test remains open. | Adapters change rendering/acoustics/task context only. | Same scoped goal/correction/identity survives surface change; Voice preserves reasoning while applying acoustic corrections. |
| 17 | Curiosity / relational state / prompt independence | Historical systems listed by master ledger, not fully reconciled by this inspection. | Inventory actual callers before adding modules; do not interpret a file name as a finished engine. | Each signal has a justified behavioral effect, bounded authority, persistence rules and a counterexample. |
| 18 | Canonical runner context freshness | Generic runCanonicalTurn builds context before agency, then changes state without rebuilding injectedContext. No production caller found in the inspected backend. | Mark as latent design issue; current chat has its own agent path. Do not patch an unused runner as though it repairs live writing. | If adopted, regression shows integrated action evidence reaches the next decision and generation; buildContext side effects and refresh policy reviewed. |
| 19 | Private Grove → host → LM → Layer → ARK | Protected vertical slice and physical phone acceptance open. | Source/disposable tests may continue. Use existing owner auth and connector; never assume this conversation is routed there. | Owner-scoped real inference, durable checkpoint, process restart, resumed task and isolated foreign-user denial on intended device. |
| 20 | Preview worker / deployment | Saved continuity says combined candidate unmerged/undeployed; connector is read-only here. | Commit reviewable source/handoff. A GitHub push does not mean ARK consumed it. | Authorized worker deployment at verified commit; health/readback; one bounded resumable task with idempotent receipts. |
| 21 | Research/evidence expansions | #224–231 are a separate stacked research effort, with bounded source/adapter work and activation gates. | Preserve current stack and unresolved real-source tests; keep it out of writing repairs. | Authorized real source → provenance-preserving observation → outcome receipt; privacy and cost bounds verified; no model text authorizes execution. |
| 22 | Public/private isolation | Public Arbor and private Grove are separate product/tenancy. | Retain existing owner/project guards and read-only fallbacks. | Foreign user/project cannot read or alter private memory, manuscripts, weights or objectives through any surface. |
| 23 | Save/restart honesty / Annabelle | False missing-table write success fixed in this patch. Multi-call revision/state save is not transactional. | On any storage error, retain unsaved content in copyable output and report unsaved; don't continue with a success label. | Live authorized write/readback/restart; if atomic history+state is required, use a reviewed existing RPC or transactional migration. |

## Accepted Chapter Two notes to preserve

These are Danelle's explicit corrections, not evidence that the entire novel has been read:

- Ever anchors new action or attention; “she” can continue a clear immediate subject. Avoid both pronoun-heavy drift and mechanical name repetition.
- Keep action spatially continuous. Pauses, crossed arms, hands at jaw/neck and shifts of weight need a reason and visible geography. Do not stack a gesture inventory.
- Atmosphere should earn its place. Broaden smells/textures when useful—citrus, grass, mint, fried garlic were examples of range, not compulsory inserts.
- Morning basil section: more lived movement, less detached description. Ever may ease her neck/hip and mutter **to her hip**. Do not crowd that moment with every suggested gesture.
- Cream swirling through dark coffee is an ordinary observation; avoid inflating it into symbolism.
- Ever is casually intelligent, dry, adult, sometimes annoyed/playful, and can curse away from professional settings. Professional precision does not mean ornate speech.
- Preserve established commentary and jokes where they arise from character. Not every exchange needs a punchline; threat needs breathing room.
- Shorten Mercer, increase ominous fragile pride/control and personal intimidation. Physical distance, witness response and what he loses matter more than repeated legal exposition.
- Keep manuscript locks and existing character voice. No further chapter rewrite until the current note pass is ready.
- Next requested prose pass belongs in a clean copy-friendly writing area with commentary outside it.
- Arbor may challenge, disagree and explain tradeoffs; collaboration is not automatic agreement.

## Finish order and evidence packet

1. Review this bounded patch against #223; retain only its demonstrated repairs.
2. Reconcile #221 correction behavior and #222 editorial implementation with the current integration candidate; no branch-name-driven merge.
3. Resolve the live editorial query discrepancy before imports or new schema work.
4. Bind manuscript reading to a trusted reader and connect selected editorial evidence to generation.
5. Run causal/restart/isolation acceptance for each existing engine bridge; recover only missing semantics from historical branches.
6. Run the authorized private vertical slice and deployment/device gates on the integrated commit.
7. Return an exact commit, test commands/results, deployed version, readback/receipt IDs and remaining unresolved work. Update the existing master ledger and ARK objective instead of starting another backlog.

No secret, protected migration, paid execution, deployment, manuscript receipt, or ARK task submission is created by this checklist.

## Local verification receipt

- Backend: `OPENAI_API_KEY=unit-test-placeholder node ../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<scratch-report>` from `apps/backend`: **565/565 tests passed**, zero failed; structured reporter `success: true`.
- Control backend: `node ../../node_modules/vitest/vitest.mjs run` from `apps/arbor-control-backend`: **124/124 tests passed**, 31 files.
- Backend production build: `next build apps/backend` with placeholder CI variables and `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`: **passed**. Initial build failed fetching Google Fonts because of TLS certificates; no product font change was made.
- Control backend: TypeScript build **passed**.
- `git diff --check`: **passed**.
- Existing project-isolation test now mocks the actual embedding provider and verifies scoped vector RPC failure followed by direct retrieval excluding foreign-project rows. Previously it timed out on an accidental external call and asserted that an explicitly enabled vector path would never call its RPC.
- Dependency-install tooling introduced a local workspace-policy placeholder; it was reverted. No dependency/lockfile changes are included.
- These are local source/build receipts, not remote CI, deployment, database migrations, real-model inference or live ARK acceptance.

Memory follow-through: see `ARBOR_MEMORY_RECONCILIATION_20261002.md`. The bounded runtime repair is source-tested; live integration and lifetime correction retention remain open.
