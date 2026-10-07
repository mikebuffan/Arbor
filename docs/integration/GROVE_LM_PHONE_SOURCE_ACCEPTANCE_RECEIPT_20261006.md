# Grove / LM / phone source acceptance receipt — 2026-10-06

## Exact source

- Current One Arbor candidate remained `integration/one-arbor-current-20261006` @ `3c599ffd655409d8f72116ec857b76dfa646bd50` when this lane was cut.
- Runtime application source remains unchanged from that base. The child adds readiness workflow/docs plus security hardening to **proposal-only** Grove grant SQL and a disposable acceptance fixture; no proposal was applied.
- The child is intentionally isolated so active research/Annabelle work is not modified.

## Exact lineage checks

Blob identity was compared, not inferred from filenames.

The following current-candidate files are byte-identical to their already-tested source lineage:

| File | Tested lineage | Blob SHA |
|---|---|---|
| `ops/grove/local-lm/verify-runtime-manifest.mjs` | local-LM prep #261 | `9d2aaad7eeaf8e7a185db1496215b7a1d0a95da7` |
| `ops/grove/local-lm/evaluate-local-runtime.mjs` | local-LM prep #261 | `8d41d5a449e29fd679140ee0bcb9e6d78419dd36` |
| `ops/grove/local-lm/smoke-local-receiver.mjs` | local-LM prep #261 | `6d407242a08d846b02a41edce2eb5cd94df3f2f5` |
| `ops/grove/local-lm/local-lm-prep.test.mjs` | local-LM prep #261 | `8c4860eef2813a64b2fbab69ad1b86bb825a29e8` |
| `apps/backend/lib/grove/privateConversationLoop.ts` | ARK/Grove spine #260 | `06ab846f513e209883836b824d99d11db08b9866` |
| `apps/frontend/lib/environment/grove_pending_turn_store.dart` | ARK/Grove spine #260 | `bb600d8a42273bae42d4c049602337c552906dd9` |
| `apps/frontend/test/grove_private_text_page_test.dart` | ARK/Grove spine #260 | `902d11d936163e7f064a7fed0ba62be2e999817d` |

## Existing exact CI receipts

### ARK/Grove spine #260 @ `96bfb7e4593e3a3e44f58522ca059fb87013387f`

GitHub Actions run `37515852100` completed successfully.

Backend:
- focused ARK spine tests: PASS;
- complete backend regression suite: PASS;
- production backend build: PASS;
- standalone TypeScript: PASS.

Phone:
- pinned Flutter install: PASS;
- locked dependency resolution: PASS;
- lockfile unchanged: PASS;
- analyzer: PASS;
- full Flutter regression suite: PASS;
- synthetic Grove APK build: PASS;
- APK existence check: PASS.

The logged backend suite includes successful Grove runtime-goal, runtime-turn capture, bounded correction, private ARK objective-run, restart/startup, personality, memory and agency tests.

### Local LM prep #261 @ `7fb702a76156184cd317edd34b42a69796ed1eb8`

GitHub Actions run `37538562940` completed successfully.

- read-only Windows hardware preflight: PASS;
- baseline Windows x64 runtime build: PASS;
- manifest / loopback signed-receiver Node contracts: PASS.

Because the four local-LM source blobs listed above are identical on the current One Arbor candidate, this receipt applies to those exact files as incorporated.

### No-AVX/SSE2 runtime #266 @ `e395cf7a90118a04919c68b83633f2c676450d85`

GitHub Actions run `37530367591` completed successfully.

- exact llama.cpp source fetched;
- x64 runtime configured with AVX/AVX2/AVX512 families disabled;
- runtime built;
- programs launched;
- provenance package uploaded;
- intended CPU floor recorded as `x86_64_sse2`;
- model included: false;
- Qwen model load verified: false.

Uploaded runtime artifact ZIP SHA-256 in that run:
`1131bbda88a2c5c284755ed65e6a1042bda315a36dbbddfa26a5f2b9eecc3f5b`.

That is a **runtime-binary receipt, not a model-inference receipt**.

### Current integrated candidate #268 @ `3c599ffd655409d8f72116ec857b76dfa646bd50`

GitHub Actions run `37545923434`.

Phone job: **PASS**
- analyzer: PASS;
- full Flutter suite: **193 tests passed**;
- synthetic Grove debug APK: built successfully.

The current exact head also ran and passed the Grove/identity tests needed by this lane before the unrelated research failures stopped the full backend job:

- `privateReadBroker.test.ts`: **61 passed**;
- `privateTranscriptStore.test.ts`: **25 passed**;
- `privateConversationLoop.test.ts`: **17 passed**;
- `privateLmHostTransport.test.ts`: **13 passed**;
- `privateCorrectionRoute.test.ts`: **12 passed**;
- `privateCorrectionWritePreparation.test.ts`: **10 passed**;
- `privateCorrectionConnection.test.ts`: **6 passed**;
- `privateRuntimeGoalRoute.test.ts`: **11 passed**;
- `privateRuntimeGoalWrite.test.ts`: **3 passed**;
- `privateRuntimeTurnCapture.test.ts`: **4 passed**;
- `privateArkObjectiveRun.test.ts`: **5 passed**;
- `privateArkObjectiveRunRoute.test.ts`: **7 passed**;
- `arkSpineContinuity.test.ts`: **4 passed**;
- `arkSpineStartup.test.ts`: **1 passed**;
- `privateChatRoute.test.ts`: **8 passed**;
- `privateConversationDiscovery.test.ts`: **11 passed**;
- `privateTranscriptRoute.test.ts`: **9 passed**;
- `privateHostIsolation.test.ts`: **5 passed**;
- `groveDeploymentConfig.test.ts`: **2 passed**;
- `privateReleaseComposite.test.ts`: **1 passed**;
- `arkLayerReadContext.test.ts`: **17 passed, 1 skipped**;
- `personalityProjection.test.ts`: **7 passed**.

