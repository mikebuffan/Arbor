# Grove private conversation retention — approved policy, source proposal only
Date: October 10, 2026

## Recorded owner preference

The owner approved these **policy goals** in conversation:
- Preserve Grove private conversations across closing and reopening the app until the owner deliberately chooses to delete them.
- Preserve corrections and continuity as separately scoped, authorized durable records; do not treat model prose or an archived chat as an execution receipt.
- Immediately deny retrieval, model dispatch and writes once owner, bridge, project or conversation access is revoked.
- **Soft revocation is not deletion.** The stored conversation must remain intact while inaccessible to the revoked identity.
- No automatic purge, sharing or deletion of private conversations as an unintended consequence of an access/grant change.

This approval covers *the policy and source preparation*. It does **not** authorize running a real database migration, opening a private host, deploying a phone app, changing grants, selecting a paid model, or accessing private content.

## Proposed source enforcement

- Both proposed tables remain Grove-only, fail-closed, RLS-enabled; browser `anon` and `authenticated` roles cannot read or directly write transcripts/claims.
- Complete transcripts keep an FK to the verified Grove owner and project grant, but use **ON DELETE RESTRICT**. This prevents an administrator accidentally hard-deleting access records and cascading away saved conversations.
- Pending claim/lease hashes remain `ON DELETE CASCADE` so an **approved explicit hard deletion** can clear abandoned pending operations after completed transcripts have been deliberately purged. A soft revoked_at update deletes neither transcripts nor claims but blocks RPC claim/complete and the server's reauthorization checks.
- For a genuine account deletion, the responsible authenticated deletion operation must deliberately delete the transcript before deleting the referenced owner/grants. Do not interpret user login loss, ordinary sign-out, or a revoked project grant as permission to erase data.
- No retention timer or data-export/delete UI exists in this proposal. Do not claim owner self-service deletion is available until separately implemented and tested.
- An account deletion or applicable legal retention/deletion obligation may require different handling; design the explicit, authenticated delete and backup-retention behavior before live enablement. Backup removal may not be immediate.

## Offline acceptance / migration gate

The existing disposable PostgreSQL fixture now tests a live-shaped synthetic completed pair: soft revoke must preserve it; a new model claim must return no_access; a hard grant delete must be rejected while saved history exists; and only a **synthetic explicitly sequenced purge** may delete records and then remove the grant. The fixture also retains its prior stale-lease, forged claim, replay and privilege gates.

**Do not run these SQL files on any hosted project.** The dedicated Grove Supabase project `fqjqpuaoifgbweiguacf` has not installed private transcript or claim tables/RPCs. Before migration: have an owner-approved account-deletion policy and backup/restore plan; security-review RLS, function exposure, retention and rollback; recheck the actual schema; obtain explicit approval for the hosted schema changes; then re-run disposable and live acceptance separately.

Canonical parent: [One Arbor / Grove review #444](https://github.com/mikebuffan/Arbor/pull/444). The 97-task and 82-task inventories are unchanged.
