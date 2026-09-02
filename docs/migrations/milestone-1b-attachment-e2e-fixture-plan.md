# Milestone 1B attachment migration E2E procedure

Status: **prepared, not executed**. Migration execution, fixture creation,
administrative cleanup, and real Firefly E2E remain separately gated.

## Migration-history stop gate

The repository-root `supabase/migrations/` directory is now the approved
canonical migration ledger. The locally verified ordered chain is the Firefly
public baseline, the eight-policy attachment Storage baseline, and
`supabase/migrations/20260823175543_milestone_1b_attachment_scope.sql`.
The executable Milestone file is byte-identical to the approved proposal.

Firefly still has no `supabase_migrations` history schema/table. The exact future
history-bootstrap procedure is documented in
`docs/migrations/firefly-migration-canon-bootstrap.md`. Migration-history repair,
forward migration execution, fixture creation, and real-service E2E remain
separately gated. The superseded historical direct-upload migration must not be
revived.

## Fixture authority boundary

Pre-seeding may use a one-shot server/admin test runner only while the captured
pre-migration grants remain in force. It may never be exposed as an application
route, Flutter/browser API, reusable production writer, RPC, or database
function. It must refuse to run unless:

- an explicit fixture-mode flag is set;
- the target is the allowlisted Firefly project;
- every user, project, and conversation belongs to the dedicated E2E set;
- the unique run ID matches `^ARBOR_E2E_[A-Z0-9_]+$`;
- the pre-run attachment metadata and bucket baselines are both zero;
- every bucket is exactly `chat-attachments`; and
- every path is exactly canonical:
  `<userId>/<projectId>/<conversationId>/<attachmentId>/<filename>`.

The pre-seed runner's server credential must never be printed, returned,
written to the manifest, or added to application code. Its create capability
ends before the forward transaction begins. After migration, `service_role`
has only `SELECT, UPDATE` on `public.chat_attachments`; neither fixture creation
nor final metadata hard deletion may rely on it.

## Run identity and manifest

Generate a unique identifier such as
`ARBOR_E2E_20260812T120000Z_7F3A9C2D`. Include it in every synthetic filename
and fixture label. Create the manifest before the first mutation and durably
update it after every phase.

The manifest records:

- schema version, run ID, Firefly project reference, timestamps, and phase;
- dedicated E2E user, project, and conversation IDs;
- each attachment ID, purpose, bucket, exact path, status, and harmless-content
  SHA-256;
- whether each metadata row and object was created, preflight-verified, broker
  deleted, Storage-cleaned, and database-cleaned;
- the exact expected metadata and Storage counts; and
- redacted failure stages and retry counts.

It must never contain access tokens, service credentials, signed URLs, private
content, raw provider/Supabase errors, or unrelated identifiers.

## Pre-seeded fixture set

Use harmless UTF-8 text containing only `ARBOR E2E synthetic attachment` plus
the run ID. Use UUID attachment IDs, `message_id = null`, bucket
`chat-attachments`, canonical paths, `deleted_at = null`, and status `uploaded`.

Create exactly five manifest-tracked metadata rows before migration:

1. User A / Project A1 / Conversation A1 valid-read fixture, with object.
2. User A / Project A1 / Conversation A1 valid-delete fixture, with object.
3. User A / Project A2 / Conversation A2 same-user/cross-project fixture, with
   object.
4. User B / Project B1 / Conversation B1 foreign-user fixture, with object.
5. User A / Project A1 / Conversation A1 partial-delete recovery fixture, with
   intentionally absent object.

Expected pre-migration seeded state is exactly five metadata rows and four
objects. Deliberately spoofed metadata is not seeded; spoofing is tested through
denied authenticated requests after migration.

## Pre-seed → migrate → verify

Run in this strict order:

1. Perform the final exact live catalog capture. Confirm it matches the accepted
   owner, RLS/FORCE RLS, grants including MAINTAIN, policies, column ACLs, bucket
   configuration, and zero-row/zero-object baseline.
2. Create the manifest and validate all dedicated parent ownership and project/
   conversation relationships before mutation.
3. Upload the four harmless objects through the bounded pre-seed runner, then
   insert the five exact matching metadata rows under the still-current
   pre-migration authority.
4. Re-read every metadata row by its exact attachment/user/project/conversation/
   bucket/path tuple. Verify every object by its exact manifest path and content
   hash; verify the recovery object's exact path is absent. Confirm the entire
   table/bucket state is exactly five rows/four objects and contains nothing
   outside the manifest.
5. Freeze the manifest. Disable/terminate its create phase. Any mismatch stops
   before migration and triggers manifest-bound cleanup under the old state.
6. After the separate execution and migration-history gates are approved, apply
   the byte-approved forward SQL as one transaction.
