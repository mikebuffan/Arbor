# Grove bounded-write continuation — 2026-10-06

## Source custody

Recovered saved reconciliation `0146c19196c614f37bfe0478306e5fb58722f21b`
and verified its exact tree `799622dfd64ea068e930fdec2c6a74529b2bf79b`.
GitHub file recovery was hash checked; no reconstruction of completed engines.
Buffalo remains `65f7ae96a4162b6ef5f069713d685c01c4517b19`.
Private-host branch `fix/buffalo-grove-private-host-20261006` points to the
separate candidate `83fcef641465e436770f02d86eee5159daf6613b`.
That candidate has not been overwritten or treated as a descendant of this
reconciliation. Existing Pattern Hop and archive reader/import preparation remain
unchanged; no archive contents were ingested or read for this continuation.

Preparation commit `864dbf212f3933df4622408aab220b2b71cb3775` holds the two
isolated continuation branches through an exact source-only branch list. The
previous reconciliation's ignore commands exceeded Vercel's 256-character
limit; commands now reference a reviewed local script. Existing root/backend
cron schedules are preserved; dedicated Grove still has no crons. No provider
retry, settings update, deployment or live migration is authorized.

## Ordered work and current evidence

1. Source/head preservation: complete; exact saved tree recovered.
2. Separate correction-write permission and backend connection: implemented
   behind `GROVE_PRIVATE_CORRECTION_WRITE_ENABLED`, default OFF. The proposed
   Grove migration seeds no grants. No phone UI for this separate action was
   added; acceptance uses the explicit reviewed endpoint before any later UI.
3. Shared runtime goals and ARK checkpoints: source review complete; remaining
   connections described below. No execution capability invented or activated.
4. Integrated Flutter analyzer/tests/synthetic Grove APK: passed in CI run
   `37480350593`, phone job `112326530078`, source `857dfd5f67f723de207160749bf0f0a3a8a6f793`.
   Metadata deny rules, pinned SDK, unchanged lockfile, focused/full tests and
   synthetic APK verified. Phone tree `a611128ac9e9beaffccaf81134f69dff7783a440`
   is unchanged from the saved reconciliation.
5. Native PostgreSQL claims/completion/revocation and actual durable writer:
   **passed**, CI run `37481859127`, native job `112331984344`, runtime/source
   head `670045422925431b3cb991e7d4d533e8d62e1818`. PostgreSQL 16 in a disposable
   local Unix-socket database. Both transaction orderings and all 12-session
   claims/completions/correction cases passed. Phone custody job `112331908629`
   independently verified the exact previously accepted Flutter tree. Full
   phone compilation was intentionally skipped on that repair-only run.
   Earlier harness failures were module-loading and command-output parsing;
   they were repaired without changing the actual durable writer. Local native
   execution is still unavailable, but the safe runner resolved this gate.


## Correction connection

`POST /api/grove/corrections` accepts only project, conversation, retry UUID and
explicit user text. It streams at most 12 KiB and accepts at most 3,000 text
characters. It derives Grove/Firefly identity from verified Auth and the existing
owner, bridge, project grant and conversation ownership checks. A read grant
alone is insufficient. An independent expiring permission must match BOTH
identities, exact project/conversation and `global_behavior_calibration` purpose.

Only the existing three reserved GLOBAL behavior correction families can be
promoted: follow-through, identity drift and continuity. This affects subsequent
conversations, so the global effect must be included in owner approval. It is
not permission for general memory, acoustic calibration, runtime goals, ARK
checkpoints, tools or model generation.

The connection reuses `preparePrivateCorrectionSave`, the durable pending ledger,
existing recovery and conditional durable writer. Timestamp and UUID survive
same-text retries; changed text conflicts. Recovery is restricted to the exact
UUID, with fresh authorization before promotion and acknowledgement. Grove jobs
carry a bounded-write marker: ordinary public-chat recovery holds them instead
of bypassing the Grove verifier. Failed promotion remains staged; `saved` requires
the exact completed ledger receipt and matching permanent correction readback.
Same-ID lost-response retries verify that completed receipt without a duplicate
write. Permission is checked again after reads before returning a result.

