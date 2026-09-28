# ARK Preview → ChatGPT readback: safe deployment gate

**Status:** source-only draft stacked on research PR #212. Mike's original one-shot `canary.read` completed successfully and the result persists in ARK Preview. DO NOT rerun it. No new Vercel project, remote MCP host, OAuth connection, ChatGPT custom plugin or unattended ARK worker has been deployed by this draft.

## What is reused

The backend already provides authenticated read-only MCP at `/api/mcp`: `get_arbor_profile`, `list_arbor_projects`, `get_ark_status`, `get_arbor_continuity`. No second ARK database, user identity provider, fake status or model-authored task receipt.

## Why a separate Preview host

Visible Vercel account currently has one project, `firefly`. DO NOT reconfigure or redeploy that production project to ARK Preview. The entire backend also contains chat, attachment, admin and scheduled heartbeat paths; publishing it with Preview database variables but without restricting entry points would expose unintended features. This isolated branch adds:

- `ARK_PREVIEW_MCP_READONLY_HOST=true` route guard that permits only exact `/api/mcp`, `/.well-known/oauth-protected-resource`, and `/.well-known/oauth-protected-resource/api/mcp`; everything else returns 404 before ordinary middleware exemptions.
- Fail-closed 503 for the dedicated host if either `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` is not exactly `https://tzbpjbhroxiqftqwatnb.supabase.co`. The ordinary Firefly host is unchanged when the preview-only flag is absent.
- `apps/backend/vercel.json` has no crons on this draft branch. Existing main/Firefly config is NOT modified.
- A safe manual probe that checks metadata resource/issuer matches exactly and denies anonymous MCP GET with 401; no OAuth tokens or service-role key in command arguments, output or source.
- Isolated source CI tests and backend build. This is NOT a live deployment acceptance.

## Review then host: operator steps, separate approval

1. Confirm no other integration thread owns a newer readback host. Review the exact-head integration draft; keep this stacked draft unmerged and do not affect Grove, Firefly or the public app.
2. If proceeding, create a NEW Vercel project (suggested `arbor-ark-preview-mcp`), import the same GitHub repository, select this draft branch and **Root Directory `apps/backend`**, Next.js. Do not import to existing `firefly`.
3. In that new project only, set `ARK_PREVIEW_MCP_READONLY_HOST=true`, `NEXT_PUBLIC_SUPABASE_URL=https://tzbpjbhroxiqftqwatnb.supabase.co`, `SUPABASE_URL=https://tzbpjbhroxiqftqwatnb.supabase.co`. Set matching ARK Preview publishable/anon key variables `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY` from the Preview dashboard (not primary Firefly). Do not paste any credentials into GitHub/chat. MCP reads use normal per-user bearer token, NOT a service-role key; do not add the Preview service-role key solely to make readback work.
4. Before deploying, confirm the Vercel project's effective `vercel.json` has **no crons** and these allowlist/URL guard changes are in the deployed source, not just in GitHub. Confirm deployment URL, exact git SHA and project root. If unrelated routes are reachable, halt/disable the deployment.
5. From local repo at this branch, once the HTTPS host is online, run:
   `corepack pnpm --filter firefly-backend exec tsx scripts/ark/check-preview-mcp-host.ts https://YOUR-NEW-HOST/api/mcp`
   It must report `readOnlyHostGate:true`, Preview issuer, and `unauthenticatedStatus:401`. Do not point it at `firefly`. This probe intentionally does NOT request `/api/admin/system/heartbeat` because making that GET request on an incorrectly configured host could execute it.
6. Add this endpoint as a **custom MCP app/plugin** in ChatGPT developer mode on a supported web surface and authenticate with a **Preview owner user OAuth account**. Availability and UI vary by account/plan; lack of the app creation option is a product gate, NOT proof the backend is missing. Do not use service-role credentials for ChatGPT.
7. Invoke actual `get_arbor_profile`, `list_arbor_projects` and `get_ark_status` in ChatGPT, compare the completed one-attempt `canary.read` result, completion evidence, events and timestamps to independent Preview DB receipt, then start a second chat and repeat. Empty/wrong-owner/wrong-project status is FAIL, not eventual consistency. `get_arbor_continuity` may legitimately report unavailable.
8. After same-state READ passes, separately review owner-scoped enqueue/resume/stop, scheduler/worker host and multi-tick DB semantics. No external document ingestion is authorized by readback.

**Gate progression:** one-shot Preview worker: PASS. Source-only host boundary: awaiting exact-head CI. Deployed MCP host: NOT YET. Installed ChatGPT plugin: NOT YET. Same-state live tool invocation: NOT YET. Long-running worker and research source ingestion: NOT YET.
