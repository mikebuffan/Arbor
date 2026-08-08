# Milestone 1B correction-pass record

Status: implementation in local correction worktree; Milestone acceptance and
remote publication remain withheld.

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

The codebase has no active attachment upload/download route. A reusable
application guard now validates authenticated project ownership, conversation
ownership within that project, attachment metadata scope, and the canonical
bucket/path shape. The exact policy proposal and rollback are under
`docs/migrations/` and were not applied.

The live catalog still has permissive user-prefix Storage policies that
OR-bypass stricter policies. A Storage JWT has user identity but no current
project context. The proposal therefore requires a future bounded server
broker for signed reads/deletes and removes direct authenticated object reads.
That broker is a separate runtime/API approval and must exist before applying
the proposal.

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

Heartbeat and Vercel Cron remain disabled. No `CRON_SECRET` was created,
configured, read, or rotated. No authenticated heartbeat, successful global
decay, reflection, sync, or unrestricted maintenance invocation is authorized
or performed by this correction pass.

## Governance updates required before acceptance

- Record `turnId` as the required logical-send idempotency key in the API and
  mobile networking specifications.
- Define mobile retention/lifecycle rules for an in-flight `turnId` across
  retry, reconnect, app suspension, success, explicit cancel, and a new send.
- Approve the attachment broker contract before approving the proposed RLS and
  Storage migration.
- Assign telemetry retention and operator alerting ownership before launch.
- Keep vector RPC reactivation behind proof of project-scoped authorization.
- Keep heartbeat activation, Cron, maintenance breadth, and secret management
  as a separate milestone.

No persona, Danelle-profile, behavioral pipeline, or unrelated frontend/UI
governance is changed here.