7. Before behavioral tests, re-capture the database boundary and prove: owner
   `postgres`; RLS enabled; FORCE RLS false; no PUBLIC/column ACL; only the
   scoped authenticated metadata SELECT policy; no attachment Storage policy;
   `anon` none; `authenticated` SELECT; `service_role` SELECT and UPDATE; bucket
   unchanged; and the exact five-row/four-object fixture state preserved.
8. As `anon`, prove metadata SELECT and all metadata writes are denied. For
   writes, snapshot the exact target tuple first and re-read it afterward; an
   SDK/API error envelope alone is not the authorization oracle.
9. As User A, prove scoped metadata SELECT returns only the correct A1 fixtures;
   wrong project, wrong conversation, A2 substitution, and User B resources are
   denied.
10. As User A, prove metadata INSERT, UPDATE, and DELETE are denied, including
    foreign project/conversation spoofing attempts. Verify the attempted INSERT
    created no row and that the exact UPDATE/DELETE targets remain byte-for-byte
    unchanged after each call, even if the client returns an empty success
    envelope.
11. Through the authenticated Storage client, prove INSERT, SELECT/download,
    UPDATE/upsert, and DELETE are denied. Repeat read/delete attempts against
    the A2 and User B objects. For INSERT, prove the attempted object is absent;
    for UPDATE and DELETE, hash or otherwise verify the exact original object is
    still present and unchanged. In particular, an empty/success DELETE envelope
    plus a still-present object confirms authorization denial; object absence
    means deletion occurred and fails the test.
12. Call the signed-read broker for the valid-read fixture. Confirm the exact
    harmless content, short expiry, `Cache-Control: no-store`, and no bucket/path
    disclosure. Never log or persist the signed URL.
13. Call the delete broker for the valid-delete fixture. Confirm verified object
    absence and the exact bounded metadata soft-delete.
14. Call delete for the recovery fixture whose object was pre-seeded absent.
    Confirm convergence to a durable soft-delete; retry and confirm the approved
    non-enumerating terminal response.
15. Re-run permanent partial-failure tests for Storage failure, Storage-success/
    metadata-failure, retry convergence, and repeated delete.
16. Run the service-role boundary and sensitive-logging scans and inspect E2E
    logs. Credentials, tokens, signed URLs, paths, content, and raw errors must
    be absent.

Any unexpected allow, false success, boundary drift, or manifest mismatch fails
verification. Do not change grants or runtime code in place.

### Mutation-denial oracle

Denied mutation tests use durable post-operation state as their primary oracle.
HTTP status, SDK `error`, and returned row/object arrays are recorded as
diagnostic envelope evidence only. A test passes only when exact manifest-bound
state proves that no unauthorized row or object was created, changed, or
removed. This rule applies to metadata and Storage mutation attempts and avoids
misclassifying PostgREST or Storage zero-row success envelopes as authorization
escapes.

## Post-test Storage cleanup

From a `finally` path, validate the manifest and Firefly target again. Use the
server-only Storage API to remove only still-present objects at their exact four
manifest paths, then verify all five manifest paths (including the intentionally
absent one) are absent. Never delete by bucket prefix.

## Exact administrative metadata cleanup

Because the hardened `service_role` lacks DELETE, metadata cleanup is a
separate, explicitly approved database-owner operation executed through the SQL
Editor or an equivalently bounded owner connection. It is not application code,
a service-role request, a permanent function/RPC, a temporary grant, or an API.

Generate the five `VALUES` rows below directly from the frozen manifest. Review
the rendered SQL against that manifest before execution. The anonymous `DO`
block is transaction-local and creates no database function. All tuple fields
must match; a count mismatch raises and rolls the transaction back.

