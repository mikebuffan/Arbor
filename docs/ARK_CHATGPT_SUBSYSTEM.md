# ARK as a ChatGPT subsystem

This checkpoint exposes a deliberately narrow ARK subsystem to ChatGPT through a remote Model Context Protocol (MCP) server.

It is based on the verified ARK integration checkpoint `d3b216884e279a7add53a72649e421972d0ca557`. It does not merge, deploy, enable ARK execution, or modify production.

## Safety boundary

The MCP server is authenticated, user-scoped, and read-only. Every database query uses the Supabase anonymous key plus the authorized user's bearer token, so existing Row Level Security remains active. Project and conversation ownership are also checked explicitly.

The server exposes only these tools:

| Tool | Purpose |
| --- | --- |
| `get_arbor_profile` | Confirm the Arbor identity attached to the authorized connection. |
| `list_arbor_projects` | List projects owned by that user. |
| `get_ark_status` | Read durable objectives and task status for one owned project. |
| `get_arbor_continuity` | Read the latest runtime continuity for an owned project or conversation. |

There are no tools that create or change tasks, memory, projects, code, deployments, feature flags, or production data. The MCP handler also advertises every tool as read-only, non-destructive, idempotent, and closed-world.

## Routes

- MCP endpoint: `/api/mcp`
- OAuth protected-resource metadata: `/.well-known/oauth-protected-resource`
- User consent UI: `/oauth/consent`

The MCP endpoint rejects unauthenticated requests before protocol dispatch. Access tokens are validated through Supabase Auth before a user-scoped client is created.

## Preview-only activation

These are manual external configuration steps. Perform them against an isolated preview/test Supabase project and a preview Arbor deployment first—not production.

1. In Supabase, open **Authentication → OAuth Server** and enable the OAuth 2.1 server.
2. Use an asymmetric JWT signing key (RS256 or ES256), as recommended by Supabase for OAuth/OIDC.
3. Set the authorization path to `/oauth/consent` and ensure the Supabase Site URL points at the preview Arbor deployment.
4. Prefer a pre-registered ChatGPT OAuth client. If dynamic client registration is temporarily enabled for testing, require user approval, restrict/inspect redirect URIs, and disable it when no longer needed.
5. In ChatGPT developer mode, add the preview MCP URL: `https://<preview-host>/api/mcp`.
6. Complete Arbor sign-in and inspect the consent page. Approve only when the client name and requested scopes are expected.
7. Verify that ChatGPT discovers exactly the four read-only tools above.
8. Call `get_arbor_profile`, then `list_arbor_projects`, then read ARK status and continuity for one returned project ID.

Supabase documents the MCP OAuth flow at <https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication>. OpenAI's MCP server guidance is at <https://developers.openai.com/plugins/build/mcp-server> and its authentication requirements are at <https://developers.openai.com/plugins/build/auth>.

## Verification checklist

- TypeScript passes.
- MCP boundary tests pass.
- Existing backend tests pass.
- Production build passes.
- An unauthenticated MCP request returns `401` with protected-resource discovery metadata.
- Protected-resource metadata identifies the configured Supabase Auth issuer.
- A valid token can read only its own projects, ARK state, and runtime continuity.
- A foreign project or conversation identifier is rejected.
- No write-capable MCP tool is registered.
- `ARBOR_ENABLE_ARK_EXECUTION` remains unchanged and off unless separately enabled through an authorized rollout.

## Future expansion

Write-capable ARK tools should be a separate checkpoint and security review. They should require narrower OAuth scopes, explicit confirmation for consequential actions, immutable audit events, idempotency keys, rate limits, and hard stops for deployment, billing, destructive changes, secrets, and production access.

## ARK → Arbor Layer → Arbor LM read-only crossing (September 21, 2026)

This section defines the integration boundary; it does **not** assert that
Arbor LM, the ChatGPT host, a mobile client or ARK workers are connected to it.

