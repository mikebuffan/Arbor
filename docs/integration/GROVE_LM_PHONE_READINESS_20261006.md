# Grove / independent LM / phone readiness — 2026-10-06

**Lane:** source/test reconciliation only.  
**Base inspected:** `integration/one-arbor-current-20261006` @ `3c599ffd655409d8f72116ec857b76dfa646bd50`.  
**Child:** `integration/grove-lm-phone-readiness-20261006`.

No main merge, production deployment, hosted grant/migration, model activation, paid inference, or live-state mutation is authorized by this lane.

## Completion vocabulary

- **SOURCE_PRESENT** — implementation exists on the inspected exact source.
- **SOURCE_TESTED** — relevant source tests pass on the exact child head.
- **BUILD_PROVEN** — exact child build succeeds.
- **LIVE_PROVEN** — a real hosted/runtime/device boundary has been exercised.
- **USER_ACCEPTED** — owner has accepted behavior/device output.
- **GATED** — protected/live prerequisite remains.

## Grove reconciliation

### SOURCE_PRESENT on the current One Arbor source

The current candidate already contains the newest bounded Grove spine; do not build a second state engine.

- private conversation authorization binds Grove owner -> Firefly owner -> exact project -> exact conversation;
- ARK/Layer read context is exact-conversation scoped and rejects project-latest/fallback continuity;
- private model disclosure is preceded by a fresh authorization recheck;
- runtime-turn capture has a separate exact-conversation grant and does not become a transcript engine;
- runtime-goal writes mutate only the exact current runtime state and refuse cross-conversation copying;
- correction saving has a separate, expiring, revocable `global_behavior_calibration` grant;
- correction saving remains default-off and requires explicit durable user authorization;
- correction recovery uses the existing durable correction ledger instead of a duplicate store;
- one-objective Grove -> ARK execution requires all existing ARK gates plus a separate Grove gate;
- terminal ARK task receipts replay without re-executing;
- running work is not raced;
- startup hydration reuses the existing runtime state and does not resurrect completed objectives;
- model text remains explicitly unverified and never becomes a work receipt merely because it says an action occurred.

### Exact tests selected for this child

- `privateConversationLoop.test.ts`
- `privateTranscriptStore.test.ts`
- `privateLmHostTransport.test.ts`
- `privateCorrectionRoute.test.ts`
- `privateCorrectionConnection.test.ts`
- `privateRuntimeGoalWrite.test.ts`
- `privateRuntimeGoalRoute.test.ts`
- `privateRuntimeTurnCapture.test.ts`
- `privateArkObjectiveRun.test.ts`
- `privateArkObjectiveRunRoute.test.ts`
- `arkSpineContinuity.test.ts`
- `arkSpineStartup.test.ts`
- `arkLayerReadContext.test.ts`
- `personalityProjection.test.ts`

These tests are intentionally isolated from active research/Annabelle siblings so a research-lane regression cannot be mistaken for a Grove/LM/phone regression.

## Text -> Grove -> Text and restart/replay

Current phone + host source implements:

1. device creates one retry UUID before an uncertain send;
2. opted-in local draft persistence saves that UUID and exact original text before network disclosure;
3. restarted/remounted Text never auto-sends a restored draft;
4. a retry must reuse the same UUID and unchanged text;
5. completed server-side turn readback clears the frozen retry only after the exact user/reply pair is recovered;
6. stale/truncated history does not clear the retry;
7. changed owner/project/conversation/API/auth realm cannot recover another scope's draft;
8. failed device write prevents the model request;
9. completed transcript replay returns the canonical saved reply without another model call;
10. terminal ARK work replays its receipt and is not resurrected as a new active action.

This proves restart/replay identity and stale-action suppression at the source boundary. Physical process-kill behavior remains a device acceptance item.

## Independent LM contract

### Locked source assumptions

Current manifest/transport assumptions are:

- foundation family: `Qwen/Qwen3-0.6B`;
- saved Arbor v0.3 adapter SHA-256: `5447bc273c11374c73194428825babe22a008b0827e9ef002127a461023402aa`;
- receiver runtime card: `0.3.3`;
- broker receiver revision: `2026-10-06.1`;
- Arbor behavior contract: `2026-10-05.1`;
- max new tokens: `170`;
- reviewed input floor: `4020` tokens;
- proposed input ceiling: `8192` tokens;
- signed host request raw body ceiling: 96 KiB;
- private history ceiling: 13 alternating messages / 12,000 characters;
- receiver origin: HTTPS or loopback HTTP only;
- redirects: rejected;
- model request timeout: 180 seconds;
- model output cannot claim external execution through trusted metadata: `external_actions_executed=false`, `live_execution_verified=false`, empty `work_receipts`, and `active_objective_handoff=not_resolved`.

The exact foundation and tokenizer revisions are deliberately **not invented**. The public manifest fails closed until real private artifact receipts supply exact 40-hex revisions.

### Hardware/runtime assumptions

The existing target-machine preflight recorded:

- Windows 11 x64;
- Intel Celeron N4120, 4 cores / 4 logical processors;
- about 7.82 GiB RAM;
- about 16.04 GiB free system storage at the recorded check;
- SSE2 + SSE4.2 available;
- AVX / AVX2 / AVX512 unavailable.

The prepared runtime therefore uses a baseline x64/SSE2 llama.cpp lane with no AVX-family requirement. The existing CI receipt proves the no-AVX binary build path only; it does not prove model load, tokenization, speed, or real inference on the laptop.