Login/grant source coverage on that same head includes:

- private broker OFF before auth/database access;
- Grove JWT issuer/audience/role/expiry validation;
- Firefly token rejection in the Grove realm;
- active owner invitation required;
- revocable Grove -> Firefly bridge required;
- exact project grant required before Firefly access;
- Firefly project ownership required;
- exact conversation ownership/project binding required before model disclosure;
- missing/revoked/expired grants fail closed;
- private phone realm refuses the legacy Firefly/ARK auth realms;
- zero project grants never invent a project;
- multiple grants require explicit project selection;
- failed grant fetch denies access and offers retry;
- standalone private Grove does not expose unsupported legacy chat/voice.

Backend job overall:
- focused ARK spine tests: PASS;
- later complete regression suite failed in active **research-lane** tests:
  - `arkResearchHandoff.test.ts`;
  - `registerArkResearchControllerExecutor.test.ts`;
  - `researchReinsIteration.test.ts`.
- result before stop: **256 test files passed; 3 failed; 1561 tests passed; 6 failed; 2 skipped**.
- the failing errors were cancellation-expectation drift and `invalid_research_session_duration` in research controller tests.

Those failures are recorded rather than “fixed” from this Grove/LM/phone lane, because modifying active research behavior here would violate lane ownership.

## Historical real-model reconciliation

Recovered private review evidence proves that real Qwen + Arbor adapter inference has occurred previously; this is not a synthetic-only project.

The reviewed v0.3.3 run dated 2026-09-22 recorded:

- results SHA-256 `0cff514500f2d4ea5c57628a080d99a082a3102518ec8bc15b4bb01e0dc03713`;
- preserved v0.3 adapter SHA-256 `5447bc273c11374c73194428825babe22a008b0827e9ef002127a461023402aa`;
- 18 cases x 2 seeds = 36 paired cases;
- **100 real model calls** across foundation and adapted variants.

That run is **evidence of real inference, not semantic acceptance**. The human review found material failures in identity/correction, unavailable-tool honesty, payment capability, model provenance, private-data boundaries, continuity/project switching and long-history behavior. In particular, adapted outputs falsely claimed GitHub/Supabase checks and one promised card-funded GPU use.

The historical run also preserved some successes: no fabricated deployment receipt, correct ARK/Layer/LM distinction, and no unsupported clinical-approval claim.

A prepared v0.3.4 focused real-model notebook was recovered, but its stored cells are unexecuted and no matching result artifact was recovered. No v0.3.4 semantic pass is claimed.

Therefore the current release gate is **not "prove real inference for the first time"**. It is: pin the exact selected foundation/tokenizer/runtime, rerun the known failing semantic cases plus paraphrases, save actual outputs, and obtain human review before any inference activation.

## Proposal-only grant hardening

This child hardens the three not-yet-applied Grove grant proposals for runtime turn capture, runtime-goal write and bounded ARK-objective execution:

- FORCE RLS;
- explicit revoke from `public`, `anon` and `authenticated`;
- service-role-only CRUD;
- foreign key to the exact Grove owner/project grant with cascade cleanup;
- no client policy;
- no seeded grant.

A disposable PostgreSQL acceptance fixture now checks those properties plus wrong-purpose rejection, expired-at-creation rejection, foreign-project rejection, valid-row insertion, revocation state and cascade cleanup. The fixture is prepared but not falsely reported as executed.

## Portable local-LM contract reproduction

The portable local-LM contract checks were also reproduced in an isolated local scratch run during this review:

- pinned manifest/receiver contract guard;
- loopback-only receiver origin;
- HMAC over exact synthetic body;
- rejection of fake execution receipts;
- CPU instruction-set fail-closed behavior.

Result: **5/5 passed**.

This scratch reproduction is supporting evidence only; the authoritative source receipt remains the GitHub Actions run above.

## What is now source-proven

- bounded Grove runtime goal and turn continuity;
- separately gated correction saving, default-off;
- one-objective Grove -> ARK execution boundary;
- durable terminal replay without stale objective resurrection;
- Text retry identity persistence/recovery;
- stale history cannot silently clear an uncertain send;
- scoped login/invitation/bridge/project/conversation denial behavior in synthetic/test environments;
- current phone Flutter source and synthetic Android APK build;
- local LM manifest/context/CPU compatibility checks;
- loopback signed receiver contract;
- no trusted model-generated execution receipts;
- no-AVX/SSE2 runtime binary build path.

## What cannot truthfully be upgraded yet

- exact foundation/tokenizer revision and real tokenizer execution;
- real Qwen + Arbor adapter generation on the **exact current selected runtime** (historical real inference is proven, exact-current acceptance is not);
- real RAM/latency/context-limit measurements;
- clean exact-runtime semantic rerun for identity/personality/correction;
- clean exact-runtime rerun of the historically failing account/payment/tool/private-data cases;
- exactly-once **generation** across receiver crash/lease expiry;
- live owner grants/migrations;
- live Grove host -> real LM -> phone acceptance;
- physical device process-kill/network recovery;
- production release.

These remain genuine private-artifact, target-runtime, owner, or protected/live gates.
