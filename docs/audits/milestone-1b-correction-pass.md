# Milestone 1B correction-pass record

Status: historical correction record reconciled to the 2026-09-11 closeout
candidate. Later accepted broker, migration, and durability work supersedes the
future-work language retained in older Git history.

## Approved external contract amendment

`POST /api/chat` now requires `turnId`, a UUID generated once by Flutter for a
logical user send. The response shape is unchanged. Retries and reconnects use
the same ID; a genuinely new send uses a new ID even when the text is
identical. Reuse with different immutable project/conversation scope or user
text returns `409 turn_conflict`.

The backend derives separate deterministic UUIDs for the conversation created
by a first turn, the user message, and the assistant message from authenticated
user scope, `turnId`, and purpose. The exact guarded, safety-prefaced,
postchecked replacement/fallback is the only assistant content committed. A
completed retry returns that durable content. A concurrent losing insert
reloads the winning assistant row and returns it; post-commit background work
runs only for the winning insert. Persistence failure returns server failure,
not a success claiming durability.

## Confirmation eligibility

`memory_pending` remains the table. A row is eligible only when it has no
operational `event_type`, has a real non-`memory_event` question, and contains a
nonempty array of structurally usable memory operations. Selection is scoped
to authenticated user and project before ordering eligible rows. A newer event
row cannot become user intent or hide an older eligible candidate.

## Attachment boundary

The active broker routes are `POST /api/chat/attachments/access` and
`POST /api/chat/attachments/delete`. They derive authenticated identity
server-side, verify project/conversation/metadata/canonical-path scope, and use
privileged Storage authority only after request-scoped authorization succeeds.
Signed URLs are transient and are never logged or persisted. Direct
authenticated attachment Storage access and metadata writes are denied by the
applied migration set; authenticated metadata access is scoped SELECT only.
Attachment upload remains outside Milestone 1B.

## Telemetry boundary

The bounded writer is server-only, reconstructs an allowlisted minimized row,
uses server-derived identity, and reports failure through a redacted structured
warning without failing a durable chat response. No telemetry schema, RLS,
grant, or retention change was made. See
`docs/adr/ADR-00XX-telemetry-write-boundary.md`.

## Vector retrieval

- Status: **Disabled pending verified project-scoped authorization.**
- Fallback: **Direct RLS-backed project-scoped retrieval.**
- Companion Impact: **Reduced recall quality; improved privacy/security
  assurance.**

No RPC signature, security mode, policy, or implementation was changed.

## Heartbeat and maintenance

The daily heartbeat schedule exists in operative backend Vercel configuration.
A valid heartbeat remains fail-closed/inactive because machine authentication
is not configured. No machine secret was created, configured, read, or rotated
by this correction pass. Ordinary conversation does not depend on heartbeat,
decay, or reflection; decay and reflection remain quarantined. Enabling
machine authentication is separately approved future work.

## Current governance boundaries

- Preserve `turnId` as the required logical-send idempotency key across retry
  and reconnect; a genuinely new send receives a new ID.
- Preserve the current scoped attachment broker and applied authorization
  boundary. Attachment upload is a separate product contract.
- Assign telemetry retention and operator alerting ownership before launch.
- Keep vector RPC reactivation behind proof of project-scoped authorization.
- Keep machine-authenticated heartbeat activation, maintenance breadth, and
  secret management as a separate milestone.

No persona, Danelle-profile, behavioral pipeline, or unrelated frontend/UI
governance is changed here.
