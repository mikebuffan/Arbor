# Milestone 1B attachment-scope proposal

Status: **application broker implemented locally; policy proposal not applied**.
Applying either SQL file is a separate human approval gate. A fresh Firefly
catalog capture was independently reviewed on 2026-08-12 and converted into
the exact checked-in pre-apply rollback package.

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

The fresh pre-execution capture confirms owner `postgres`, RLS enabled, FORCE
RLS false, no `PUBLIC` table ACL, no explicit column ACL, no effective
parent-role bypass, no database function or custom trigger referencing the
table, and exact agreement with the preflight policy definitions. The table
and bucket are empty. The private `chat-attachments` bucket remains limited to
10 MiB with the captured MIME allowlist.

PostgreSQL 17 adds the table privilege `MAINTAIN`. The live ACL grants DELETE,
INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, and UPDATE directly to
each of `anon`, `authenticated`, and `service_role`. The forward `REVOKE ALL
PRIVILEGES` already removes all eight privileges, including MAINTAIN, before
the narrower grants are applied. No forward-SQL change is required.

## Affected objects and resulting direct posture

- Drop the four current authenticated policies on `public.chat_attachments`.
- Create one authenticated scoped SELECT policy on `public.chat_attachments`
  for request-scoped broker authorization.
- Do not create authenticated metadata INSERT, UPDATE, or DELETE policies.
- Revoke all table privileges on `public.chat_attachments` from `anon`,
  `authenticated`, and `service_role`, then grant only `SELECT` to
  `authenticated` and `SELECT, UPDATE` to `service_role`.
- Drop the eight current attachment policies on `storage.objects`.
- Do not create authenticated Storage INSERT, SELECT, UPDATE, or DELETE
  policies for bucket `chat-attachments`.
- Change no tables, columns, constraints, indexes, functions, triggers, RPCs,
  buckets, or data. Change no owner/database-role privilege.
- Change no grant on `storage.objects` or `storage.buckets`.
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

## Grant posture and dependency audit

The active repository contains exactly two `chat_attachments` Data API call
sites. `lib/attachments/scope.ts` performs a request-scoped authenticated
`SELECT` after independently proving project and conversation ownership.
`lib/attachments/broker.ts` performs the bounded metadata soft-delete with the
server-only service-role client after that proof and verified Storage absence.
The latter needs table `UPDATE` plus `SELECT` for its constrained predicates.

No active Flutter/browser/anonymous caller reads or writes
`chat_attachments`. No active client needs authenticated metadata INSERT,
UPDATE, or DELETE. No repository SQL function, RPC, SECURITY DEFINER/INVOKER
function, or authenticated database function references the table. Historical
attachment upload/intent/complete code is not active in this repository.

The intended resulting grants are:

| Role | `public.chat_attachments` table privileges |
| --- | --- |
| `anon` | none |
| `authenticated` | `SELECT` only |
| `service_role` | `SELECT, UPDATE` only |
| owner/database-owner roles | unchanged |

The forward transaction resets only the three named application roles before
regranting this exact matrix. The fresh capture proves that `PUBLIC`, role
membership, column grants, and other grantees do not provide an effective
bypass.

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
| Anonymous metadata SELECT or write | Broad grant exists but RLS currently denies | Denied by no table privilege and no policy |
| Broker metadata soft-delete | Service role has broad table privileges | Allowed with only service-role `SELECT, UPDATE` after scoped proof |

## Security and Companion Impact

Security impact: closes permissive-policy bypass, foreign metadata spoofing,
cross-conversation binding, direct same-user cross-project object access, and
direct authenticated attachment writes. It also removes whole-table and
write privileges that RLS alone does not constrain. The service-role credential
remains server-only and is invoked only after request-scoped proof; its metadata
authority is reduced to `SELECT, UPDATE` on this table.

Companion Impact: downloads and deletes must use the scoped server broker.
Callers must supply attachment, project, and conversation UUIDs. Attachment
upload and metadata creation are unavailable. No active Flutter caller is
broken because none exists, and no Flutter code is changed. No persona,
behavioral, memory, telemetry, heartbeat, or Cron behavior changes.

## Real Firefly verification plan

Immediately before any later execution, confirm the approved fresh capture has
not drifted. The detailed synthetic fixture, verification, and cleanup runbook
is `docs/migrations/milestone-1b-attachment-e2e-fixture-plan.md`. Its bounded
server/admin pre-seed runner is a test-only tool and is not an application API.
All attachment fixtures are created and manifest-verified before migration;
post-migration service-role authority is never used for metadata INSERT or
hard DELETE.

The current branch and `origin/main` have no canonical migration-history
mechanism. The only tracked `supabase/migrations` artifact is on an unmerged
historical branch and implements the rejected direct-upload model. Execution is
therefore blocked until Mike/Nox identify or approve a durable canonical
migration-recording mechanism. This proposal does not invent one.

After that traceability gate and separate execution approval:

1. Confirm the zero baseline and final exact live capture.
2. Pre-seed and manifest-verify all five metadata/four Storage fixtures.
3. Apply the byte-approved forward transaction.
4. Confirm the only authenticated attachment metadata policy is scoped SELECT.
5. Confirm `anon` has no effective metadata privilege, `authenticated` has only
   `SELECT`, and `service_role` has only `SELECT, UPDATE` on this table.
6. Confirm no authenticated `chat-attachments` Storage policy remains.
7. With two synthetic users and two projects for User A, prove scoped metadata
   SELECT and broker read/delete succeed only for the correct scope.
8. Prove wrong-project, wrong-conversation, foreign-user, and noncanonical-path
   broker requests fail non-enumeratingly before privileged access.
9. Prove anonymous metadata SELECT/INSERT/UPDATE/DELETE and authenticated
   metadata INSERT/UPDATE/DELETE fail.
10. Prove direct authenticated Storage INSERT, SELECT, UPDATE, and DELETE fail,
   including same-user cross-project attempts.
11. Prove Storage-removal and metadata-soft-delete partial failures converge on
   retry without false success or raw diagnostics.
12. Confirm signed URLs, paths, credentials, private content, and raw provider
   errors are absent from logs and telemetry.
13. Clean exact Storage paths, then hard-delete the five exact metadata tuples
    in the separately approved database-owner transaction from the runbook.
14. Prove the table and bucket return to their zero baselines.
15. Check Supabase security/performance advisors and Storage logs.

## Recovery

Do not automatically restore the weak pre-migration policies when an E2E
assertion fails. If the migration committed correctly, its catalog matches the
approved hardened state, and the failure is isolated to broker/application
behavior with no unrelated impact, retain the hardened state, mark attachments
unavailable/fail-closed, clean exact fixtures, preserve evidence, and fix the
application separately.

Use the exact rollback only for incorrect policy/grant state, unintended
database effects outside the attachment boundary, database-integrity impact,
or an explicit human judgment that rollback is safer. Except for an emergency
database-integrity event, rollback remains a separate explicit human decision.
