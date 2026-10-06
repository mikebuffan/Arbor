# Grove + independent LM connection — source handoff, October 5, 2026

**Result:** bounded source repairs and offline connection proof. The complete One Arbor private vertical slice remains **PARTIAL / NOT LIVE VERIFIED**. No production branch, deployment settings, hosted database, owner grant, execution activation, paid inference, model weights or personal archive was changed. Pattern Hop and memory/archive reconciliation remain with Danelle and the original thread.

## Exact source inventory and reconciliation boundary

| Source | Exact ID | What was inspected |
|---|---|---|
| Owner-reported deployed sandbox | `fea53e279c66ea61e80de9891b3e20db97048829` | Git source only; deployment identity was not independently queried |
| Latest published repair | `373fa57995985eb12613ae0f29678c98e41de39a` | All three requested integration documents; current personality, prompt, correction and chat paths |
| Grove mobile/home composite, repair parent | `5b3724bb79afa1ad51fcec56f4ae8b51f8ab5315` | Existing complete Grove UI/private backend source; isolated worktree |
| Backend draft #194 | `54a836a4012dffb8cce24183f3b9f7c554e06a85` | Private conversation/history authorizations; draft, unmerged |
| Text client draft #196 | `22aad3ede2005318805147bb5efe090a6c7cb8e7` | Scoped private Text and stable in-view retry IDs; draft, unmerged |
| Signed transport draft #166 | `da071d7f72ea7c353cf326355678b8ad1b10029b` | Preserved receiver transport lineage |
| Conversation scope draft #179 | `38b9fd401e367df8c7cef240f4e07bf264e04d1a` | Grove-to-Firefly principal mapping and conversation ownership |
| Layer scope draft #160 | `fc58351e9ae8416c3d28d3c398d4126387310bf0` | Attachment must belong to requested conversation |
| Preserved receiver r2 | archive SHA-256 `dac8851bfb9e85673668943d2282cbf284bbad67985c382b36d534d8667a5929` | `Arbor_LM_v035_Broker_Receiver_r2_2026-09-22.zip`; 61 manifest digests match |
| Expected adapter | SHA-256 `5447bc273c11374c73194428825babe22a008b0827e9ef002127a461023402aa` | Expected identifier from source/receipt only; weights not imported or loaded |

Both supplied sandbox commits lack `lib/grove`, `/api/grove` and private Grove screen implementations. Existing Grove code is on its own draft composite. **Do not merge this older composite wholesale into the newer sandbox candidate:** that would risk replacing completed personality/correction/editorial/ARK repairs. Review this bounded child, then reconcile existing Grove-owned files and middleware against the latest One Arbor source. No existing draft was edited, merged, closed or superseded by this pass.

Requested documents read at `373fa579`: `ONE_ARBOR_MASTER_RECONCILIATION_20261001.md`, `ARBOR_ENGINE_FINISH_CHECKLIST_20261002.md`, `ARK_CHAT_TASK_BRIDGE_SOURCE_ACCEPTANCE_20261005.md`.

## Actual callers, in execution order

