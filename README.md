# Arbor Monorepo

## Structure
- `apps/backend` — Vercel-hosted Next.js backend API (Supabase + Stripe + memory systems)
- `apps/frontend` — **mobile client** source (to be rebuilt; do not commit build outputs)
- `docs/code/` — reference code dumps from previous threads

## Safety: secrets
Do **not** commit `.env*` files. Use Vercel Environment Variables for backend secrets.

## Backend deployment authentication

The following values are server-only deployment secrets. Use sanitized placeholders
in documentation and test fixtures; never commit real values.

- `CRON_SECRET` authenticates Vercel Cron requests to
  `GET /api/admin/system/heartbeat`. Vercel supplies it as
  `Authorization: Bearer <CRON_SECRET>`. Missing, invalid, or unconfigured
  credentials fail closed.
- `ARBOR_ADMIN_TOKEN` is temporary internal hardening for global memory decay and
  non-production diagnostic routes. Those requests also require an authenticated
  user JWT and send the admin value in `x-admin-token`.

Neither secret may be prefixed with `NEXT_PUBLIC_`, embedded in browser or Flutter
code, or returned by an API. `ARBOR_ADMIN_TOKEN` is not the future developer-window
authorization design.

The repository contains Vercel cron configuration at both the monorepo root and
`apps/backend`. Both invoke the same heartbeat path with GET; the active schedule
depends on the Vercel project's configured root directory.

## Backend quick start
From repo root:
```bash
pnpm install
pnpm --filter ./apps/backend dev
```
