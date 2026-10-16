# Grove private conversation deletion — concurrency challenge and release boundary

## Observed review gap
The earlier sequential disposable PostgreSQL fixture proves only that
a saved turn is rejected **after** deletion commits. Without serialization,
a second serverless worker can insert after deletion has taken its DELETE
statement snapshot but before the new tombstone commits. The previous
trigger's uncommitted-tombstone read is not sufficient proof.

## Existing-engine repair (source-only)
The **proposed** Grove-turns migration now includes a transaction-scoped,
per-owner/project/conversation advisory lock. The *same lock order* is
acquired by the existing claim RPC, completion RPC, INSERT/UPDATE trigger,
and explicit-delete RPC. In particular, completion acquires this lock
BEFORE SELECT FOR UPDATE of a claim, preventing a worker/deleter deadlock.

The trigger takes the lock BEFORE its tombstone recheck. A writer arriving
during deletion waits for commit and then observes the committed tombstone.
An advisory-lock hash collision can conservatively serialize other scopes
but cannot grant access or alter ownership.

## Exact challenge
`ops/grove/disposable-db/private-conversation-concurrency-acceptance.sql`
reuses the original sequential deletion fixture and opens **two independent
PostgreSQL sessions** through local disposable `dblink`. Deletion waits
inside a synthetic BEFORE DELETE row trigger; a second session attempts a
late transcript insertion after the deletion snapshot. It must be rejected,
no target rows may remain, and an unrelated saved chat must be intact.

Both proposals and the challenge run **only** in a disposable, network-isolated
PostgreSQL 17.6 GitHub job; no connection to the actual Grove/Firefly/ARK
Supabase databases, no Vercel/paid LM, no device/app update.

## Release gates that source testing cannot satisfy
- User decides how exported or backup copies are retained after explicit
  deletion, and approves a restoration/rollback plan that does NOT resurrect
  deliberately deleted text. Never equate restoring a backup with undoing a
  user's explicit deletion.
- Deleting from Grove does not delete underlying Firefly conversations, other
  apps, standalone memories or archived copies; this is stated in the UI.
- Current Grove schema has **none** of the transcript, claim, deletion, or
  tombstone tables/functions installed. Source acceptance does not install them.
- Any later migration requires new, narrow owner authorization, exact SHA,
  production isolation/no-cron proof and post-migration access/negative tests.

No new engine, automatic expiry, user deletion, worker activation, host grants,
or broader task IDs were added.