1. **App entry/auth:** `frontend/lib/main.dart`, `GROVE_STANDALONE` → pinned `GrovePrivateConfig` → Grove Supabase → `GrovePrivateAuthGate` → `GrovePrivateProjectGate`. Private mode refuses legacy Firefly provider fallback.
2. **Screen:** house Arbor hotspot → environment conversation destination → `GroveTalkPage`. Private Text mounts only with compile-time `GROVE_PRIVATE_TALK_PREVIEW=true` and complete private config. Private Voice never mounts the public Voice page.
3. **Client:** `GrovePrivateTextHost/Panel` → `GrovePrivateConversationClient`. GET discovers existing conversations (20-row bounded window); GET history loads six complete pairs; POST sends project/conversation/message/request UUID and current offset. The client cannot provide owner, roles, history, clock instant or model context.
4. **Private host route:** `/api/grove/chat` → strict bounded JSON → `prepareVerifiedPrivateGroveTurn` → `authorizePrivateGroveConversation`. Broker verifies Grove token with `getUser`, issuer/audience/expiry/sub, active owner invitation, revocable Grove→Firefly account mapping, active explicit project grant, Firefly project owner and exact conversation owner/project. Privileged reads occur after these proofs.
5. **Layer/ARK BEFORE inference:** `readArkLayerContext` → ownership checks → `readArkProjectSnapshot` and requested `loadRuntimeState` → `projectRuntimeStartup` → `buildArborBehaviorProjection`. ARK supplies bounded counts, not a selected durable active objective or verified work receipt. Private host rejects project-latest/fallback continuity.
6. **Optional cognitive preflight:** `readVerifiedCognitiveHost` / `previewFireflyCognitiveRoundabout` can HOLD. No production retrieval provider is supplied by the route; enabling that flag fails closed. Cognitive learning/body preview is not injected into the strict receiver schema.
7. **Retry/history:** `respondToVerifiedPrivateGroveTurn` → completed-request replay or database-issued pending lease → scoped complete-pair history → fresh authorization → `sendPrivateGroveLmTurnFromVerifiedHost`.
8. **Transport/LM:** exact raw UTF-8 body, timestamp, nonce and HMAC → `/v1/grove/chat-with-host-context` in Python → signature/replay/body/schema/freshness checks → `accept_broker_context` → `GROVE_SYSTEM_CARD + accepted.system_context` → `backend.generate`. `QwenArborBackend` lazily loads Qwen3-0.6B plus saved LoRA, has a 2,400-token input limit, and serializes generation. This pass substitutes a fake model at that exact boundary.
9. **Return/save:** receiver returns unverified text and matching source/fingerprint metadata; TS validates it → reauthorize → Grove-only fenced complete-turn RPC → scoped readback → reauthorize → JSON reply. Phone reopens history and verifies the exact request/text/reply before clearing its draft.
10. **Checkpoint gap:** the private path performs **no ARK objective selection, task submission, checkpoint write, runtime correction update or objective update**. A saved Grove conversation is not an ARK task checkpoint. Current sandbox MCP submission/result tools and worker authorization are separate paths.

## Source repairs made in this child

- Reused current One Arbor `timeCore.ts` and its tests. Phone offset travels through strict route and verified Layer read into the existing behavior prompt. Host owns the instant. A window-time preview cannot change inference time. Invalid offsets and client clock fields reject.
- Existing canonical identity-anchor renderer now enters standalone Layer behavior context before the mode projection. This repairs omission of the anchor; it does **not** claim that the newer full personality projection is integrated.
- Explicit text/voice Layer mode now projects Arbor authority instead of inheriting a stale saved Annabelle subsystem. Annabelle remains selectable explicitly.
- Signed LM fetch uses `redirect: "error"`, preventing private body/API/HMAC headers from following redirects.
- Fresh owner/grant/conversation authorization occurs after history loading and immediately before model disclosure; post-inference/pre-save/post-save checks remain.
- Transcript-enabled requests require a caller-supplied stable UUID before authorization/provider reads. Missing IDs no longer silently mint a new retry identity.
- Reused latest source `lib/chat/routeSupport.ts` and removed unsupported helper exports from the older composite's Next route. The initial build demonstrated the error; the repaired build passes.
- Reused current offline test network guard. Updated revocation tests to revoke at the actual fake-model boundary rather than fragile authorization call counts.
- Both Vercel config scopes explicitly skip `arbor/grove-lm-source-repair-20261005`. Tests execute the ignored-build command: this child skips for every project; the existing approved mobile branch policy is preserved. No hosted Vercel setting was changed.

## Identity, correction, objectives and relevant memory coverage