### Tokenizer/context acceptance

Before any context ceiling is activated:

1. exact foundation revision must be pinned;
2. exact tokenizer revision must be pinned;
3. exact model/tokenizer pair must load locally;
4. the reviewed full fixture must be tokenized with the real tokenizer;
5. its measured count must fit the approved input ceiling;
6. prompt + generation memory usage must fit the target host without unsafe swapping/resource pressure;
7. no identity/correction context may be silently truncated merely to make the prompt fit.

Until that happens, `8192` is a proposed ceiling, not a live-proven capacity.

## Exactly-once distinction

### Already proven in source

The Grove transcript path provides durable logical idempotency:

- same completed request UUID -> same saved reply;
- concurrent identical requests do not create two transcript pairs;
- changed text under the same UUID conflicts;
- an active claim holds a competing request;
- an expired/reclaimed lease fences an old worker from committing;
- restart replay does not invoke the model when canonical completion already exists.

### Still GATED

**Exactly-once model generation is not yet proven across inference crash / lease expiry.**

A lease can expire after a model invocation starts but before durable completion is committed. A replacement worker may then begin another generation. The fenced storage layer prevents duplicate durable effects, but it cannot truthfully claim the model was invoked only once.

Do not relabel “exactly-once saved effect” as “exactly-once generation.”

The production-quality proof requires the selected receiver/runtime to persistently claim a generation idempotency key before generation, recover the same result after restart, and fail closed if that durable generation claim store is unavailable. This must be tested with the real selected runtime before inference activation.

## Arbor identity/personality and capability boundaries

The current LM input path places the canonical Arbor identity upstream of task overlays and provider output. Current tests verify that Text authority returns to Arbor even when saved runtime state was previously Annabelle, and that durable correction hydration is fail-closed.

The host transport independently prevents model prose from being treated as trusted capabilities:

- the model does not receive authorization to execute tools;
- trusted response metadata must say no external action occurred;
- fake work receipts are rejected;
- fake live-execution claims are rejected;
- fake active-objective claims are rejected;
- scope/owner/project/conversation claims are host-derived, not model-derived.

**Semantic hallucination acceptance remains real-model GATED.** A fake/synthetic receiver cannot prove the actual model will never say “I charged your account,” “I sent payment,” or “I used a tool.” Real-model acceptance must include adversarial prompts for account access, billing/payment, unavailable tools, work-completion claims, and permission escalation. Expected behavior is explicit limitation/abstention, with zero trusted execution receipt.

## Grove -> LM -> Arbor -> ARK interface boundary

The intended split is preserved:

- Grove authenticates owner/project/conversation and supplies the user turn;
- Arbor Layer builds canonical identity, corrections, time and exact continuity;
- the signed LM receiver produces **unverified text only**;
- Grove may persist/read back the text under the transcript gate;
- runtime goal/turn capture uses separately granted existing runtime state;
- ARK execution is a separate exact-objective gate and never follows automatically from LM prose;
- no LM response may mint its own ARK task, capability, receipt, grant or completion state.

Inference remains default-off.

## Phone source acceptance

The child CI deliberately reruns the full exact-head phone lane:

- pinned Flutter 3.47.6 / exact Flutter commit;
- locked dependencies;
- unchanged lockfile;
- analyzer;
- full Flutter regression suite;
- synthetic Grove debug APK build;
- APK existence check.

Login/owner-grant behavior that can be tested synthetically is already covered by the scoped Grove authorization/phone tests. A real owner invitation/bridge/grant is intentionally not created here.

## Smallest physical-device acceptance sequence

After an exact source SHA is accepted, an intentionally signed owner build exists, and hosted grants are separately approved:

1. **Install + sign in once.** Install the intended Grove package, sign in as the owner, and select the already-approved project/conversation.
2. **One continuity turn.** Send one fixed harmless Text message; verify the saved user/reply pair appears. Force-close Grove, reopen it, and verify the same conversation, current goal/corrections, and no duplicate send.
3. **One bounded ARK action.** Trigger one pre-approved harmless objective; interrupt/reopen once; verify the same objective resumes or replays its terminal receipt, and a duplicate tap does not duplicate the action.
4. **One failure check.** Briefly remove network during an intentionally harmless pending turn, restore it, and verify the original retry identity recovers without inventing a second logical turn.

Private LM behavior acceptance is separate and should be added only after real-model acceptance. Research scheduler, autonomous execution, and inference remain OFF by default.

## Genuine remaining gates

### Can be finished only with private model/runtime artifacts or target machine

- exact foundation revision/hash;
- exact tokenizer revision/hash;
- real tokenizer count of the reviewed context fixture;
- real foundation load;
- exact adapter conversion/load against that foundation;
- measured RAM/latency/generation limits;
- real model identity/personality semantic evaluation;
- adversarial account/payment/tool-capability hallucination evaluation;
- persistent exactly-once generation proof;
- no-cloud-fallback / no unintended egress proof against the selected real runtime;
- runtime cancel/restart/orphan-process proof.

### Protected/live owner gates

- hosted Grove grant/migration application;
- real owner invitation/bridge/project grant;
- private model/inference activation;
- signed package installation on the physical phone;
- physical-device/user acceptance;
- production deployment or main merge.

Everything else in this lane should be proven by the isolated child CI before asking for an owner step.
