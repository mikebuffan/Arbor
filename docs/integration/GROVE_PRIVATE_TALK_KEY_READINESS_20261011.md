# Grove private Talk host-key readiness (2026-10-11)

**Source-only audit. No credentials, host calls, paid inference, Vercel deploy, grant mutation, device change, or new engine.**

## Highest-value next coding target

Reuse the existing Grove host checker `ops/grove/verify-private-host.mjs`,
adding `inspectPrivateGroveTalkKeyMetadata`, a **pure review of Vercel
environment variable names and deployment targets**, never values.
Host settings already exist for auth/read-scoped Grove (7 production key names)
but the metadata scan reveals the additional names needed by the existing
private Talk and independent LM paths are absent. This is **NOT** a claim that
current values, credentials, grants, auth, model or deployed routes are usable.

### Present at dedicated `grove-private-api` Vercel project
- `GROVE_API_ENABLED`
- `GROVE_SUPABASE_URL`
- `GROVE_SUPABASE_PUBLISHABLE_KEY`
- `GROVE_SERVICE_ROLE_KEY`
- `GROVE_FIREFLY_SUPABASE_URL`
- `GROVE_FIREFLY_SERVICE_ROLE_KEY`
- `GROVE_PUBLIC_API_ORIGIN`

### Missing production key names (7), categorized by existing source owners
- Private conversation flags: `GROVE_PRIVATE_CHAT_PREVIEW_ENABLED`, `GROVE_PRIVATE_MODEL_TURN_ENABLED`
- Independent LM receiver: `ARBOR_LM_PRIVATE_URL`, `ARBOR_GROVE_API_KEY`, `ARBOR_GROVE_BROKER_HMAC_KEY`
- Durable send/reopen: `GROVE_PRIVATE_TRANSCRIPT_ENABLED`, `GROVE_PRIVATE_CLAIM_ENABLED`

Source locations: `apps/backend/lib/grove/privateReadBroker.ts`,
`apps/backend/lib/grove/privateConversationLoop.ts`,
`apps/backend/lib/grove/privateLmHostTransport.ts`,
`apps/frontend/lib/config/grove_private_config.dart`,
`apps/frontend/lib/pages/grove_talk_page.dart`. Phone flags are separate:
`GROVE_PRIVATE_TALK_PREVIEW` and exact approved HTTPS host, pinned auth realm
and owner-device access. These are NOT automatically changed.

**Important:** Missing key names are a blocker. Adding key names alone
must never count as proof that the corresponding values, grants, model
receiver, migrations, budget or hosted deployment exist. The checker always
returns an unverified/HOLD disposition. The exact old Vercel READY backend
is not proof of the newer composed private Talk.

## Required acceptance order (no blanket GO grants)
1. Read-only reconcile exact approved private host config, Grove invitation
   and project grant, and independently hosted model/receiver existence.
2. Owner separately approves a capped **isolated private-host build** only
   when the signed LM receiver, Vercel budget and rollback are independently
   verified. Do not build on source-only review branches by accident.
3. After authorization, verify no public/Firefly routes and correct unauth
   denials with existing `verifyPrivateGroveHost` checks; real account
   auth/grant readback then controlled private chat, persistence and Android
   close/reopen. No paid model by default.
4. Preserve entire 97-task original inventory; review only F02/F04/F09/F10
   source evidence and avoid task completion status promotion.

## Safety
The private-host Vercel project is explicitly no-build in the existing
shared `source-only-ignore.mjs` until separately approved. New audit branch
is also no-build across all projects/stages. GitHub-only read/no-secrets tests.
No main merge, production, feature toggle, API secret retrieval or paid calls.