| Input | Observed result | Remaining connection |
|---|---|---|
| Canonical identity lineage | Actual TS envelope reaches Python fake generation with identity anchor | New personality/calibration modules on latest candidate are absent in older Grove; align source and receiver together |
| Existing requested-thread correction | Included in Layer projection and fake generation | Grove user corrections only enter transcript/history; private turn never writes canonical corrections |
| Saved current goal / unresolved work | Included from requested runtime state; cross-runtime assertion passes | No authoritative ARK active-objective handoff; cannot update task/checkpoint from private model text |
| Relevant durable/general memory | Layer has runtime continuity only | No `getMemoryContext`, durable correction recall or scoped archive reader in this private caller. Coordinate with original thread; do not create another memory store |
| Task overlays | Canonical anchor precedes mode; stale Annabelle authority repaired | Kitchen does not activate Annabelle; full latest personality/correction precedence needs integrated proof |
| Time | Server instant + validated per-turn device offset included | IANA timezone identity and future DST scheduling are not propagated; offset alone is insufficient for future local schedules |

Receiver r2 pins behavior contract **`2026-09-21.1`**. Latest candidate emits **`2026-10-05.1`**. Transport and receiver intentionally reject mismatch. **Do not spoof the old version, broaden the allowlist blindly or call the newer source live-integrated.** Keep real inference off until both exact sources and limits are reviewed. Receiver allows 12,000 behavior characters / 80 guard rules / 32 KiB signed body, but real model caps 2,400 input tokens. A schema-accepted prompt can still fail actual tokenizer limits. Never silently drop identity/corrections to fit.

## Save, interruption, reconnect and restart findings

- Completed Grove turn replay and save/readback have existing source coverage. Pending claim is fenced; active identical requests HOLD, changed text conflicts. Lease is 240 seconds; model fetch timeout is 180 seconds. Expiry can permit another inference; durable complete-pair storage is not exactly-once GPU execution.
- History contains six completed pairs only. Unconfirmed/oversized history is not the full archive. A saved turn falling outside the window may fail phone confirmation; preserve its retry identity instead of inventing a new turn.
- Phone request ID/text survive retry within the mounted panel, **not process death**. `_pendingId`, `_pendingText` and draft are in-memory. After force-stop during an uncertain POST, automatic duplicate prevention is unproven. Reconcile existing durable session facilities before introducing a new private local store/retention policy.
- `ArborSession.adopt/startNewThread/clearStoredUser` use two preference keys and ignore persistence booleans. Local adoption can appear successful while restart loses scope; writes are not atomic. Recorded as a source gap, not repaired by adding a new store in this bounded pass.
- Auth/token/project changes unmount private text, close its client and invalidate visible history. Token refresh also loses unsent draft/retry state. HTTP client has no private-chat timeout/cancel protocol; leaving UI suppresses late presentation but does not prove host inference cancellation.
- ARK status adapter retries every ten seconds and private mode uses unavailable state instead of demo data. House clock refreshes on foreground resume; world scenery is device-local and separately revision-checked. World state is not synced ARK memory or unattended activity.
- Python nonce protection and generation lock are per process. Restart forgets recent nonces; replicas need a reviewed shared atomic replay/rate-limit boundary. No shared nonce provider is implemented in the inspected runtime.

## Screens and studio/navigation inventory at Grove parent