The verifier and Firefly write cross two databases. Rechecks do not establish an
atomic distributed revocation transaction: revocation may race an in-flight
Firefly write. An uncertain result remains unconfirmed; do not claim rollback or
absolute instantaneous revocation. Review that policy before live permission.
The reused writer's normal memory pipeline includes embedding generation; these
tests use synthetic embeddings. The correction flag/grant does NOT approve
paid embeddings or provider activation. Their runtime policy/budget is a live
approval gate too.

## Runtime goals and ARK checkpoint review

| Boundary | Existing source | Remaining connection |
|---|---|---|
| Shared goal into Grove inference | `readArkLayerContext` loads scoped runtime state and projects currentGoal before task overlays | Grove does not persist a changed goal/runtime state. Needs separate bounded authenticated write authority and restart/readback acceptance. |
| Selected objective | Read model exposes bounded counts and `activeObjectiveHandoff: not_resolved` | Existing reviewed selector/standing authorization must identify the intended owner/project objective. A browser or LM assertion is not sufficient. |
| Checkpoint persistence | `runArkCycle` in `lib/ark/runner.ts` calls `store.checkpoint` only for checkpointed executor results; `SupabaseArkStore` calls `ark_checkpoint_task` | No Grove Text caller has an authorized claim/worker lease. Need exact objective/task capability, valid current lease and next sequence before reusing that writer. |
| Completion evidence | ARK task/checkpoint stores have their own receipts | A model reply, transcript row, saved correction or queue count does not prove task completion. |

No second selector, memory importer, runtime engine or checkpoint store was
introduced. General worker/model/voice activation remains off. The receiver's
default 2,400-token limit still cannot fit the previously reviewed 4,020-token
fixture; proposed 8,192 needs exact model/tokenizer context validation.

## Validation scope

The inherited reconciliation receipt remains 980 backend tests, types/build,
11 host checks and disposable SQL. This continuation passed **1,013 backend tests in 156 files, zero skips**,
TypeScript, production Webpack build, 11 offline host checks, and the combined
disposable WASM transcript/claim/correction-grant fixtures. Existing middleware
and Sentry build warnings remain. It adds authorization, route,
existing-writer connection and recovery isolation tests. All unit network calls
are denied by the existing test setup; embeddings are synthetic in connection
fixtures. The actual signed TS-to-private-Python fake-generation fixture runs
separately with the unchanged private source ZIP, never published to CI.

Flutter analyzer completed with 100 existing informational/warning diagnostics;
zero analyzer errors. Focused 36 tests are a subset of 192, not an extra count.
The APK is synthetic debug output, never signed for release, published or installed.

Native fixture: original exact owner/bridge/transcript/claim proposals, plus the
new correction permission proposal. Twelve psql sessions test one claim winner,
expired lease reclaim, stale-token fencing, one canonical completion, restart
replay, changed text denial and both transaction orderings: revoked access commits
before blocked completion (denied), and completion holds its access locks until
commit before revocation (one canonical row, future claims denied).
The native correction transport calls the actual existing TypeScript durable
writer against a synthetic minimal memory table and independent psql sessions:
unique first insert, newest observation, bounded contention recovery, stale
replay, revocation before CAS, lost insert response. This is native database and
actual writer evidence, not hosted PostgREST/RLS acceptance or a real-model test.

## Owner gates, later

No computer chore is needed to complete source/CI work. Danelle has a home
computer; its OS/hardware have not been checked. Later obtain that single
hardware check, choose the protected runtime and approve the exact model,
tokenizer/adapter receipts, context budget, small compute/embedding budget and
single-process or shared replay/rate policy.

Separately approve the exact private host, owner account/mapping/project/
conversation, expiring global-calibration permission and proposed hosted schema.
Approve transcript/draft retention, signed package identity and signer before
device installation. Then run account denials, one bounded real-model turn,
correction save/restart readback and phone acceptance. ARK execution/checkpoint
requires a separate explicit capability and receipt. No reused canary.

## Final continuation boundary

The correction backend connection, goal/checkpoint review, integrated phone
checks and native disposable database checks are complete in source. Remaining
engineering/live gates: separate Grove runtime-goal writer; reviewed objective
selector and bounded leased ARK caller; a phone UI for the new explicit correction
action if desired; actual hosted PostgREST/RLS/permissions; model/tokenizer/context
and replay/rate policy; approved signed release/device acceptance. No hosted
write grants were created, no exports ingested, no engine rebuilt, no production
release or inference activated. All existing drafts including Buffalo #249 remain.
