# Grove Library: scoped chat-attachment documents (draft)

Base: live saved-memory Library PR #132, stacked on room inventory PR #130
and consolidated Grove PR #129. NO production deployment or DB changes.

## Actual implementation
- GET /api/chat/attachments/grove-list?projectId=<uuid>[&after=<uuid>]
  calls requireUser before query parsing; checks project ownership and each
  returned conversation's ownership using existing backend utilities.
- Restricts query to user/project, uploaded status, nondeleted rows, and
  deterministic 25-item keyset pagination. Verifies storage path via existing
  assertProjectAttachmentPath. Response only returns attachment ID,
  project ID, conversation ID and scrubbed display filename; NEVER raw
  storage bucket/path or a signed URL.
- Flutter Library lists these metadata entries separately from saved
  model-memory claims. On every foreground read it uses the selected
  signed-in user's project, rechecks user/project after the read, and
  clears a stale or mismatched page.
- Explicit caveat: this is Firefly chat attachments, not all project
  files, and listing metadata is not opening/verifying document content.
- Backend route/scoping and Flutter parsing/widget tests added.

## Still open
- Clicking/opening bytes must use the EXISTING per-attachment access
  broker and user action; a file listing is not an evidence extraction
  pipeline and is not full Library/Drive discovery.
- Signed-in Android smoke test across accounts and projects, real
  attachment metadata, sign-out/relogin, and doc-access broker behavior.
- Full release review of the stacked branch chain and owner approval.
- Read-only ARK handoff PR #125 remains a separate review lane.
- No production merge, flag changes, migration or cron toggles.