```sql
begin;

create temporary table arbor_e2e_attachment_cleanup_targets (
  run_id text not null check (run_id ~ '^ARBOR_E2E_[A-Z0-9_]+$'),
  attachment_id uuid primary key,
  user_id uuid not null,
  project_id uuid not null,
  conversation_id uuid not null,
  storage_bucket text not null check (storage_bucket = 'chat-attachments'),
  storage_path text not null unique
) on commit drop;

insert into arbor_e2e_attachment_cleanup_targets (
  run_id, attachment_id, user_id, project_id, conversation_id,
  storage_bucket, storage_path
)
values
  ('<ARBOR_E2E_RUN_ID>', '<READ_ATTACHMENT_UUID>', '<USER_A_UUID>',
   '<PROJECT_A1_UUID>', '<CONVERSATION_A1_UUID>', 'chat-attachments',
   '<EXACT_READ_CANONICAL_PATH>'),
  ('<ARBOR_E2E_RUN_ID>', '<DELETE_ATTACHMENT_UUID>', '<USER_A_UUID>',
   '<PROJECT_A1_UUID>', '<CONVERSATION_A1_UUID>', 'chat-attachments',
   '<EXACT_DELETE_CANONICAL_PATH>'),
  ('<ARBOR_E2E_RUN_ID>', '<CROSS_PROJECT_ATTACHMENT_UUID>', '<USER_A_UUID>',
   '<PROJECT_A2_UUID>', '<CONVERSATION_A2_UUID>', 'chat-attachments',
   '<EXACT_CROSS_PROJECT_CANONICAL_PATH>'),
  ('<ARBOR_E2E_RUN_ID>', '<FOREIGN_ATTACHMENT_UUID>', '<USER_B_UUID>',
   '<PROJECT_B1_UUID>', '<CONVERSATION_B1_UUID>', 'chat-attachments',
   '<EXACT_FOREIGN_CANONICAL_PATH>'),
  ('<ARBOR_E2E_RUN_ID>', '<RECOVERY_ATTACHMENT_UUID>', '<USER_A_UUID>',
   '<PROJECT_A1_UUID>', '<CONVERSATION_A1_UUID>', 'chat-attachments',
   '<EXACT_RECOVERY_CANONICAL_PATH>');

create temporary table arbor_e2e_attachment_deleted_ids (
  attachment_id uuid primary key
) on commit drop;

do $arbor_e2e_cleanup$
declare
  expected_count integer;
  matched_count integer;
  deleted_count integer;
begin
  select count(*) into expected_count
  from pg_temp.arbor_e2e_attachment_cleanup_targets;

  if expected_count <> 5
     or (select count(distinct run_id)
         from pg_temp.arbor_e2e_attachment_cleanup_targets) <> 1 then
    raise exception 'ARBOR E2E cleanup manifest cardinality mismatch';
  end if;

  if exists (
    select 1
    from pg_temp.arbor_e2e_attachment_cleanup_targets t
    where t.storage_path not like (
      t.user_id::text || '/' || t.project_id::text || '/' ||
      t.conversation_id::text || '/' || t.attachment_id::text || '/%'
    )
    or position(t.run_id in t.storage_path) = 0
  ) then
    raise exception 'ARBOR E2E cleanup target path mismatch';
  end if;

  select count(*) into matched_count
  from public.chat_attachments a
  join pg_temp.arbor_e2e_attachment_cleanup_targets t
    on a.id = t.attachment_id
   and a.user_id = t.user_id
   and a.project_id = t.project_id
   and a.conversation_id = t.conversation_id
   and a.storage_bucket = t.storage_bucket
   and a.storage_path = t.storage_path;

  if matched_count <> expected_count then
    raise exception 'ARBOR E2E cleanup pre-delete row mismatch';
  end if;

  with deleted as (
    delete from public.chat_attachments a
    using pg_temp.arbor_e2e_attachment_cleanup_targets t
    where a.id = t.attachment_id
      and a.user_id = t.user_id
      and a.project_id = t.project_id
      and a.conversation_id = t.conversation_id
      and a.storage_bucket = t.storage_bucket
      and a.storage_path = t.storage_path
    returning a.id
  )
  insert into pg_temp.arbor_e2e_attachment_deleted_ids (attachment_id)
  select id from deleted;

  get diagnostics deleted_count = row_count;
  if deleted_count <> expected_count then
    raise exception 'ARBOR E2E cleanup affected-row mismatch';
  end if;

  if exists (
    select 1
    from public.chat_attachments a
    join pg_temp.arbor_e2e_attachment_cleanup_targets t on a.id = t.attachment_id
  ) then
    raise exception 'ARBOR E2E cleanup residue remains';
  end if;
end
$arbor_e2e_cleanup$;

select attachment_id
from pg_temp.arbor_e2e_attachment_deleted_ids
order by attachment_id;

commit;
```

The returned IDs must equal the five manifest IDs. Then independently verify
the whole attachment table and bucket returned to their captured zero baselines.
Do not delete E2E parent resources unless the frozen manifest says this run
created them; any such cleanup requires separate exact-ID operations.

If cleanup does not converge, do not broaden predicates, grant DELETE, add an
RPC, or delete by prefix. Preserve the frozen manifest, report exact bounded
residue, and stop for human recovery.

## Conditional rollback policy

An E2E failure does not automatically authorize rollback. Keep the tightened
migration in place by default when the transaction committed correctly, the
catalog matches the approved after-state, the failure is confined to broker or
application behavior, and no unrelated active path is affected. In that case:

- mark attachment operations unavailable/fail-closed;
- clean the exact synthetic fixtures;
- preserve the redacted manifest and bounded evidence; and
- correct the application defect under a separate approval gate.

Consider the exact rollback only if the migration produced incorrect grant or
policy state, caused effects outside the attachment boundary, affected database
integrity, or explicit human review concludes rollback is safer than retaining
the hardened state. Rollback always requires an explicit human decision unless
an emergency database-integrity event makes immediate recovery necessary.
