# Grove backup replay vs full-snapshot restoration (2026-10-11)

**Status: SOURCE-ONLY TEST AND RELEASE HOLD.** This does not restore or change a real user database.

## User-owned policy

Grove conversations are retained indefinitely until their user explicitly
deletes them. An access revocation or sign-out is not deletion. No TTL, no
scheduled purge. Deleting private Grove transcript does not erase the shared
Firefly conversation, independent memories, attachments or other app records.

## Precisely what the current database can guarantee

The existing `grove_private_conversation_tombstones` proposal, PostgreSQL
INSERT/UPDATE triggers, and the per-conversation advisory transaction lock
prevent old turns and claims from being *reimported into a newer database that
still has the deletion marker*. The disposable test
`ops/grove/disposable-db/private-conversation-backup-replay-acceptance.sql`
reuses the existing two-session deletion challenge and then tries to restore
synthetic backed-up completed turns and pending model claims. Both must fail.
The unrelated conversation must remain saved.

## What the source CANNOT guarantee, and why

Restoring an ENTIRE older database snapshot from before the user pressed
Delete would restore the old transcript and roll the deletion tombstone back
as well. SQL triggers *inside that old snapshot* cannot know about a deletion
made later. A deliberately rolled-back, synthetic "marker absent" test
reproduces this risk rather than hiding it.

Before permitting full-database recovery, require an independently preserved,
integrity-protected post-backup deletion record and owner-approved recovery
procedure that checks/reapplies it **before** the restored host can serve
content or accept model calls. No such external durable deletion receipt,
backup exclusion, post-restore purge/verification, or data-erasure policy is
currently implemented or authorized; therefore full-snapshot restoration
remains **GATED / NOT ACCEPTED**. This report does not create a duplicate
ledger or grant a new deletion engine.

## Safe release order

1. Keep private chat/delete OFF in the live Grove host.
2. Owner has chosen a **maximum 30-day retention window for encrypted Grove-managed backup snapshots**, not active messages. Before release verify actual backup provider supports expiry, encryption, backup erasure/retention, and a safe treatment of user-deleted text inside immutable copies.
3. Design and test independent deletion-state custody for full restoration
   before approving a hosted restore or a real owner deletion.
4. Recheck exact Grove Auth/invitation, Firefly ownership, scoped grants,
   durable tombstones, and the restored transcript absence before serving
   any restored user messages.
5. Test one authorized synthetic hosted rollback only with capped compute,
   never automatic deployment to production or main.

Source CI proves only the disposable logical-replay fence and the
documented full-restore limitation. No production, paid model inference,
Vercel build, migration, or real user-data access is authorized here.

## Source-only restore coverage preflight — 2026-10-11

We reused `ops/grove/verify-private-host.mjs`; there is **no new backup
engine, deletion ledger, restore API or server daemon**. The pure function
`inspectGroveRestoreDeletionCoverage` compares bounded scope-only
metadata: proposed independently held deletion references, tombstones in a
hypothetical restored state, and any resurrected turn/claim scopes.

The checker rejects malformed/duplicated inputs, records missing deletion
markers or surviving deleted scopes, and never handles message bodies. It
**always returns readyForRestore=false**, even when synthetic sets align:
input supplied as "external" is NOT an authenticated independent ledger and
cannot prove source completeness, deletion watermark freshness or post-backup
custody. A full snapshot missing the later deletion ledger remains UNSAFE.

Offline tests cover: missing independent ledger, missing tombstones, restored
old turns/claims, foreign scope, duplicates, extra content, and the
non-authoritative "structurally consistent" case. The existing GitHub
`metadata-only` job already runs the augmented host checker tests.

### Unresolved owner + release decisions

No automatic expiry applies to ACTIVE Grove conversations: they stay until
explicit user deletion. **Owner-approved snapshot copy maximum: 30 days** from
snapshot creation. This is a PRODUCT RULE, not a live provider setting or an
implemented automatic cleanup job. Backups older than that must be withheld
from use and securely removed under a separately authorized provider procedure.
A deleted conversation must never be exposed through a backup restore; a 30-day
retention ceiling does not itself establish verified provider-side erasure.
Before any real restore, owner must approve a retention/erasure policy and an
independent, integrity-verified deletion-state custody/replay and quarantine
procedure that protects against an older database snapshot.

