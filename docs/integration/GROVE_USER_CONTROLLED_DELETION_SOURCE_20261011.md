# Grove user-owned conversation deletion — source-only acceptance plan (2026-10-11)

**Product decision:** Saved Grove conversations remain until the user **explicitly deletes** them. No age, inactivity, sign-out, model-setting or grant-revocation auto-delete.

**This is a PROPOSAL ONLY.** No production data, actual database migration, live owner delete, or phone behavior has changed.

## Existing architecture respected
- Firefly owns the underlying project/conversation record; Grove separately saves scoped private model-turn pairs.
- A Grove Delete must not silently delete the shared Firefly conversation, archive attachments, memories, or another application’s records. The user-visible label will need to make that scope explicit.
- The new source-only SQL proposal extends the **existing Grove transcript and claim tables** rather than creating a second transcript engine. An immutable Grove-only tombstone fences late completions, retry claims and reappearance once host discovery/auth is wired to honor it.
- Only server service-role RPC is authorized in the **proposal**; Grove Auth verified JWT+invite+bridge+grant AND exact Firefly conversation ownership must be proved by an existing backend broker before the RPC is ever reachable. No browser or model writes/privileges.

## Group-by-group developer checklist (List → Prompt → Go)
1. **No auto-delete requirement:** source proposal has no TTL, scheduler, automatic sign-out/grant purge. Restrictive foreign keys retain other conversations.
2. **Atomic DB deletion draft:** one exact owner/project/conversation-scoped service-role function writes a tombstone and deletes matching pending claims + completed transcript as one SQL transaction.
3. **Re-creation fence:** inserts/updates in the existing claim and turn tables deny matching tombstone scope; late pre-delete tasks cannot resurrect the saved private conversation.
4. **Disposable synthetic proof:** test rejected foreign user, other conversation preserved, owner deletion, idempotent repeat, late claim/turn blocked, soft grant revocation preserves unrelated data, and no anon/authenticated SQL access.
5. **Next source implementation (NOT YET DONE):** reuse privateReadBroker for tombstone checks and list suppression, private Grove deletion API (strict owner action, feature OFF by default), exact-scope phone client, confirm-dialog and local draft/late-send safety. Never wire a Delete button to an unapproved backend.
6. **Live gates:** owner approves detailed deletion scope (Grove-only vs other app), backup/export and retention, isolated schema migration/grants/rollback, exact host permission and phone build, then checks real delete and independently verified absence. Remain gated until then.

**No live effects:** All code is in source-only draft #452, current Grove database migration and flags remain unchanged, no Vercel build or paid inference.

## Expected-red source typecheck and bounded repair
First combined source CI [38152816952](https://github.com/mikebuffan/Arbor/actions/runs/38152816952) proved 8/8 focused backend suites passing and the disposable PostgreSQL delete test passing, but TypeScript rejected the new 503 status in the pre-existing `RouteAccessError` union. The deletion broker now uses the existing fail-closed 500 error type, with unchanged non-success behavior. Await a new exact-head green run before source acceptance. No database or host change.

## Source-only API + phone implementation, pending exact-head acceptance

The existing private Grove broker now checks a proposed tombstone fence
**whenever private Talk is enabled**, failing closed if the table is missing,
unreadable or inconsistent; read-only conversation discovery excludes matching
Grove-deleted IDs while leaving the shared Firefly conversation untouched.
A separate `GROVE_PRIVATE_CONVERSATION_DELETE_ENABLED` backend switch,
default OFF, gates the strict POST-only
`/api/grove/chat/conversations/delete` route. It requires the literal
`DELETE` confirmation and valid project/conversation UUIDs, then delegates to
the existing owner+bridge+grant+Firefly-ownership broker and approved
transactional Grove-only RPC. Other endpoints never interpret model text as
permission to delete.

The Grove phone adds a distinct
`GROVE_PRIVATE_DELETE_CONVERSATION_PREVIEW` build-time switch (default OFF).
When enabled in a separately approved build, the UI requires a confirmation
dialog, explains that Firefly/other app copies and memories are untouched, and
refuses Delete when unsent/pending/retained device drafts or uncertain replies
exist. It clears stale displayed conversation data on uncertain network results
and clears the selected local conversation only after host confirmation.

**Acceptance state: NOT VERIFIED yet for this composed head.** The previous
exact backend + disposable SQL revision [38152946378](https://github.com/mikebuffan/Arbor/actions/runs/38152946378)
completed SUCCESS. The phone UI and strict response parser are added on top;
their exact-head Flutter/backend/disposable CI must pass before any source
DONE claim. Real host model, migration, permissions, phone installation and
user deletion remain GATED and no new task IDs are created.

**Release safety:** This branch is deployment-fenced, draft and unmerged.
The Grove database still contains only its three existing access/grant tables.
No private messages or account data were read/deleted for this work. Hard
account deletion, memories and backup retention are separate owner decisions.
