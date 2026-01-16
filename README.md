# Arbor Monorepo

## Structure
- `apps/backend` — Vercel-hosted Next.js backend API (Supabase + Stripe + memory systems)
- `apps/frontend` — **mobile client** source (to be rebuilt; do not commit build outputs)
- `docs/code/` — reference code dumps from previous threads

## Safety: secrets
Do **not** commit `.env*` files. Use Vercel Environment Variables for backend secrets.

## Backend quick start
From repo root:
```bash
pnpm install
pnpm --filter ./apps/backend dev
```
