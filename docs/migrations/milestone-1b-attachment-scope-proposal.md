# Milestone 1B attachment-scope proposal

Status: **application broker implemented locally; policy proposal not applied**.
Applying either SQL file is a separate human approval gate. The 2026-08-08
catalog snapshot is historical evidence only; it must not be assumed to control
at execution time.

## Catalog finding

The 2026-08-08 read-only Firefly catalog check found strict-looking policies
and older user-prefix-only policies on `storage.objects`. Because the policies
are permissive, PostgreSQL OR-combines them and the broad policies win. The
metadata INSERT policy likewise validates only `user_id` and a user path
prefix. A same-user request can therefore reach an attachment in another one
of that user's projects, and a user can insert metadata naming a foreign
project or conversation.

The historical approved-object INSERT policy also requires status `pending`,
while the live status constraint observed during preflight permits `uploading`,
`uploaded`, `failed`, or `deleted`. No active canonical upload-intent/complete
API or Flutter attachment caller currently exists.

## Affected objects and resulting direct posture

- Drop the four current authenticated policies on `public.chat_attachments`.
- Create one authenticated scoped SELECT policy on `public.chat_attachments`
  for request-scoped broker authorization.
- Do not create authenticated metadata INSERT, UPDATE, or DELETE policies.
- Drop the eight current attachment policies on `storage.objects`.
- Do not create authenticated Storage INSERT, SELECT, UPDATE, or DELETE
  policies for bucket `chat-attachments`.
- Change no tables, columns, constraints, indexes, functions, triggers, RPCs,
  grants, buckets, or data.
- Change no policy for another Storage bucket or future user-global resource.

The resulting direct authenticated Storage posture for `chat-attachments` is
deny-by-default. Brokered signed reads and deletes remain possible through the
server-only privileged client after request-scoped authorization.

## Attachment upload lifecycle

Status: **Deferred / unavailable**.

Reason: no active canonical upload-intent/complete API or Flutter attachment
caller currently exists.

Security behavior: direct authenticated attachment Storage upload and metadata
creation are denied until the complete scoped upload lifecycle is separately
designed, implemented, tested, and approved. Historical attachment code is
reference material only and must not be revived unchanged.

Future upload work must deliberately define server-created upload intent,
canonical project/conversation scope, `uploading` state, expiration, MIME and
size constraints, Storage insertion authorization, completion verification,
transition to `uploaded`, retry and abandonment handling, cleanup behavior,
and Flutter integration. That work is outside Milestone 1B.

## Broker contract and consistency model

The application boundary uses these explicit authenticated contracts:

- `POST /api/chat/attachments/access` with required UUID `attachmentId`,
  `projectId`, and `conversationId`. It returns a private signed URL valid for
  60 seconds plus its expiry time, with `Cache-Control: no-store`.
- `POST /api/chat/attachments/delete` with the same required scope and an
  optional reason of at most 240 characters.

Both routes derive the user from `auth.getUser()`. The request-scoped client
validates project ownership, conversation ownership and project membership,
attachment metadata scope, the fixed bucket, and the exact canonical path
before any privileged operation. All scope failures use the non-enumerating
`attachment_not_found` response.

The signed URL is returned only from a successful access request. It is not
persisted, logged, placed in telemetry, or accompanied by the bucket or
canonical path.

Delete is a bounded two-system operation. The server-only privileged Storage
client checks existence, removes the object when present, and verifies absence.
Only after full authorization and verified Storage absence does the same
server-only privileged client soft-delete metadata. That update is constrained
by attachment ID, authenticated user ID, project ID, conversation ID, bucket,
canonical path, expected prior status, and `deleted_at is null`, with an exact
affected-row count of one. No generalized privileged metadata writer exists.

A Storage failure leaves metadata active. A metadata failure after verified
Storage removal returns `server_error`; retry observes the absent object and
retries the exact metadata soft-delete. An already absent object is a
recoverable partial state. Once metadata is durably soft-deleted, a repeated
delete returns the approved non-enumerating 404 because scoped SELECT hides the
deleted row. Partial-failure logs contain only allowlisted operation and stage
labels.

