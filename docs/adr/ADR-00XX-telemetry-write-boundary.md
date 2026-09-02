# ADR-00XX: Telemetry Write Boundary and Diagnostic Data Minimization

- Status: Draft for Milestone 1B correction review
- Date: 2026-08-08
- Decision owner: Arbor architecture approval gate

## Context

The chat route previously attempted `trace_logs` insertion with the ordinary
request-scoped Supabase client. Firefly does not grant that client a write
policy, and the code did not inspect returned Supabase errors, so telemetry
could disappear silently. Granting clients broad direct insert permission
would expose identity, scope, and diagnostic-data integrity to client input.

## Decision

Telemetry writes cross a bounded server-only writer. The chat route derives
the authenticated user, project, conversation/thread, episode, and trace IDs;
clients do not submit a telemetry body and never receive direct `trace_logs`
insert authority. The writer uses the server-only admin factory for this one
table and operation.

The current accepted event shape is the typed internal `TelemetryPayload` plus
an internal proof snapshot. There is no accepted client event shape in this
milestone. A future client event endpoint would require a separate contract and
must accept only an event-name enum and small scalar measurements; it must
discard any client-supplied user/project identity.

The writer allowlists UUID references, bounded numeric timing/token counts,
short server-controlled gate codes, and a safety-tier enum. It reconstructs
the stored proof snapshot from these fields. Unknown fields are discarded.

## Prohibited content

Telemetry must not contain raw memory values or keys, prompts, full
conversation bodies, user text, assistant text, authorization headers, JWTs,
cookies, provider requests/responses, API keys, database error objects, or
arbitrary client metadata.

## Failure behavior

Telemetry is secondary to the user interaction and runs after the durable
assistant commit through the background boundary. A write failure returns a
non-throwing failure result and emits one structured warning containing only
subsystem, operation, a bounded safe code, trace ID, and resource type. Raw
database details are not logged. User-visible chat success therefore depends
on assistant persistence, not telemetry availability.

Production and debug builds use the same stored allowlist. Development-only
response diagnostics remain a separate response concern and must not expand
the durable telemetry payload.

## Rate limits and retention

Idempotent assistant persistence permits at most one telemetry write scheduling
event per newly committed durable assistant turn. Any future general telemetry
endpoint must add explicit per-user/per-project request limits before launch.
Retention must be set by a separately approved data-governance policy; this ADR
does not create a deletion schedule or authorize schema/RLS changes.

## Consequences

- Trace integrity and identity are server controlled.
- Ordinary clients keep no broad `trace_logs` INSERT right.
- Diagnostic payloads lose arbitrary debug detail by design.
- Telemetry failure is visible to operators without leaking source content.
- No database schema, RLS, grant, function, or production-data change is
  required for this implementation.
