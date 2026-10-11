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
