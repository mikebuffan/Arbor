# ONE ARBOR — Group 07 conversation behavior, shorthand, Voice, humor and downshift receipt

Snapshot: 2026-10-07. **Source-only, draft review, synthetic tests. Not a deployed host or genuine model/audio evaluation.**

## Scope and concurrent ownership

Exactly C05 (context-sensitive humor), C09 (acoustic/voice corrections), C10 (Text–Voice–Text), C11 (exemplar blind tests), D15 (shorthand interpretation) and D18 (retired downshift scripts). Reference owner's 97-task master.

Parent: PR [#340](https://github.com/mikebuffan/Arbor/pull/340) at `595375d525cf561172449726ed0c086ab4ece7db`; **not deployed / not merged**. Group 01 #344 identifies the separate READY Preview source PR #322 `f4021985b475651284c97aecbc3bdf03123478cc`. Never infer a deployed host from this branch's green source CI.

Ownership inspection:
- Group 05 #343 owns `arbor/continuity/longitudinalPolicy.ts`, longitudinal shorthand and recovery, time/referents. Its separately edited tests and source were inspected; **this branch changes neither**.
- Group 06 #348 owns the self-model evidence boundaries and `canonicalIdentityAnchor.ts`; **this branch does not touch Group 06 files**.
- Group 03 archive, Group 04 memory, other Grove/device owners and the ARK STOP worker are untouched.
- This lane touches only narrow Group 07 cognitive-access STOP interpretation, corrections classification and synthetic tests, plus its isolated CI, source-only branch ignore and receipt. Independent exact-branch Vercel ignore entries on sibling lanes must be unioned at future reviewed composition, never overwritten.

## Existing nonduplicated source

- `lib/arbor/pragmatics/humorPolicy.ts` is a pure form/placement gate (not a joke generator); critical/high-emotional-risk contexts suppress humor; baseline low energy alone does not; teasing requires relationship/earned permission; callbacks and absurdity must be relevant; blockers/technical clarity come first.
- `lib/arbor/behavior/behaviorProjection.ts` projects one shared baseline and corrections into Text/Voice/Annabelle modes, avoiding generic flattening and artificial mood mirroring. The generated prompt is a contract, not proof of generated behavioral compliance.
- `lib/arbor/continuity/longitudinalPolicy.ts` already recognizes `go`, `list prompt go`, `prompt and go`, `go go buffalo`, but `shouldCarryGoal` requires prior unfinished agency work. No shorthand grants a worker/permission. Group 05 extends and owns this.
- `lib/arbor/accessibility/cognitiveAccessLanguage.ts` preserves literal source, IDs, numerical amounts and negation, and interprets noisy typed/STT context without treating language differences as intelligence/authentication evidence.
- `lib/arbor/runtime/corrections.ts` separates acoustic corrections from behavioral ones; the voice instruction/projection pipeline consumes acoustic-only corrections, preserving exact assistant text. The existing host and control-backend renderer are **distinct source implementations, not proof of two live host paths**.
- `lib/arbor/body/bodySystem.ts` uses an ephemeral, bounded downshift signal for safety/load/pacing and explicitly disallows identity mutation and unapproved durable writeback. This is not an authorization gate or a therapeutic script.
- Existing 18-scenario `ARBOR_CONVERSATION_ACCEPTANCE_CASES_20261005.json` and `scripts/behavior-acceptance.mjs` support offline matched A/B preparation/auditing. The entire genuine generated-response pack remains **NOT RUN**; replay requires actual captured replies and separately approved host/model/voice.

## Two concrete bounded source repairs

### D15: STOP/interrupt reconstruction hole
The cognitive-access control guard previously matched only a bare short STOP token (such as `wait`) when deciding whether to preserve raw input. A high-confidence, ordinary-risk candidate could reinterpret a longer instruction like `Stop that` or `Do not go` as a continuation without triggering the guard (including when both alternatives contained negation). Extended the **existing** conservative control detector to preserve leading `stop / wait / pause / hold on / cancel / never mind` directives with trailing words, and explicit negated `go / continue / proceed / resume / restart`. It returns the raw text as authoritative; it **does not call a worker STOP**. Eight synthetic regressions cover switches, negated-control substitutions and verbose interruptions; existing ordinary typo and `go` recovery remain tested.

### C09: explicit-acoustic correction plus ambiguous identity-drift wording
Legacy single-kind feedback priority classified `your voice sounds British; it doesn't sound like you` as **behavior**, so the acoustic voice renderer did not get that correction. Refined the existing `detectCorrectionKind` to prioritize **specific acoustic features** when competing behavioral feedback consists only of generic `you've drifted` / `doesn't sound like you`. Concrete independent behavioral feedback (`customer service`, `presenter`, `too formal`) still stays behavioral even when Voice is mentioned. Synthetic cross-layer tests assert acoustic-only instructions, unmodified canonical speech text, and shared Text/Voice/Annabelle core fingerprints. The legacy single-kind classifier cannot safely split truly mixed acoustic plus independent behavioral commands automatically: **manual correction split / future deliberate API design remains a gate**, not silently accepted data.

## Six-task measured status matrix

| ID | Verified source capability | Remaining true gate |
| --- | --- | --- |
| C05 Humor | Pure context-appropriate gating and synthetic serious/technical/tired/callback tests; no forced jokes | Live actual response/adversarial humor appropriateness, social timing and user-rated continuity unverified; policy not necessarily live-wired |
| C09 Accent and voice corrections | Separate kind/routing/voice-instruction source; explicit-acoustic drift collision patched + tests | Actual General American acoustic rendering and cross-session live correction durability require approved recorded playback |
| C10 Text–Voice–Text | Canonical text-preserving voice adapter/render gate, mode-specific presentation and shared behavior fingerprint | Real microphone/STT, interruption, provider voice playback, round-trip client/thread handoff and actual device acceptance NOT RUN |
| C11 Exemplar blind tests | Existing 18-case offline prepare/audit pack; synthetic tests validate evidence schema, no coached rubrics, not-run truthfulness | Actual blinded model A/B with equal tools/settings, independently scored captures, privacy consent, approved inference budget and host/device proof NOT RUN |
| D15 Shorthand | Existing bounded continuation, literal-preserving interpretation and new STOP/negated-control fail-closed guard | Authenticated trusted host action-control and real interrupted-work continuation still needed; Group 05 owns engine semantics |
| D18 Retired downshift scripts | Ephemeral downshift/pacing and shared baseline preserve identity; source synthetic tests cover no identity writes | Historical retirement inventory, generated-text checks for generic soothing scripts vs legitimate safety pacing, live replay need separately scoped approved evidence |

## Verification ledger — separate test truth from generated behavior

Changed files:
- `apps/backend/lib/arbor/accessibility/cognitiveAccessLanguage.ts`
- `apps/backend/lib/arbor/accessibility/__tests__/cognitiveAccessLanguage.test.ts`
- `apps/backend/lib/arbor/runtime/corrections.ts`
- `apps/backend/lib/arbor/runtime/__tests__/corrections.test.ts`
- `apps/backend/lib/arbor/behavior/__tests__/group07ConversationSurface.test.ts`
- `.github/workflows/one-arbor-group7-conversation-voice.yml`
- `ops/grove/source-only-ignore.mjs`
- this receipt

Isolated exact-branch CI is configured to run cognitive-access STOP, longitudinal-shorthand, corrections, humor, behavior, Voice canonical/identity/speech and Group 7 cross-surface tests; backend TypeScript; existing *offline* blind-test harness Node tests. **CI RESULT MUST BE FILLED FROM EXACT-HEAD GITHUB READBACK — never inferred from workflow creation.**

No provider inference, private exemplar upload, actual voice playback, audio scoring, ARK task permission, STOP execution, worker activation, deployed host changes, main merge or production alias change. Actual behavioral outcomes, accent quality, and permanent correction retention are **UNKNOWN**, not source-test PASS.