| Feature | Source status | Practical limit |
|---|---|---|
| Night studio, mountain/lake window, glowing Arbor, Moss couch | Existing `grove_reference.webp`, house hotspots + portrait navigation | Source/asset inspected, physical phone presentation not verified |
| House clock, day phases, local sky/moon, window preview | Existing shared clock/astronomy/window panel and Observatory | Approximate illustrative sky; preview does not change actual clock |
| Matching daytime house art | Unfinished, explicitly labeled | Approved night painting stays visible |
| Stairs → Observatory | Existing navigable room | No rendered walk-through corridor/walkway found |
| Annabelle Kitchen | Existing room, this-visit scratchpad/copy | No manuscript save or writing-mode switch; scratchpad lost on leaving |
| Desk / office | Desk navigates Projects; Observatory workstation/catalog exists | No distinct office room found; desired exact office scene unknown |
| Guest room | Existing scenery/navigation view | No presence/memory write |
| Shelves / memory / documents | Existing scoped read-only shelves and consent/availability labels | Live grants/provider reads and complete source access not verified |
| Moss scenery/world journal/inventory | Existing saved device-local state + source catalog | Badge reflects local scenery; no roaming AI/persisted model activity |
| Objective, Queue, Projects, Memory, Evidence, Tools, Benchmarks, Focus, Health, Settings; command palette | Existing environment screens/read models | Screen availability does not prove real execution or a completed capability |
| Private Text | Existing, default OFF | Requires actual invite/bridge/grant, private API/LM and transcript provisioning |
| Private Voice | Unfinished/OFF | Public Voice must not substitute for private Voice |
| Installed APK, phone account/session, latest private API/LM deployment | Unknown | No physical device or live provider inspection performed |

## Local verification receipt

- Full backend: **718 passed, 0 failed, 0 skipped**, 121 test files, actual cross-runtime fixture enabled; provider fetch is denied unless a test explicitly stubs it. No paid inference.
- Actual TS signed envelope → preserved Python FastAPI receiver → fake generation → validated TS reply: passed. Asserts identity, exact saved goal, correction, timezone and empty execution receipts. No remote endpoint involved.
- Preserved receiver: **79 passed, 1 skipped**. Skip is optional adapter archive availability; no foundation/adapter inference. 61 manifest hashes and archive hash verified.
- Backend production Webpack build: passed without OpenAI key, with all chat/model/transcript/claim/cognitive/new-conversation flags false and synthetic build variables. Initial old-route helper-export failure repaired using current source. Nonfatal middleware/Sentry bundling warnings remain.
- Standalone TypeScript after build and `git diff --check`: passed.
- Existing offline host/release scripts: **16 passed**; source gate checker passed. Both actual ignored-build commands tested.
- Flutter analyzer/tests/APK: **BLOCKED**. SDK setup was automatically rejected after unexpected cloud metadata access. No workaround attempted. Dart timezone caller/test edits remain unverified by Flutter.
- No live database schema/RLS/RPC trial, owner login, real model, device or ARK checkpoint acceptance is claimed.

Reproduce backend/source checks from `apps/backend`:

```bash
OPENAI_API_KEY=unit-test-placeholder node ../../node_modules/vitest/vitest.mjs run
# Optional offline receiver composition (fake model; no weights):
GROVE_LM_RECEIVER_SOURCE=/absolute/path/to/preserved/receiver \
OPENAI_API_KEY=unit-test-placeholder node ../../node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
```

The cross-runtime test skips without that receiver path. Keep receiver bytes private; do not commit its package or personal weights into public GitHub.

## Exact next acceptance order — future authorized session only

**Engineering dependencies before owner/device work:** reconcile this bounded child against latest One Arbor source; align the strict receiver contract, canonical personality and token budgets; connect existing scoped relevant-memory and correction/objective seams with original-thread ownership; resolve pending-phone retry/save failures. Keep all model/worker flags off until the agreed source is tested. A draft PR is not permission to deploy.

