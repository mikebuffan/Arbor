# Grove Library — read-only Firefly memory shelf (2026-09-21)

Stacked on PR #130 (room inventory), itself stacked on consolidated
Grove PR #129. This increment uses the existing authenticated
GET /api/memory/items?projectId=<selected project>, which already checks
the selected project's owner and filters active, non-deleted rows.

## Implemented
- Memory & State now displays a separate LIVE SAVED MEMORY panel beside
  the scenery-only room catalog. No fixture or placeholder facts.
- Foreground loading from the existing ArborApiClient bearer-token flow and
  the user-specific ArborSession project/conversation.
- A second fail-closed projection: project ID must match; conversation-scope
  entries require matching current conversation; global/unmatched scopes,
  sensitive tier, user-trigger-only, deleted/inactive/malformed/empty entries
  are excluded from this browse view.
- Current user, project and conversation are rechecked after retrieval.
  Prior project data is cleared on refresh/error; older overlapping requests
  cannot overwrite the latest one.
- Displays the saved key/text and memory item ID, not invented source claims.
  The UI explains that a memory is NOT a primary document or independent
  verification. A potentially truncated 500-row server response is labeled.
- Focused pure parsing and widget tests for project isolation, trigger-only
  handling, malformed data, loading/errors, stale requests and refresh.

## Boundaries and next gates
- NO new backend endpoint/schema, no memory edits, no grants/permissions,
  no ARK execution, no production merge or deployment.
- This existing endpoint returns at most 500 rows and has no pagination;
  absence on this screen is not proof no memory exists.
- The screen does not expose sensitive/trigger-only items; those need
  a separately authorized retrieval path based on appropriate user intent.
- The inventory's source contract remains an unconnected capability.
  An authenticated file/document-list endpoint with project ownership,
  locators and provenance must be reviewed before showing project documents.
- Read-only memory can be displayed, but automatic model retrieval across
  ChatGPT, Firefly Text and Voice is NOT claimed by this UI.
- Before merging stacked PRs: exact-head CI, signed-in device test, correct
  user/project switching, session recovery and visual acceptance.
