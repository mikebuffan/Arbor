# Grove historical retrieval source gap — read-only 2026-10-11

**User requirement:** The user should be able to ask Arbor about a conversation
from a year ago or more **if that conversation was saved and the user has
not explicitly deleted it**.

**Current source reality, before private deployment:**
- `apps/backend/lib/grove/privateTranscriptStore.ts` `listRecent` reads
  only the six newest complete turn-pairs for an authorized Grove
  user/project/conversation. `apps/backend/app/api/grove/chat/history/route.ts`
  advertises `windowLimit=6` and `historyMayBeTruncated`; the phone
  explicitly tells the user when only six newest turns are shown.
- `apps/backend/lib/grove/privateReadBroker.ts` discovers a maximum
  21 raw Firefly conversation metadata rows and returns up to 20 Grove
  choices, filtering deleted Grove conversation IDs. Older active
  conversations can therefore fall outside the current discoverable window.
- These bounds are **presentation/query windows**, NOT deletion/retention
  periods. The proposed Grove transcript storage has no age-based TTL.
- The current Grove text surface has no verified authorized historical
  pagination or full archive search implementation. Do NOT claim that
  a prompt alone can retrieve every message from a year ago. External
  ChatGPT memory/history capabilities cannot be assumed in Grove.

**Existing-workflow follow-on, NOT a new engine:** Extend the already-scoped
Grove read broker, private transcript store and phone client with
authorization-preserving cursor pagination and user-requested historical
lookup; retain deletion-tombstone filtering on every page. Verify
foreign-owner, revoked grant, changed-scope, missing/expired cursor,
truncation, request cost and content privacy negative tests; do not widen
default model context or ingest an outside archive. Exact design and
release acceptance are future source work after the current storage
stabilization gates, not evidence the capability already exists.

**Independent of 30-day backups:** a one-year-old saved conversation needs
a durable primary store and safe search/read access, not a year of snapshots.
This is a review note under the existing One Arbor/Grove task ownership,
not a new task family or permission to deploy.


## Source-only archive paging follow-on — 2026-10-11

The original gap above remains the deployed reality. An opt-in backend
archive page has now been added on the existing draft #452 source branch.

- GET /api/grove/chat/history with projectId, conversationId and page=archive
  returns up to six complete pairs plus nextCursor (null at the end).
  Follow-up requests supply cursor and page=archive. The legacy GET and
  its six-pair model-context read are unchanged.
- The cursor is HMAC-bound to verified Grove user/project/conversation,
  signed with a domain-separated derivation of the existing server-only
  Grove service key, expires in 15 minutes and contains no transcript text.
  Malformed/expired/tampered/other-scope cursors fail closed.
- Existing scoped transcript storage performs timestamp/request-ID keyset
  pagination, seven-row lookahead, complete-row validation, duplicate/order
  rejection and microsecond-safe comparisons. Owner/grant checks and the
  deletion-tombstone fence run before and after each content fetch.
- Source tests cover expiry/tampering/foreign scope, page boundaries,
  bad provider rows, legacy read compatibility and mid-read revocation.
  The source-only workflow now runs the route test as well as store tests.

**Still gated:** Firefly conversation discovery stops at 20; the phone has no
archive paging UI; a plain year-ago user prompt has no verified search API.
A restored full backup still needs independently protected deletion custody.
Actual Grove transcript schema, receiver, host, phone, owner acceptance
and budget approval remain separate live dependencies.

This is source-only review; no production merge, migration, deployment,
user data, paid model, worker activation or owner permission change.
The 97-task master and six-group overlay are unchanged. Check exact-head
CI before marking this code-only pass GREEN.


## Existing conversation picker pagination — source review 2026-10-11

- The existing /api/grove/chat/conversations GET retains its original first-20
  response. Explicit page=archive opts into signed keyset pages, with a
  nextCursor that expires after 15 minutes. A request bearing a cursor without
  page=archive is rejected.
- The cursor binds the verified Grove owner, mapped Firefly owner, granted
  project, and updated_at + id anchor. Its server-side HMAC uses a
  domain-separated derivation of the existing Grove service credential, not a
  user-supplied bearer. Old cursors are invalid if scope changes.
- Every request redoes owner invitation / project grant / Firefly ownership,
  validates returned raw rows, orders by updated_at then ID, and queries the
  Grove tombstone store for the selected raw page. The 21st row is lookahead:
  it is validated but never accidentally displayed if a hidden chat occupies
  an earlier slot. The next cursor uses the 20th RAW record so a deleted
  conversation can neither resurrect nor cause a legitimate older chat to
  be silently skipped.
- No broad owner listing, private body read, model inference, automatic TTL,
  new engine, migration or live activation. The preview-phone conversation
  picker has not yet been wired to request the next page.
- New broker and route regressions cover 20+ records, deleted/hidden middle
  entries, scopes, forgery and expiry, malformed order, grant revocation,
  HTTP opt-in and compatibility. Do not mark this exact source head verified
  until all offline source CI jobs pass.

The existing 97-task master is unchanged. Real Grove hosting, older-message
search from natural-language prompts, full restore deletion-state custody,
database migrations, model receiver and installed-phone acceptance still
require their independent gated reviews.