This tool cannot issue restoration approval and changes no real Supabase
database, storage policy, existing chat, model, worker, Vercel project, or
phone installation. No actual user deletion evidence exists in current
Grove production tables; proposed transcript/tombstone tables are not live.

## 30-day backup-only contract and source checks — 2026-10-11

The user has explicitly approved keeping encrypted Grove recovery copies for
**up to 30 days**, while leaving the main conversation store and saved memories
under the existing **until explicitly deleted** rule.

Existing `ops/grove/verify-private-host.mjs` now includes the pure
`inspectGroveBackupSnapshotRetention` metadata check (no scheduler,
deletion engine or new restore service). With a caller-supplied UTC snapshot
inventory it recognizes the inclusive 30-day boundary, flags snapshots older
than 30 days, disallows unencrypted and future-dated snapshots, and rejects
untrusted/colliding metadata or content-bearing fields. It **always** leaves
provider encryption/expiry and actual deletion unverified and restore
unauthorized. This is NOT evidence any provider has applied those settings.

The release must still prove the backup provider's actual encryption,
retention, removal/expiration and handling of previously user-deleted text,
the independent deletion-state custody across physical restores, and
appropriate provenance/rollback. No silent automatic cleanup of real backups
is authorized by the tests. Keep actual Grove host, model and migrations OFF.

## Quarantined full-restore design and custody contract — source-only review (2026-10-11)

**Rehearsal only:** Existing disposable PostgreSQL acceptance now also includes
`ops/grove/disposable-db/private-conversation-restore-quarantine-acceptance.sql`.
It simulates a backed-up old turn after removing a newer tombstone, reapplies
a *synthetic known deleted scope* before any hypothetical read, checks the
deleted turns and pending claims are absent, retains an unrelated saved chat,
then rolls the entire simulated restore back with a PostgreSQL exception
subtransaction. The rehearsal must emit
`GROVE_RESTORE_QUARANTINE_SYNTHETIC_REAPPLY=PASS` and **still HOLD live
restore**. This is not a second restoration engine, no host endpoint, and not
evidence an external deletion ledger is deployed.

### Independent deletion-state custody (NOT IMPLEMENTED)

The source-only checker `inspectGroveRestoreDeletionCoverage` compares
metadata sets but **never authenticates the alleged "external" ledger**.
Before a real owner Delete button or physical restore is accepted, a *separate
reviewed provider/custody mechanism* must supply all of:

1. **Independent failure domain:** append-only deletion intent/commit receipts
   held outside the Grove database, its snapshots, its restore point and
   Grove service-role permissions; independently access-controlled audit and
   encryption/signing keys. Neither the restored database nor a user/model
   prompt may manufacture missing records.
2. **Exact identity and durable acknowledgement:** a scope tuple of Grove
   user UUID, Firefly project UUID, Firefly conversation UUID; idempotent
   deletion-event ID, monotonic ordering/watermark, timestamp, confirmed
   persistence and an integrity-verifiable custody receipt. No transcript body
   is required in the ledger. Owner deletion must not be reported successful
   before both the independent durable intent and the transactional scoped
   tombstone/purge are demonstrably committed. If intent is durable but DB
   completion is uncertain, retain a **blocking unresolved** event: a restore
   cannot mistake an incomplete state for an authorized resurrection.
   This is a proposed cross-provider protocol, NOT implemented.
3. **Completeness and freshness proof:** independent authoritative record
   stream with verified sequence/checkpoint continuity through a watermark
   newer than the snapshot and through the release decision. Empty/no-events
   cannot be inferred from an unreachable store. A caller-supplied JSON array,
   even if it contains all locally known UUIDs, is NOT proof of completeness.
   Missing, stale, tampered, divergent, duplicate or otherwise uncertain
   custody => HOLD, not a best-effort restore.
