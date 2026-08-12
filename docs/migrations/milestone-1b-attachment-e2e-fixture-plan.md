# Milestone 1B attachment post-migration E2E fixture plan

Status: **prepared, not executed**. Migration execution, fixture creation, and
real Firefly E2E remain separate approval gates.

## Fixture boundary

Fixtures may be created only by a one-shot server/admin test runner under
`apps/backend/scripts/e2e`; never by an application route, Flutter, browser
code, or a reusable production writer. The runner must not be imported by the
Next.js application and must refuse to run unless all of these checks pass:

- an explicit fixture-mode flag is set;
- the target project reference is the allowlisted Firefly reference;
- every user, project, and conversation belongs to the dedicated E2E set;
- the run ID matches `^ARBOR_E2E_[A-Z0-9_]+$` and has not been used before;
- every bucket is exactly `chat-attachments`; and
- every path is canonical:
  `<userId>/<projectId>/<conversationId>/<attachmentId>/<filename>`.

The service-role credential stays in the runner's server environment. It must
never be printed, returned, written to the manifest, or introduced into
application code. The runner exposes only fixed create, audit, and cleanup
operations for manifest-listed fixture IDs and paths.

## Run identity and manifest

Generate a unique ID such as
`ARBOR_E2E_20260812T120000Z_7F3A9C2D`. Use it in every synthetic filename and
human-readable fixture label. Create the manifest before the first mutation
and durably update it after every step.

The manifest records:

- schema version, run ID, target project reference, start/end timestamps, and
  current phase;
- dedicated E2E user, project, and conversation IDs;
- each attachment ID, purpose, bucket, exact canonical path, expected status,
  and harmless-content SHA-256;
- whether each metadata row and Storage object was created, observed, broker
  deleted, and cleanup deleted;
- whether any parent resource was created by this run; and
- redacted failure stages and retry counts.

The manifest must never contain access tokens, service credentials, signed
URLs, private content, raw provider/Supabase errors, or unrelated identifiers.

## Synthetic fixture set

Use harmless UTF-8 text containing only `ARBOR E2E synthetic attachment` plus
the run ID. Use UUIDs for attachment IDs, `message_id = null`, bucket
`chat-attachments`, `deleted_at = null`, and `status = 'uploaded'` wherever a
broker read is expected.

Create only these manifest-tracked fixtures:

1. User A / Project A1 / Conversation A1 read fixture, with metadata and object.
2. User A / Project A1 / Conversation A1 delete fixture, with metadata and object.
3. User A / Project A2 / Conversation A2 cross-project fixture, with metadata
   and object.
4. User B / Project B1 / Conversation B1 foreign-user fixture, with metadata
   and object.
5. User A / Project A1 / Conversation A1 recovery fixture, with uploaded
   metadata but an intentionally absent object, representing a recoverable
   partial deletion.

The fixture runner first verifies ownership of every dedicated parent, then
uploads each required object and inserts only the matching metadata row. It
must fail before mutation if any user/project/conversation/path component
disagrees. It must not create deliberately spoofed metadata; spoofing is tested
through denied authenticated requests.

## Immediate post-migration verification

Run in this order and record each result in the manifest/evidence report:

1. Re-capture grants, policies, RLS/FORCE RLS, owner, column ACLs, and bucket
   configuration. Confirm the approved after-state before creating fixtures.
2. As `anon`, prove metadata SELECT and all metadata writes fail.
3. As User A, prove scoped metadata SELECT returns only the A1 row; wrong
   project, wrong conversation, Project A2 substitution, and User B resources
   return no row.
4. As User A, prove metadata INSERT, UPDATE, and DELETE fail, including attempts
   to name Project A2 and User B's project/conversation.
5. Through the authenticated Storage client, prove INSERT, SELECT/download,
   UPDATE/upsert, and DELETE fail. Repeat read/delete against the A2 object as
   User A scoped to A1 and against the User B object.
6. Call the approved access broker for the A1 read fixture. Confirm success,
   short expiry, exact harmless content, `Cache-Control: no-store`, and absence
   of bucket/path information from the response. Never persist the signed URL.
7. Call the delete broker for the A1 delete fixture. Confirm verified object
   absence and the exact bounded metadata soft-delete.
8. Call delete for the recovery fixture whose object is already absent. Confirm
   it reaches the durable soft-deleted state. Repeat the request and confirm the
   approved non-enumerating terminal response.
9. Re-run the permanent mocked partial-failure regressions for Storage failure,
   Storage-success/metadata-failure, retry convergence, and repeated delete.
10. Run the service-role boundary and sensitive-logging scans. Inspect the E2E
    runtime logs for credentials, tokens, signed URLs, paths, content, and raw
    errors; all must be absent.

Any unexpected allow, false success, manifest mismatch, or cleanup failure is
a failed migration verification. Stop rather than modifying policy or runtime
code in place.

## Cleanup and recovery

Cleanup runs from a `finally` path and operates only from the manifest:

1. Validate the run-ID format, Firefly project reference, dedicated E2E parent
   IDs, bucket, and every canonical path again.
2. Remove each still-present object by its exact manifest path using the
   one-shot admin runner; verify each object is absent.
3. Hard-delete each synthetic metadata row using the conjunction of attachment,
   user, project, conversation, bucket, and path from the manifest; this also
   removes rows previously soft-deleted by the broker.
4. Remove only parent resources explicitly marked `createdByRun`, in child-first
   order. Never delete persistent dedicated E2E users/projects.
5. Prove no manifest attachment ID remains in `public.chat_attachments`, no
   manifest object remains in Storage, and the live baseline returns to zero
   attachment rows and zero bucket objects.
6. Mark the manifest cleaned only after all absence checks pass. Retain the
   redacted manifest and verification report as evidence.

If cleanup does not converge, do not broaden the runner or delete by prefix.
Quarantine the exact manifest, report the bounded residue, and stop for human
recovery. If migration verification fails after cleanup, allow any 60-second
signed URL to expire and use the separately approved exact rollback package.
