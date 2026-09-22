# Private Grove API deployment-only branch — setup card

**Purpose:** independent, protected Grove Vercel project. This branch is based on private Grove PR #155 and contains exactly one deploy-only configuration difference: `apps/backend/vercel.json` has `"crons": []`. The existing Firefly project and its scheduled heartbeat are deliberately untouched. Do not merge the cron removal into Firefly's production branch.

## Verified before any deployment
- Private Grove source #155 has a dedicated status route `/api/grove/ark/status`, fail-closed provider/owner/project checks, private-mode middleware and a separate Flutter path; the last observed source head passed two backend+Flutter workflow jobs.
- Vercel team “Mike's projects” was checked; it had **one** project, `firefly`, and no separate Grove API project.
- The private Grove Supabase project is separate, healthy, and has a manually applied bridge schema, but **zero owner, account mapping, and project grant rows**; the manual bridge DDL is not in Supabase migration history.
- Neither the approved +$10/month Supabase project creation nor this branch approves additional Vercel charges or deployment.

## Safest owner-side first action (NO deployment yet)
In the Vercel team “Mike's projects”, create a **new empty** project named `grove-private-api` if the dashboard offers *Create Empty Project*. Stop if there is any new charge/paid upgrade. Do not select existing `firefly`, attach secrets, import/deploy `main`, or click Deploy.

After the empty project is visible, obtain its Vercel project ID through the connected Vercel integration. Then review Git integration and ensure:
- Git repository `mikebuffan/Arbor`.
- Root Directory `apps/backend` and Next.js detected.
- Production Branch `deploy/grove-private-api-20260921` (NOT `main`).
- The Grove deployment's root `vercel.json` has no scheduled jobs.
- Protected environment values are provisioned **only** through private project settings, never pasted into chat, Flutter, a repo, or a shared Vercel environment.
- Host status route is tested fail-closed prior to invitations and any sensitive data.
- Separate public/private account identities and scoped, revocable bridge grants must be reviewed before authenticating a real owner.

Vercel may trigger a deployment automatically when connecting Git; do not connect Git or initiate deployment until the project branch/root and protected environment plan have been reviewed. Do not use the current `mcp__Vercel__deploy_to_vercel` project-wide action to guess or overwrite Firefly.

## Private backend environment names (not values)
- `GROVE_API_ENABLED` — enables Grove-only host isolation
- `GROVE_SUPABASE_URL`, `GROVE_SUPABASE_PUBLISHABLE_KEY`, `GROVE_SERVICE_ROLE_KEY` — new Grove realm; **service key server-only**
- `GROVE_FIREFLY_SUPABASE_URL`, `GROVE_FIREFLY_SERVICE_ROLE_KEY` — separately approved read-only bridge; **service key server-only**
- `GROVE_PUBLIC_API_ORIGIN` — exact stable dedicated backend HTTPS origin

This is deployment preflight, not a service-ready receipt, billing approval, provider invitation, or production recommendation.
