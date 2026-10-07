# ONE ARBOR — PRs #335–339 + archive STOP #337 reconciliation

Date: 2026-10-07 · **review-only / not deployed / no new authority**

## Source lineage and collision policy

- Frozen accepted but older Preview runtime: PR #322 at `f4021985b475651284c97aecbc3bdf03123478cc`. Source-only integration is not running Preview.
- #330 parent `0b8343d0fda9264decf039dd2afd0b80e2a934cc`.
- #335 composed #331–334 at `6ccd1d45eb67f9428962ccdfc0005f77d2c6abac`, green source CI `37689008647`.
- #336 May-route compatibility at `0f85807943734ee603b070912ec80bb633b68e79`, green CI `37690614150`.
- #338 recovery + Glow vs Noise at `032761d7d162c113c840765ffa62eb211b57ae50`, green CI `37692285995`.
- #339 host-to-agency recovery inspection at `efd81c3d449609af872e8f7e62bce797af082aa8`, green CI `37692951438`.
- #337 sibling STOP-after-readback repair at `c637b91195a68125ddfb86aca586d71b2faaf988`, distinct draft and **previously lacked exact-head CI**.

This candidate branches from the existing #339 head, therefore preserving the #335→#336→#338→#339 chain *without re-copying those fixes*. It reconciles #337 by copying its two modified archive files into the new isolated branch. Original #337 changes only:
- a STOP check before reading/writing on entry and **after destination readback before checkpoint save**;
- two synthetic tests: pre-aborted transport and abort during readback.

The expected file destination matches #335 source before the copy. A recipient branch readback must prove exact #337 blob SHAs before acceptance. Reuse existing v2 archive importer; **do not transport even one actual batch** merely to test it.

The branch is excluded from automatic Vercel builds. The existing combined workflow is expanded to include all newly-added May, conversation, Glow, and host recovery tests, the archive STOP controls, full backend/control regressions, CI-only build, model fixture checks and standalone TypeScript. A *new* engine or migration is not proposed.

## Blind behavioral acceptance — organized from PRE-EXISTING pack

Owner's `ONE_ARBOR_BEHAVIOR_LAYER_ACCEPTANCE_PACK_20261007.md` remains the reference. That pack has protected-case IDs, raw input/expectation, and explicit NOT-RUN status; do not copy sensitive private transcript examples into this public repo.

### Phase 0: freeze and privacy review (NO inference)
For each test batch record immutable source SHA, **deployed** host/model hash if any, owner/project/auth grant, model/tokenizer/runtime build, temperature/seed, max tokens, relative date/time, exact prompt/context payload (stored privately), holdout revision/hash, evaluator anonymity and predeclared rubric. Redact all protected data from public CI. If no real runtime is approved, record `not_run`.

### Phase 1: protected instruction controls
- CA-03/04 protected commit SHA/path byte integrity.
- CA-05/06/07/12 negation, STOP and no automatic resurrection.
- CR-02/07/08/10 ambiguous/stale/terminal referents.
- X-01/04/05 cross-layer STOP/identifier/blocked-return traps.
- Host-state reviewer must record **known**, **unknown**, **next**, durable goal revision, stale/missing source and any blocked permission.

### Phase 2: conversational identity and pragmatic judgment
- HP-01/02 technical success vs external failure without status invention;
- HP-03/04/05/06 casual humor vs sensitive or high-stakes context;
- HP-07/08 real sourced callback vs fabricated "shared memory";
- HP-11/12 serious transition and stable character under technical work;
- CA-01/02 and CR-03/04/05/06 compressed shorthand with retained goal.
- Evaluate after a real intervening assistant response and subsequent user turn, not static phrase recognition.

### Phase 3: hypothesis consequence and user values
- FL-01/02/03/04/05/06 distinguish body hypotheses from verified facts,
  preserve contradiction, and observe actual *later* decision change.
- Glow vs Noise source evaluation: explicitly user-reviewed priority vs
  unknown priority; source-ref duplication, irreversible/blocked fork, tempting
  but non-goal-relevant high utility. Only reversible, authorized options may
  enter ranking; never substitute the model's personal-capacity diagnosis.

### Phase 4: holdout design and scoring
- Randomize baseline/candidate blind labels and balance case order.
- Hold model and scope/settings constant where technically possible.
- Separate evaluator dimensions: task fidelity, correction application,
  helpful disagreement, pragmatic warmth, situational humor, uncertainty,
  source integrity, goal/STOP retention, safety/owner isolation, unnecessary
  interruptions and genuine useful next-step initiative.
- Negative controls should penalize compulsive "recovery" loops: when the
  current goal is present and execution remains safe, the system must continue.
- Zero-tolerance failure: changed protected literal, erased negation/STOP,
  resurrected terminal work, wrong owner, forged authority, unauthorized write.
- Persist observed transcript IDs + source provenance in approved private
  evaluation store; rank with predefined rubric; use a new holdout for repairs.

### Status distinction

1. **Source tests green**: TypeScript/CI-only mechanics, not deployed.
2. **Authenticated host read green**: actual authorised owner/project state,
   fresh-session readback, negative foreign-scope checks.
3. **Blind behavior green**: real sampled replies and follow-ups scored;
   private corpus/LM use only after separate approval.
4. **Device/release green**: phone, voice, Grove and production gates separately.

Neither a prepared rubric nor a compiled proposal counts as phases 2–4.

## Safe next work, without extra prompts

1. Exact-head CI on reconciled branch, readback commit and independent code review.
2. Confirm #337 two file blobs match after composition; review no other overlaps.
3. Preserve all original PRs until an owner decides consolidation/closure.
4. Hand off the next live acceptance to **existing** ARK/Grove owners. Do not create
   a duplicate canary, research job or fresh objective.
5. Owner-approved Preview host must authenticate and prove actual source events,
   user/project access and fresh-session continuity before any real model test.

**Hard boundaries:** no `main` merge, production deployment, broader ARK enablement,
new grant, September 28 research task change, archive import, paid inference,
private model training, private memory/identity mutation, or signed phone release.
