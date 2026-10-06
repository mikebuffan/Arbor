# Authenticated document-hop host endpoint

`/api/research/document-hops` now provides an actual Next.js host caller for the
existing bounded document-hop executor and receipt store. Authentication uses the
existing fresh `requireUser` check. Project ownership is checked through the
authenticated user client before any service-role client is created. Request
schemas are strict: owner, worker identity, clock and enablement cannot be supplied
by the client. Responses are marked `Cache-Control: no-store`; storage errors use
a fixed error code instead of leaking SQL or extracted source content.

## Operations

- GET: query parameters `projectId`, `sessionId`, `unitId` (UUIDs). Reloads the
  saved result with owner/project/session/unit scope through the user client and
  existing RLS, without admin access or execution. Missing/old receipts return 404.
- POST STOP: body `{projectId, sessionId, action: "stop"}`. Checks the owned
  session, invokes the existing scoped session-stop RPC, then re-reads the session
  before acknowledging cancellation. Terminal sessions are returned as found.
  STOP remains available while execution flags are off. This is durable session
  cancellation, not a claim that an in-flight provider request was aborted.
- POST tick: body `{projectId, sessionId, action: "tick"}`. Requires server flag
  `ARBOR_ENABLE_STORED_DOCUMENT_HOPS=true` AND a scoped integration-state row with
  execution enabled while scheduler, real-source ingestion and publication remain
  disabled. Only then does the service-role bounded session caller run one unit.
  The session's existing authorization, lease and budget gates still apply.

## Current execution barrier

The existing proposed v6 integration schema has a CHECK requiring all four flags
to stay false. Therefore this endpoint remains execution-blocked under the current
schema, even when the application flag is true. No migration or gate override was
introduced or applied. A future reviewed schema/activation decision is required
to allow execution. The test with execution enabled is explicitly hypothetical;
it is not evidence of a live permitted state.

Tick is one explicit manual invocation. It cannot create a session or work unit,
ingest a source, publish findings, schedule a repeat, or submit to historical
memory. Repeating tick requests may advance separate queued units once execution
is opened; clients must not automatically retry this operation. Request-level
deduplication and unit-kind-selective claiming must be resolved before activation
with mixed queues or automatic transports. Existing leases and receipt settlement
deduplicate a claimed unit, not a whole HTTP intent. Unsupported unit kinds are
rejected by the document executor; it is not a general worker dispatcher.

## Verification and remaining work

230 offline research tests passed with external fetch forbidden, including route
authentication, strict input, owner boundaries, flag-off and closed/missing/foreign
integration gates, hypothetical eligible caller binding, user-scoped readback,
STOP while execution is disabled, STOP readback confirmation and error redaction.
Backend TypeScript and whitespace checks passed. Tests exercise the actual route
handlers with mocked transport/auth dependencies, not live HTTP or Supabase.

No deployment, live database, grants, flags or schedule was changed. Deployment,
reviewed schema activation, request deduplication/selective claims and a scoped
live acceptance run remain outstanding. This endpoint is source connected and
execution locked.
