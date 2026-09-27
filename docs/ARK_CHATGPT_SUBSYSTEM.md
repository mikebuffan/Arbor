# ARK as a ChatGPT subsystem

This checkpoint exposes a deliberately narrow ARK subsystem to ChatGPT through a remote Model Context Protocol (MCP) server. A follow-up Preview release adds one bounded queue-only research receipt.

It is based on the verified ARK integration checkpoint `d3b216884e279a7add53a72649e421972d0ca557`. It does not merge, deploy, enable ARK execution, or modify production.

## Safety boundary

The MCP server is authenticated and user-scoped. Reads use the authorized user's bearer token. The bounded submit action verifies project ownership with that token before using the server's queue RPC, and the database enforces the project/user relationship again.

The server exposes only these tools:

| Tool | Purpose |
| --- | --- |
| `get_arbor_profile` | Confirm the Arbor identity attached to the authorized connection. |
| `list_arbor_projects` | List projects owned by that user. |
| `get_ark_status` | Read durable objectives and task status for one owned project. |
| `get_arbor_continuity` | Read the latest runtime continuity for an owned project or conversation. |
| `submit_ark_preview_research_objective` | Queue one fixed research seed with depth and hop limits of two; repeated calls return the same receipt. |

The submit tool is the only write action and requires a verified OAuth client ID pinned by `ARBOR_ARK_PREVIEW_QUEUE_CLIENT_ID` in addition to ownership. Supabase OAuth does not currently support custom permission scopes. It creates one `ark.preview-research` queue receipt. The claim RPC excludes that kind, even when a general worker is enabled. Set the Preview client ID on the isolated deployment. Apply `20260927090000_ark_preview_research_queue_only.sql` to the isolated Preview database **before** deploying this MCP route. Do not deploy the route if either prerequisite is absent. No execution action is exposed.

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
7. Verify that ChatGPT discovers the four read tools and the bounded submit tool above.
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
- The only write tool requires the fixed seed, an owned project, and both limits set to two; duplicate submissions reuse one objective.
- A Preview research task remains queued with zero attempts after a general heartbeat cycle.
- `ARBOR_ENABLE_ARK_EXECUTION` remains unchanged and off unless separately enabled through an authorized rollout.

## Future expansion

Write-capable ARK tools should be a separate checkpoint and security review. They should require narrower OAuth scopes, explicit confirmation for consequential actions, immutable audit events, idempotency keys, rate limits, and hard stops for deployment, billing, destructive changes, secrets, and production access.
