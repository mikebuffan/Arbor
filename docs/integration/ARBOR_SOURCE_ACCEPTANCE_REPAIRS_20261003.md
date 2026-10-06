# One Arbor source acceptance repairs — 2026-10-03

Parent: `1e027c4835e5e8b05f61af5fd7c4bb260ebfcc24` on `fix/durable-correction-retention-20261002` (#235). Preserve the existing #223 → #232 → #233 → #234 → #235 stack. This supplement follows `ARBOR_COMBINED_REVIEW_AND_ARK_HANDOFF_20261002.md`.

## Source repairs

- Reserved durable behavior keys now use database conditional writes. Newer observations win over older observations; equal timestamps retain the existing value. Concurrent first inserts use the existing `UNIQUE(user_id,key)` constraint. Updates match the previous JSON value and owner/global/active/unlocked scope. Zero-row mutations re-read rather than report success. Tombstones and locks are never revived by promotion or replay.
- Explicitly authorized behavior promotions are staged in the existing `memory_pending` ledger before model generation and response completion. The derived user-message ID preserves the original observation across request retries. No new schema, engine, dependency, queue, or standalone worker is introduced.
- Pending saves retry recognized transient errors, require durable readback before acknowledging reported writes, and survive failed saves or acknowledgments. Later authenticated backend chats recover up to 20 jobs; failed attempts rotate behind unattempted jobs. Cached completed turns schedule only pending recovery, without replaying the entire memory pipeline or model response. Recovery is request-driven, so a dormant account has no timed retry guarantee.
- ARK's backend read-only continuity handler loads the same permanent correction reader as chat, merges observations chronologically, and can return durable behavior guards when no runtime history exists. Missing runtime history remains unavailable; acoustic corrections stay separate. Installed connector behavior will not change until the repaired source is deployed.

The concurrency guarantee covers the three reserved behavior promotion keys through the memory upsert path. It does not claim serialization of every memory mutation. Reinstating a tombstoned rule remains an explicit restoration action outside replay.

## Local validation

- Full backend suite: **630 passed, zero failed** (596 original tests plus 34 new tests).
- TypeScript: `tsc --noEmit --pretty false` passed.
- Production Next.js build: passed using placeholder credentials; no live database or model calls.
- Tests include atomic predicate races, concurrent inserts, stale/equal observations, lock/tombstone races, owner/scope rejection, denied mutations, failed-save replay, crash-before-ack replay, bounded fairness, HTTP request predicates using the installed Supabase client, cached-turn effects, and ARK durable continuity.

SQL migration bytes, dependencies, and lockfiles are unchanged. Test database behavior is simulated; HTTP contract tests stub fetch. These results do not substitute for deployed database acceptance.

## Read-only ARK reconciliation

The canonical manuscript is `3e6f799e-1702-4282-b134-95e59aed2bb6`, under project `9366c350-5d82-49f5-b9ef-862af750e3a0`. A manuscript-specific snapshot returned 60 chapters, 100 editorial records, five checkpoints, and `truncated:false`. A project-only inventory returning no chapters/records is not proof of a missing archive.

The continuous checkpoint remains chapter 1 / next chapter 2. Later notes are not verified reading progress. Whole-book voiceprint/exemplar authority remains rejected. The selected editorial bridge excludes reader reactions and duplicates; sampled later-chapter notes were small, while a 201-record input failed closed as incomplete. A complete deployed editorial endpoint and record-limit acceptance remain open.

The installed ARK continuity snapshot still refers to a different 659-test candidate; do not combine that receipt with this 630-test repair. The original exact-head automatic Vercel Preview was READY at deployment `dpl_42nxhetWcCdEPUQMiRmQbG5sZXzt`; it does not contain these repairs.

## At-home acceptance gates

1. Attach this immutable repair commit above #235 for draft review when a Git update/automatic Preview is appropriate. No existing branch is advanced by publishing the review object.
2. Confirm deployed `memory_items` uniqueness, RLS, JSON equality predicates, and the existing `memory_pending` schema with the actual authenticated account.
3. Exercise concurrent old/new behavior corrections and first inserts against the deployed database, including lock/tombstone races.
4. Interrupt a save, resume a fresh authenticated chat without repeating the rule, and verify the permanent row plus pending acknowledgment. Check a cached request does not repeat model/pipeline effects.
5. Verify deployed chat and ARK continuity agree on permanent guards and missing-history behavior. Reconcile the connected tools and exact deployed commit before claiming acceptance.
6. Verify protected editorial snapshots, limits, chapter authority, and fresh-session behavior against the canonical manuscript.

No merge, manual deployment, protected live write, or execution activation is part of this source repair. The source review object is published without creating/updating a branch or PR, avoiding a Git-triggered Preview while computer-dependent acceptance is deferred.