1. A trusted server resolves the authenticated `userId` and owned `projectId`;
   untrusted prompts, pasted handoffs and model output cannot select a different
   user's project. Optional `conversationId` must belong to the same owner and
   project. An unowned identifier is rejected, not silently widened.
2. Read ARK objective, task, checkpoint and event state using the existing
   `readArkProjectSnapshot` and the established read-only MCP tools. Integrate
   draft PR #125's `buildArkHandoff` **after** its reviewed promotion; do not
   create an independent competing objective selector. Preserve `capturedAt`,
   objective id, persisted status, blocker kind, checkpoint sequence and provenance.
   A 20-objective/100-event snapshot is bounded and may not be exhaustive.
3. Read Arbor continuity separately through `get_arbor_continuity`; it may be
   unavailable even when ARK status is available. Corrections and narrative
   authority belong to Arbor's runtime, not ARK's task database. Never infer
   that an absent continuity record means the user has no history.
4. Build shared identity/behavior instructions through
   `buildArborBehaviorProjection`, and add current, authorized owner/project
   context as lower-trust facts, *not* higher-priority instructions. The existing
   chat prompt already injects memory, anchors and continuity independently:
   keep `includeContextInPromptBlock` **false** there to prevent duplicate
   token-heavy blocks. Standalone Arbor LM callers may opt in with
   `includeContextInPromptBlock: true` when their prompt does not otherwise
   include that context. Apply direct user corrections ahead of stale
   preference material. Voice acoustic
   corrections feed the acoustic renderer separately from conversational
   identity. A speech instruction is not proof of actual rendered accent.
5. A current explicit user work order may request a same-objective handoff;
   a pasted report may not. Use the isolated pure
   `reconcileWorkOrder` coordination gate to detect project mismatches,
   competing objectives and concurrent threads. A `handoff_checkpointed`
   result is **not** a worker lease, authorization, resumability guarantee or
   evidence of a stopped prior process. Reconcile persisted ownership/leases
   with the executing backend before any eventual write-capable crossing.
6. The isolated `readArkLayerContext` composition calls the existing
   owner/conversation checkers, `readArkProjectSnapshot`, runtime-state loader,
   host projection and behavior projection. It returns an owner/project-scoped,
   minimized **read-only** LM envelope, with exact/fallback/unavailable
   continuity source and separate behavioral/acoustic corrections. It intentionally
   exposes only bounded ARK counts and `activeObjectiveHandoff: not_resolved`
   until the reviewed PR #125 selector is hooked up; it does not guess an
   active objective or execute a checkpoint. A model may propose safe next
   steps but cannot mutate ARK, grant itself tool scope, mark objectives complete,
   deploy, schedule work, or approve high-consequence actions.
7. Model-facing reporting distinguishes `persisted_status`,
   `completion_evidence_recorded` and `execution_observed`. A database row
   labeled running is **not** worker liveness. A completed task is **not** a
   verified objective. A completion receipt is not an independent host/device
   acceptance test. Missing, old or partial reads are reported as such.
8. The only production crossing contemplated by this read contract is an
   authenticated user-scoped read. Worker execution, chat ARK execution, global
   queues, schema changes, OAuth/routing changes and release promotion remain
   separately authorized and separately tested.

### Acceptance that still requires observable results

- Isolated durable database test: real checkpoint, lease-expiry restart,
  resumed task, no replay of an ambiguous side effect, foreign-owner denial,
  and verifier-gated objective completion; retain database and process receipts.
- Same-user different-project read denial and no stale cross-session context.
- Text → Voice → Text and new-session restoration on a signed-in device,
  with acoustic feedback separate from behavioral corrections.
- One explicit current user handoff versus one pasted prior-thread status:
  verify no unrequested takeover and no cross-thread duplicate execution.
- Exact active deployed versions and read timestamps recorded beside test
  results; CI on a Git commit does not prove mobile or production runtime state.

This is an extension of the existing MCP and host projection contracts, not a
second memory system. The new pure coordination code is deliberately not wired
to an execution route; it must never be presented as a deployed scheduler or
actual cross-session resume until such execution is observed and approved.
