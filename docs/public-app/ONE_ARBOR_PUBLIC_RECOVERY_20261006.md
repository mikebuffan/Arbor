# Public Arbor recovery onto current One Arbor — 2026-10-06

## Source lineage

Recovered the last verified public-app lane into an isolated child of the current One Arbor source.

- Current One Arbor parent at recovery start: `cf2dd887f0526bd14e77192ad693c281f904222b`
- Public alpha continuity/history source: PR #146, `aea0318d9ff07d9c6e22d0627d3582325053b320`
- Public/private-provider exclusion source: PR #159, `1a6a6cc7eb682059b47f0638aaf5f5dedb907be1`
- Recovery branch: `integration/public-arbor-recovery-20261006`

This is selective reconciliation. It does not overwrite the current Grove, ARK, agency, memory, archive, or private-LM implementation.

## Recovered source

- isolated public backend routes under `/api/public/*`
- account-scoped conversation/history/export behavior from the public lane
- public backend authentication/environment guards
- fail-closed public Arbor LM adapter
- public Flutter entry point and alpha configuration guard
- public inference-gateway source
- proposed isolated public database schema
- public-alpha CI

## Reconciled against current One Arbor

### Backend middleware

Current One Arbor already has a deny-by-default private Grove mode. The old public branch predated that mode.

The recovery keeps both products isolated:

- `GROVE_API_ENABLED=true` exposes only the approved Grove namespace/methods.
- `ARBOR_PUBLIC_APP_ENABLED=true` exposes only `/api/public/*`.
- setting both product modes at once fails closed.
- ordinary Firefly behavior remains the fallback when neither isolated mode is enabled.
- public preflight remains exact-origin allowlisted.

### Android packaging

Current One Arbor already has separate `arbor` and `grove` flavors. The historical public lane used a global environment-variable suffix and would no longer build correctly.

The recovery adds a third source-only flavor:

- `arbor` — existing Arbor app
- `grove` — existing private Grove app
- `publicalpha` — isolated public alpha entry point

The public alpha gets its own application-ID suffix and label. It does not inherit Grove signing.

### Provider separation

The public app continues to reject all known private Firefly, ARK Preview, Grove, and historical private Supabase realms. The Flutter guard executes before Supabase initialization and also rejects the private Firefly/Grove API hosts, malformed origins, placeholder keys, and server-secret-looking keys.

## Acceptance added

`.github/workflows/public-app-alpha.yml` now targets both main and the current One Arbor integration lane and uses the current pinned toolchain conventions.

It checks:

- focused public backend tests
- standalone backend TypeScript
- production backend build
- public inference-gateway Python syntax
- locked Flutter dependencies
- public configuration guard tests
- public Flutter analysis
- an isolated synthetic `publicalpha` Android debug compile

No synthetic APK is published by the workflow.

## Still protected / not claimed

This source recovery does **not** create or configure:

- a dedicated public Supabase project
- a dedicated public Vercel project
- real alpha keys or user accounts
- a hosted public model
- model weights or private Arbor adapter material
- production migrations
- consent/retention policy acceptance
- real multi-user isolation acceptance
- real Android restart/history acceptance
- account deletion end-to-end acceptance
- public memory/ARK permissions
- production deployment

Those remain explicit later gates. Public Arbor must never reuse private Grove or Firefly credentials, databases, inference hosts, memory, or user data.
