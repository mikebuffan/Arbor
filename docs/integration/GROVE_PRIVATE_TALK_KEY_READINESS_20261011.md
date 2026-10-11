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


## 30-step execution review — six groups, exact #452 branch

**This is an execution view beneath the original 97-task master, not 30 new tasks.** Labels mean source checks, offline regression acceptance or explicit host gates; they do not confer runtime authority. Group 1 is completed as *read-only source ownership review*, not as production/release approval.

### Group 01 Source & ownership

| # | Source assessment | Exact evidence or blocker |
|---|---|---|
| 01 | DONE_SOURCE | PR #450 parent source and #451/#452 sibling heads read back; no merge |
| 02 | DONE_SOURCE | PR #450/#451/#452 ancestry reconciled; #451 and #452 separate review owners |
| 03 | DONE_SOURCE | Shared ops/grove/source-only-ignore.mjs collision identified and deliberately left unmerged |
| 04 | DONE_SOURCE | Vercel latest #452 Grove deployment CANCELED; exact ignored-build fence tested in CI |
| 05 | DONE_SOURCE | Exact #452 source head/43 tests and 97-task reconciliation pinned |

### Group 02 Private backend

| # | Source assessment | Exact evidence or blocker |
|---|---|---|
| 06 | PARTIAL | Dedicated grove-private-api exists and has a verified domain; effective live no-cron root/config not proven |
| 07 | SOURCE_TEST_PENDING | Private route isolation, missing-auth rejection, no-cron proposal covered in existing backend mock suites; run exact-head CI |
| 08 | DONE_METADATA | Seven existing production key names; seven additional Chat/LM/Transcript names missing; values NOT read |
| 09 | PARTIAL | Grove private auth realm and broker host restrictions source-owned; real invitation/grants not inspected |
| 10 | SOURCE_TEST_PENDING | Revocation/foreign-project and broker scope mocked regression queued for exact-head CI |

### Group 03 Independent LM

| # | Source assessment | Exact evidence or blocker |
|---|---|---|
| 11 | PARTIAL | Receiver source/manifest and expected adapter card identified; actual receiver alive/not reachable NOT RUN |
| 12 | SOURCE_TEST_PENDING | Pinned manifest/HMAC/context/receiver protocol contracts in existing offline suites; exact-head CI |
| 13 | SOURCE_TEST_PENDING | Fake execution receipts, mismatched response ID and contradictory read claims tests in mock suite |
| 14 | SOURCE_TEST_PENDING | Failure, timeout and no unsafe replay tests in existing mock suites |
| 15 | GATED | No live LM runtime, spending ceiling or provider allowance confirmed; paid inference forbidden |

### Group 04 Conversation persistence

| # | Source assessment | Exact evidence or blocker |
|---|---|---|
| 16 | PARTIAL | Existing private transcript and conversation code read; Grove actual schema has ONLY owner-access, bridge, project-grant tables |
| 17 | SOURCE_TEST_PENDING | Request-ID replay/duplicate suppression mocked tests scheduled |
| 18 | SOURCE_TEST_PENDING | Owner project switch, grant revocation and stale-return tests scheduled |
| 19 | SOURCE_TEST_PENDING | Unsent draft/read-back/reopen recovery Flutter tests scheduled |
| 20 | GATED | Grove live transcript/claim schema NOT INSTALLED; offline SQL proposal exists, migration/retention requires explicit approval |

### Group 05 Grove phone

| # | Source assessment | Exact evidence or blocker |
|---|---|---|
| 21 | SOURCE_TEST_PENDING | Main→Grove private auth→Home→Arbor doorway→Talk source inspected, navigation test scheduled |
| 22 | PARTIAL | Exact Grove approved API host and private Talk build flags source-fenced, not enabled in installed APK |
| 23 | SOURCE_TEST_PENDING | Flutter widget tests+static analysis in exact-head CI |
| 24 | NOT_RUN | Synthetic Android debug build not repeated on #452; do not imply a phone install |
| 25 | SOURCE_TEST_PENDING | Private Talk unavailable/recovery and revoked-scope screens tested in Flutter fixtures |

### Group 06 Hosted acceptance

| # | Source assessment | Exact evidence or blocker |
|---|---|---|
| 26 | GATED | Vercel billing lookup returned costs_not_found; credit reset unconfirmed, budget approval needed |
| 27 | GATED | Dedicated Grove project remains no-build; isolated live Preview not authorized |
| 28 | GATED | No owner-signed-in host test; invitation + private grants not exercised |
| 29 | GATED | No paid model call, transcript migration, real send/save/reopen or device install approved |
| 30 | GATED | No hosted/device acceptance, verified rollback or completion receipt |

### Source/host evidence distinction and execution order

- Groups 1–5 can be audited concurrently where files do not conflict; underlying edits stay single-owner and serialized. #451 STOP branch remains a sibling of #452, NOT automatically integrated.
- The Grove Supabase `fqjqpuaoifgbweiguacf` current `public` schema was inspected **by table name only**. It shows `grove_private_owner_access`, `grove_private_firefly_bridge`, `grove_private_ark_project_grants`; **no `grove_private_turns` table**. Previous offline transcript SQL acceptance is NOT proof it is installed. Do not issue migrations or read owner data.
- Exact-head GitHub CI (see PR #452) executes backend mock contract checks, pinned offline receiver fixtures, Flutter navigation/draft/retry tests and TypeScript. Until results exist, retain SOURCE_TEST_PENDING; no inherited parent CI is a new acceptance.
- Android debug build is **NOT RUN on this branch**, even if prior #450 source/phone CI succeeded. Live host, LM and physical device tests in group 6 stay gated.
- Private host remains Vercel build-skipped until an exact approved release, no production alias, no worker, no grants, no paid inference.
