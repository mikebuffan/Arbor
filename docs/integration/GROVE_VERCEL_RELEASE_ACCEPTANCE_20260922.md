# Grove private API — Vercel restart and acceptance card

**Prepared:** September 22, 2026. **Status:** review-only runbook, not a deployment receipt or permission to deploy. Production changes, owner invite/grant and real-phone acceptance remain separately gated. **Never add API keys to screenshots, GitHub, chat or the phone client.**

## Before pressing deploy

- Destination is the *existing* `grove-private-api` project shown by Danelle in Vercel, not `firefly` or `firefly-ark-sandbox`. The connected Vercel listing remains incomplete; do not infer the private project was removed or recreate it. No extra billing/upgrade.
- Root directory: `apps/backend`; framework: Next.js; production branch: `deploy/grove-private-api-20260921`; exact last tested branch head: `8999a570cf20b8496f984f62a298a58ef67d7217`. **Refresh actual branch tip and CI before deployment**; this pin is historical if the branch changes.
- Protected, server-only production environment names required: `GROVE_API_ENABLED`, `GROVE_SUPABASE_URL`, `GROVE_SUPABASE_PUBLISHABLE_KEY`, `GROVE_SERVICE_ROLE_KEY`, `GROVE_FIREFLY_SUPABASE_URL`, `GROVE_FIREFLY_SERVICE_ROLE_KEY`, `GROVE_PUBLIC_API_ORIGIN`. Production values were reported entered by the owner; the connector has not independently read or verified masked values.
- Dedicated runtime must keep `GROVE_API_ENABLED=true`; Grove issuer is the dedicated Supabase Grove project, Firefly is the independently authorized data provider, and public origin is exactly the Grove backend HTTPS origin. Do not paste values into chat.
- [PR #156](https://github.com/mikebuffan/Arbor/pull/156) is *deployment-only*: `apps/backend/vercel.json` sets `crons: []`, so the private host does not inherit Firefly's heartbeat. The lazy unrelated OpenAI SDK initialization is tested; a read-only Grove ARK status build does not need an OpenAI key.
- Latest verified source-only backend build: [Actions 35696240828](https://github.com/mikebuffan/Arbor/actions/runs/35696240828) SUCCESS at `8999a570...` with `OPENAI_API_KEY` empty. The last checked GitHub-hosting status had `Deployment rate limited — retry in 24 hours`, **not** an unhandled compiler error. Do not repeatedly retry or redeploy the OLD missing-key build.

## Deployment receipt to capture (no secret values)

1. When quota is available, create a NEW production deployment from current Grove deployment branch tip, not the failed `main` import or old failed build.
2. Confirm Vercel project name, branch and exact deployed commit; note production URL and deploy time. Build success alone is not a running endpoint/auth receipt.
3. Confirm backend route `GET /api/grove/ark/status?projectId=<uuid>` is live; replace `<uuid>` with **a syntactically valid, non-sensitive test UUID**, not a personal project identifier.
4. Without a bearer token, require HTTP 401 (`grove_auth_required`) on the status route when configuration is valid. A 500 `grove_api_not_configured` is a hosting configuration blocker, not a successful denial test. Other routes, including `/`, `/api/chat`, `/api/ark/status`, `/api/admin/system/heartbeat`, should be 404 on the private Grove host. Do not use a privileged API secret to probe a user bearer route.
5. Verify no scheduled heartbeat/crons are attached to the private project and Firefly's production project continues working independently. Do not alter Firefly.
6. If a required denial unexpectedly returns personal data, stop and investigate before any invitation. Save only sanitized status, date, route, and deployed SHA as receipt.

## Owner authentication and granted read (separate approval)

1. Set up invited owner email/OTP from the dedicated Grove Supabase provider and verify callback/redirects. Invite-only access means **no guessed owner identity or UUID**.
2. Provision the owner grant, server-only Grove→Firefly user mapping, and explicit project grant only after identifying and approving real Grove user + Firefly user/project. The 2026-09-22 read-only DB check found all grant/mapping counts zero; this is deliberate protection.
3. Confirm a signed Grove bearer authenticates *only* through Grove issuer and owner entitlement. Firefly/ARK Preview/public tokens must fail. Test an ungranted project and revocation without showing personal response content or exposing tokens.
4. Before any migration automation, reconcile the already-applied manually entered bridge DDL against Supabase migration ledger. Do not replay it blindly.

## Phone and actual continuity acceptance (later)

A real invited Android Grove needs signed-in/private provider sign-out/restart; the approved nighttime house, independent Living Window preview and Return to Now, clock and DST/local time, Moss persistence; read-only ARK with explicit grant; account/project and in-flight-response clearing; Text→Voice→Text; real bounded LM inference only after separately hosted service and source receipt. A synthetic Flutter test and backend CI are not device acceptance. **Today's narrow status API is not the full Layer/LM conversation bridge.**

## Evidence stages and stopping points

| Stage | Minimum evidence |
| --- | --- |
| TESTED | exact commit + matching source tests/build result |
| DEPLOYED | exact Vercel project + deployed SHA + production URL + live denial/status checks |
| AUTHORIZED READ | real invited owner + explicit revocable mapping/project grant + cross-user negative tests |
| ACCEPTED | physical user/device observations and real conversation/LM receipt for each stated capability |

**Human work today:** none unless Vercel capacity returns and live deployment is deliberately initiated. Do not create a new paid service to bypass a temporary rate limit.