4. **Reconciliation and quarantine:** keep all restored/private endpoints,
   inbound requests, model sends, workers, cron/webhooks and message reads
   unavailable throughout recovery. Verify exact snapshot/source and trusted
   ledger; reapply authoritative deleted-scope tombstones and purge matching
   saved turns plus claims *before* serving anything; independently count/read
   back every affected scope, unrelated scope, and owner grants; quarantine
   any unresolved claim. Do not equate restoring original SQL triggers with
   restoring a later external deletion record.
5. **Rollback and retention:** a failed migration rolls back by preserving
   the original intact system, NOT by publishing an older pre-deletion
   snapshot. Do not undo an explicitly requested user deletion. Maintain the
   deletion record as needed to fence EVERY still-restorable copy, even as
   encrypted Grove-managed snapshots independently expire within the
   owner-approved maximum of 30 elapsed days. Real provider encryption,
   erasure confirmation, access review, key rotation and rollback evidence
   require separate approval.

**Important hosting hazard:** Supabase documents that cloning/restoring a
physical project backup can re-activate restored `pg_cron`, `pg_net`,
webhooks or wrappers as soon as the clone comes online; a separate project
alone does not guarantee a safely silent quarantine. Do **not** run a binary
clone or point-in-time restore for this test. Require an explicitly isolated,
automation-disabled recovery environment or a reviewed logical restore
procedure before any future approved rehearsal. Official reference:
https://supabase.com/docs/guides/platform/clone-project

Supabase also documents that PITR is an independently billed add-on and is
not covered by its Spend Cap; **do not turn it on** in order to resolve this
design review. https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery

### Gate resolution

| Condition | Source-only state |
| --- | --- |
| Synthetic two-session user deletion / scoped backup replay | Proven offline |
| Deliberate missing-tombstone full-snapshot resurrection risk | Proven UNSAFE offline |
| New quarantined reapplication + rollback rehearsal | Needs exact-head CI receipt |
| Independent signed/deletion-ledger custody | NOT BUILT / HOLD |
| Provider 30-day encrypted snapshot enforcement and erasure | NOT VERIFIED / HOLD |
| Actual no-automation isolated full restore and current owner readback | NOT RUN / HOLD |
| Grove deployed transcript migrations, authorized phone and runtime | NOT RUN / HOLD |

No SQL fixture here should ever be pointed at the actual Grove, Firefly, ARK
or other Supabase project. The original 97-task master classifications stay
unchanged. No new task IDs or live release authority.


## Runtime deletion custody seam — source-only blocker (2026-10-11)

The existing verified Grove owner-delete broker now calls
`reserveIndependentGroveDeletion` **before** any transactional deletion RPC
and `confirmIndependentGroveDeletion` **after** database confirmation but
**before** sending a successful HTTP response. This is not a second database,
backup engine, deletion engine or independently durable provider: the newly
defined `apps/backend/lib/grove/privateDeletionCustody.ts` is a **server-only
unimplemented adapter** and deliberately throws the existing broker's
`grove_private_delete_custody_unavailable` fail-closed error at both steps.

As a result even mistakenly enabling
`GROVE_PRIVATE_CONVERSATION_DELETE_ENABLED=true` cannot silently claim that
an old physical snapshot will respect a deletion: no actual deletion RPC is
invoked until approved external intent storage and independent integrity
verification exist. This also means the user-facing Delete action **cannot
succeed yet**, even for its verified owner: this is an intentional release
hold, not completed deletion functionality. Successful future implementation
must record a durable owner-and-scope-bound intent, preserve uncertain intents,
run the fenced SQL transaction, and independently persist/verify a committed
deletion watermark before the route acknowledges success. A falsely reassuring
in-memory receipt, a new environment variable, or a write in the same Grove
database cannot satisfy the contract. Current tests prove this negative gate,
not a live independent custody service.

The source-only JSON metadata preflights and synthetic PostgreSQL restore
tests remain separate, cannot provision this adapter, and grant **no** live
backup, migration, delete, deployment, mobile installation or paid inference
permission. The original 97-task master and Grove source/host acceptance
statuses remain unchanged.
