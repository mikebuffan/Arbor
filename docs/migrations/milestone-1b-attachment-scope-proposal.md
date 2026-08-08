# Milestone 1B attachment-scope proposal

Status: **proposal only; not applied**. Applying either SQL file is a separate
human approval gate.

## Catalog finding

The 2026-08-08 read-only Firefly catalog check found strict-looking policies
and older user-prefix-only policies on `storage.objects`. Because these are
permissive policies, PostgreSQL OR-combines them; the broad policies win. The
metadata INSERT policy likewise validates only `user_id` and a user path
prefix. A same-user request can therefore reach an attachment in another one
of that user's projects, and a user can insert metadata naming a foreign
project/conversation.

The existing approved-object INSERT policy also requires status `pending`,
while the live status constraint permits `uploading`, `uploaded`, `failed`, or
`deleted`. The proposal uses `uploading` and the existing 20-minute upload
intent expiry.

## Affected objects

- RLS policies on `public.chat_attachments`.
- RLS policies on `storage.objects`, only when `bucket_id = 'chat-attachments'`.
- No tables, columns, constraints, indexes, functions, grants, buckets, or data.
- No policy for another Storage bucket or future user-global resource.

## Before and after authorization

Before: authenticated users can write attachment metadata for any referenced
project/conversation when `user_id` and the first path segment are their own.
They can directly read, update, or delete any object under their user prefix,
including objects in another owned project.

After: metadata requires an owned project, an owned conversation in that
project, an optional message in the same scope, and the canonical
`user/project/conversation/attachment/file` path. A direct authenticated upload
requires a matching unexpired `uploading` metadata intent. Direct authenticated
Storage read/update/delete is denied; a bounded server route must validate the
explicit project/conversation scope with `lib/attachments/scope.ts` before
minting a short-lived signed read URL or performing mutation.

This broker requirement is necessary because a normal Storage JWT identifies
the user but contains no "current project" context. RLS alone cannot distinguish
"same user, correct project" from "same user, wrong current project" without a
trusted project claim or a server validation boundary.

## Security and Companion Impact

Security impact: closes permissive-policy bypass, foreign metadata spoofing,
cross-conversation binding, and direct same-user cross-project object reads.
The service-role key remains server-only.

Companion Impact: downloads and deletes must move through a scoped server
broker before this proposal can be applied. Until that bounded route and its
client call are approved and implemented, applying the proposal would deny all
ordinary direct downloads. Upload remains possible only after valid metadata
intent creation. No persona, behavioral, or memory semantics change.

## Verification plan

On a Supabase development branch or after separate production approval:

1. Snapshot current `pg_policies`, constraints, and bucket configuration.
2. Apply the proposal transaction.
3. With two synthetic users and two projects for User A, prove own-scope
   metadata creation and upload succeed.
4. Prove User A cannot insert metadata for User B's project, User B's
   conversation, or an owned conversation from a different project.
5. Prove noncanonical paths and expired upload intents fail.
6. Prove direct authenticated reads, updates, and deletes fail, including
   same-user/cross-project reads.
7. Prove the future server broker returns an object only after full
   user/project/conversation/attachment validation.
8. Prove User B cannot read User A metadata or objects.
9. Check Supabase security/performance advisors and Storage logs.
10. Roll back only from the captured catalog snapshot if any assertion fails,
    then verify the restored policy definitions exactly.
