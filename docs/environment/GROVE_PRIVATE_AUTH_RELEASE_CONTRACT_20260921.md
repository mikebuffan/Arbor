# The Grove — private authentication and distinct-app release contract

Owner review draft, 2026-09-21 local. This branch is private Grove #151 stacked on #150, **not the public Arbor App (#140/#146)**. No production changes.

## Concrete error found on a real Samsung
An Android application ID and icon separate APK files, but the PR #150 debug build still used Firefly `SUPABASE_URL`, publishable key and `ARBOR_API_URL`. The purple Arbor debug chat existed under Grove Talk; owner had no separate Grove login. Public Arbor alpha has its own entrypoint and must not be conflated with Firefly credentials or the Grove.

## Implemented contract
- A `grove` flavored package never inherits `SUPABASE_URL`, `SUPABASE_ANON_KEY` or `ARBOR_API_URL`. It requires all three **dedicated Grove** compile-time values:
  - `GROVE_SUPABASE_URL`
  - `GROVE_SUPABASE_ANON_KEY` (publishable / anon **only**; NEVER a service-role key)
  - `GROVE_API_URL`
- Validate HTTPS and reject known existing Firefly, ARK Preview, archived Supabase hosts, Firefly API, missing or malformed values. This is deployment defense in depth, **not** sufficient proof of identity/ownership; backend JWT verification, RLS and owner grants are mandatory.
- With missing config, boot a non-networked Grove setup/room-art screen without silently creating accounts or initializing Firefly. No ARK/LM work occurs.
- With configured private auth, Supabase is initialized against ONLY the Grove auth realm. A session gate protects the house; invited-user email one-time-code sign-in uses `shouldCreateUser: false` and server configured email-code template. The API URL resolves to Grove service for chat/voice/status. The current backend cannot consume that new project's JWT until adapted, and **must not** be treated as working by a green Flutter build.
- The original Arbor flavor remains unchanged. Public Arbor alpha is separately bootstrapped under `apps/frontend/lib/public/main_public.dart`.

## Required provisioning before real owner sign-in
1. Owner reviews costs, residency, security and retention; approves a **new private Grove Supabase project** and **distinct Grove API origin or strictly isolated API deployment**. Do not repurpose ARK Preview or Firefly/production project.
2. Configure invite-only account creation in the new realm, email-code template (`{{ .Token }}` per Supabase auth template rules), email delivery/rate limits and owner invitation to an address the owner controls. Do NOT ask the owner to share a password or service role key. No claim of existing credentials.
3. Implement private Grove API middleware that verifies the Grove issuer/audience/signature and server-side owner entitlement, applies row-level project isolation, rejects arbitrary Firefly/public tokens, and returns truthfully `unavailable` for unbridged ARK features.
4. Provide a narrow, explicitly authorized read-only Firefly/ARK bridge by owner/project mapping that does **not** exchange Grove JWTs for admin credentials in the app. No direct production ARK write. Test deny-by-default, revoked invitation, wrong owner, wrong project, stale responses and audit.
5. For the public Arbor alpha, use its own Supabase/Vercel/LM integration and user deletion/consent controls; do not import owner records, Grove art or private ARK data.
6. Build Grove with dedicated **publishable** values supplied through protected CI environment, not committed secrets. Confirm app package IDs differ, install side by side, private login/session persisted only per package, public login never appears in Grove, and vice versa.
7. Owner-approved private release signature/upgrade path: debug CI signer is ephemeral; installation over a differently signed APK can fail. Do NOT instruct uninstall without preserving local state and explicit owner review.

## Art and content design
Approved exact nighttime room stays authoritative. This branch does not replace it with the other high-resolution reference renders simply because they are larger. The recent owner-supplied kitchen, desk and observatory references are additional room design targets, and need asset-level import/approval and actual navigable room implementation before calling them shipped.

## Acceptance still open
- Actual dedicated private Supabase realm exists; OTP reaches invited owner.
- Private Grove API verifies owner-issued JWT; ARK read-only bridge returns authentic scoped state.
- Text → Voice → Text and re-launch preserve intended private thread with private model endpoint; no provider fallback.
- Device visual approvals, full-resolution canonical assets, sun/moon dynamic window artwork, keyboard, Moss world state and offline/disconnect.
- Exact-code CI for #151 and owner-reviewed physical APK, signing and deployment.

## Strict boundary
No project was provisioned, login credential generated, account moved, authentication provider changed, production database touched, API deployed, private model connected, app merged or binary distributed by this draft. This is code and a release contract for **what must be provisioned before the house can actually accept an independent login**.