1. **Pin provenance.** Record reviewed backend commit, APK commit/hash/package ID, receiver archive/source/card version, adapter digest, foundation/tokenizer version, intended private API project/origin and owner/project/conversation IDs. Independently read deployed identity; stop on mismatch. Supplied deployed sandbox ID alone does not identify the private Grove host.
2. **Owner-only provisioning.** Danelle chooses/logs into the separate Grove account. Trusted administrator verifies the existing active invitation, Grove→Firefly owner bridge and explicit project grant; never paste server keys into phone/chat. Confirm exact project and existing conversation ownership. Historical zero-row grant claims are not current live evidence.
3. **Storage release gate.** Review existing proposed transcript + claim SQL, retention/deletion and least-privilege grants. Run disposable PostgreSQL acceptance first. Hosted application is a separately authorized migration, not this source pass; verify scoped complete-turn and claim RPC readback after any approved install. Do not create a second transcript engine.
4. **Protected host gate.** Separately approve private host release and real-model budget. Verify TLS/no redirects, server secrets, request limits, shared replay/rate limits, auth denials and exact contract. Provision the existing foundation/adapter only in that approved runtime; do not activate ARK execution to test chat.
5. **Phone build gate.** In a safe Flutter environment run analyzer and all tests, then build/install owner-approved Grove flavor with distinct signed package identity, private config and `GROVE_STANDALONE=true`. Private Text opt-in is a separate acceptance setting. Default build must display unavailable private Text and never call public Firefly. Private Voice/new conversation/cognitive preview remain OFF unless separately scoped.
6. **Read-only denial proof first.** Invalid/expired/foreign token; missing/revoked invitation, bridge or project grant; foreign project/conversation; wrong API origin/project; supplied owner/roles/history/clock fields: deny before LM. Compare provider-call counters using synthetic fixtures. Real account checks reveal no foreign content.
7. **One bounded real turn.** After separate model/transcript approval, enable only required private chat/model/transcript/claim gates. Send synthetic text with a recorded request UUID. Capture host-scoped context evidence privately: canonical identity and active corrections before overlay, relevant current memory, current objective and host time. Record actual reply and fenced save/readback; no private transcript in public GitHub.
8. **Causal parity proof.** Test correction on one surface, a fresh turn and process restart; explicit Annabelle→Text return; tired/terse input; relevant versus absent/foreign memory; interruption and unfinished-versus-completed goal. Require actual changed behavior plus scoped source evidence. An echoed prompt or fingerprint alone is insufficient.
9. **Retry/failure proof.** Lost POST response then same UUID/text: same canonical saved reply, no new call while claim active. Same UUID/changed text: conflict. Revocation during history/inference/commit: withhold private content. Save/readback failure: no saved-success claim. Kill app during pending send: this is a known HOLD until durable phone retry recovery is repaired. Never retest by blindly resending with a new UUID.
10. **Time and navigation proof.** Compare real UTC instant and phone local date around midnight; change timezone/return foreground; window preview must not affect inferred now. Verify day/night labels, portrait/landscape navigation, kitchen scratchpad loss warning, Observatory/stairs, shelves and Moss state. Record art/office/walkway gaps honestly.
11. **Checkpoint acceptance is separate.** Private chat currently cannot write ARK objective/checkpoint state. Use only an already reviewed, separately authorized objective-scoped bridge in a future session; record objective/task/checkpoint/result IDs and read back after restart. Do not rerun the consumed first ARK canary or enable general execution. If no approved writer exists, keep this stage BLOCKED.
12. **Close pilot.** Turn pilot model/chat flags off, verify private reads and denials, preserve audit/source IDs; no production promotion. Return actual deployment/device/model/save/checkpoint evidence and remaining gaps to the existing master ledger.

## Owner/human steps, separated from engineering

- Choose/authenticate the Grove owner account and confirm mapped project/conversation.
- Approve any future preview deployment, hosted transcript/claim migrations and retention policy.
- Approve any future protected real-model runtime and compute budget; supply secrets through approved secret storage.
- Run safe Flutter/device acceptance and judge actual Arbor identity/personality/voice behavior.
- Approve only a separately reviewed bounded ARK checkpoint path if that stage becomes available.

No approval is needed to read this handoff. No live write is implied by its instructions.

Supabase references checked for the source review: current changelog, `https://supabase.com/docs/reference/javascript/auth-getuser`, and `https://supabase.com/docs/guides/database/postgres/row-level-security`. Existing hosted auth/ownership implementations were preserved; no new Supabase schema or client API was invented.
