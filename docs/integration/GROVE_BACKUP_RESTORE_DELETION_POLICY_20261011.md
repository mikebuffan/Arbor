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
2. Separately approve exact-schema migration and owner-private backup policy,
   including whether encrypted backup copies may temporarily retain deleted
   text and what their retention/deletion period is.
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
explicit user deletion. Backup copy retention duration has NOT been chosen.
Before any real restore, owner must approve a retention/erasure policy and an
independent, integrity-verified deletion-state custody/replay and quarantine
procedure that protects against an older database snapshot.

This tool cannot issue restoration approval and changes no real Supabase
database, storage policy, existing chat, model, worker, Vercel project, or
phone installation. No actual user deletion evidence exists in current
Grove production tables; proposed transcript/tombstone tables are not live.
