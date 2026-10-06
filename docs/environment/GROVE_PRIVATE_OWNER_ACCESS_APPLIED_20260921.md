# The Grove — private Supabase and deny-by-default owner gate

**Observed September 21, 2026 PDT / September 22 UTC.** Separate private Grove only. **No Firefly or ARK Preview database changes.**

## Provisioning receipt

- Aurixus Studios Supabase organization reports **Pro**.
- Danelle approved the independently quoted **additional $10/month** for a private Grove project in `us-east-1`.
- Supabase `create_project` created project named **The Grove**, region `us-east-1`, status `ACTIVE_HEALTHY`. The connection may be resolved through authorized Supabase tooling; do **not** commit provider keys or personal owner identifiers to this public repository.
- The original Firefly and ARK Preview projects remain separately active.
- Grove is a third Supabase project, **not** a renamed project, another Firefly APK, or a reuse of ARK Preview.

## Applied owner-access schema (new Grove DB only)

Committed migration: [`supabase/grove/migrations/20260922035539_grove_private_owner_access.sql`](../../supabase/grove/migrations/20260922035539_grove_private_owner_access.sql).
Supabase `apply_migration` returned success; `list_migrations` confirmed version `20260922035539` / `grove_private_owner_access`.

Verified on the new project:
- `public.grove_private_owner_access` exists, with FK `user_id` → `auth.users.id`.
- RLS enabled **and forced**; `anon` cannot SELECT; authenticated can SELECT but cannot INSERT, UPDATE or DELETE.
- Authenticated SELECT policy returns only the caller's *own* unrevoked row.
- Privileged provisioning/revocation uses server-held service credentials, never Flutter, ChatGPT paste, or public GitHub.
- **Zero grant rows**. No person is silently enrolled and no model/app automatically gets owner authority.
- Supabase security advisor reported no lints at this checkpoint.

New private UI follow-up: [Grove parent #153](https://github.com/mikebuffan/Arbor/pull/153) now has a stacked child source change requiring a matching RLS-visible owner grant before rendering the private house. It invalidates late access-query results after session change and fails closed on query/network errors. **This is UI defense in depth, not the final authorization boundary.** The trusted Grove backend MUST validate Grove-issued JWTs and active owner grants for **each** request. No Firefly, ARK Preview or public-app token may be accepted in the private Grove API.

## Still open before first real sign-in

1. Configure Supabase Auth to be invitation-only at the provider, correct email OTP code template and delivery/rate limits. Existing `signInWithOtp(shouldCreateUser:false)` is app-side defense, not provider configuration proof. No invitation was sent and no user was created by the SQL.
2. Invite the intended owner via a trusted administrative workflow; provision their exact Grove `auth.users.id` into the access table using privileged credentials that never enter a client/app/repo. Do not guess identity by email or mirror an existing Firefly user UUID across providers.
3. Set new provider URL and *publishable* key in protected Grove build configuration. Do not put a service-role key in Android. Provide a distinct HTTPS `GROVE_API_URL`; the existing Firefly API cannot validate the Grove JWT by default.
4. Implement/test private backend issuer/audience/signature/expiry/owner-entitlement validation and a narrow, revocable mapped read-only Firefly/ARK bridge. The private LM host must receive only scoped signed context; no direct private-to-public data sharing.
5. Run Flutter analyzer/tests on the stacked candidate including the four new grant-matcher tests and existing Grove regressions; complete owner physical-phone and sign-in tests. Debug APK/test source is not a release receipt.
6. Review retention, actual release signing, backup/rollback and independent public-app behavior; never automatically enable ARK worker execution or model claims of finished work.

**Hard stop:** The Grove project and owner gate are real, but owner email login, app API, private LM, ARK bridge, and full Grove are not yet live. No user data or credentials in GitHub, no paid service beyond the explicitly approved new Supabase project, no automatic invitations.