## Before and after authorization

| Scenario | Before | After Milestone 1B |
| --- | --- | --- |
| Correctly scoped broker read | Broker available; broad direct policies also exist | Allowed through scoped metadata SELECT and signed URL |
| Wrong-project broker read | Broker denies | Denied |
| Wrong-conversation broker read | Broker denies | Denied |
| Foreign-user broker read | Broker denies | Denied |
| Correctly scoped broker delete | Broker available; metadata UPDATE currently needs user policy | Allowed through scoped validation plus bounded privileged mutations |
| Wrong-project or foreign broker delete | Broker denies | Denied |
| Same-user cross-project direct Storage read | Allowed by broad user-prefix policy | Denied |
| Same-user cross-project direct Storage delete | Allowed by broad user-prefix policy | Denied |
| Direct authenticated Storage read | Allowed under current policies | Denied |
| Direct authenticated Storage update | Allowed under current policies | Denied |
| Direct authenticated Storage delete | Allowed under current policies | Denied |
| Direct authenticated Storage upload | Allowed by broad user-prefix INSERT | Denied |
| Direct authenticated metadata INSERT | Allowed with spoofable project/conversation scope | Denied |
| Direct authenticated metadata UPDATE | Allowed for an owned active row | Denied |
| Direct authenticated metadata DELETE | Allowed for an owned row | Denied |
| Scoped authenticated metadata SELECT used by broker | Allowed by current own-metadata policy | Allowed by the single scoped SELECT policy |

## Security and Companion Impact

Security impact: closes permissive-policy bypass, foreign metadata spoofing,
cross-conversation binding, direct same-user cross-project object access, and
direct authenticated attachment writes. The service-role credential remains
server-only and is invoked only after request-scoped proof. Removing policies
does not remove underlying table grants, but RLS denies operations for which no
applicable policy exists.

Companion Impact: downloads and deletes must use the scoped server broker.
Callers must supply attachment, project, and conversation UUIDs. Attachment
upload and metadata creation are unavailable. No active Flutter caller is
broken because none exists, and no Flutter code is changed. No persona,
behavioral, memory, telemetry, heartbeat, or Cron behavior changes.

## Real Firefly verification plan

Immediately before any later execution, capture the exact live policy names
and expressions, permissive/restrictive state, RLS and FORCE RLS state,
relevant grants, and bucket configuration. Reconcile both forward and rollback
SQL to that fresh capture before applying anything.

On an isolated Supabase branch or after separate production approval:

1. Apply the reviewed forward transaction.
2. Confirm the only authenticated attachment metadata policy is scoped SELECT.
3. Confirm no authenticated `chat-attachments` Storage policy remains.
4. With two synthetic users and two projects for User A, prove scoped metadata
   SELECT and broker read/delete succeed only for the correct scope.
5. Prove wrong-project, wrong-conversation, foreign-user, and noncanonical-path
   broker requests fail non-enumeratingly before privileged access.
6. Prove direct authenticated metadata INSERT, UPDATE, and DELETE fail.
7. Prove direct authenticated Storage INSERT, SELECT, UPDATE, and DELETE fail,
   including same-user cross-project attempts.
8. Prove Storage-removal and metadata-soft-delete partial failures converge on
   retry without false success or raw diagnostics.
9. Confirm signed URLs, paths, credentials, private content, and raw provider
   errors are absent from logs and telemetry.
10. Check Supabase security/performance advisors and Storage logs.

## Recovery

If verification fails, stop attachment traffic, allow issued 60-second signed
URLs to expire, and restore policies from the fresh pre-apply capture. The
checked-in rollback file represents the 2026-08-08 snapshot only and must be
updated for any detected drift before use. Remove synthetic Storage objects
through the Storage API, verify absence, then remove synthetic metadata. Re-run
the complete matrix and confirm the restored policy definitions exactly.
