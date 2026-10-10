# Grove dedicated private host release preflight — review only, October 10 2026

**Status: SOURCE CANDIDATE ONLY. Not the effective deployed configuration.**

This restores the previously reviewed no-cron Grove configuration contract from source PR #258 without touching either existing Firefly `vercel.json`. The purpose is to prevent a future dedicated Grove release from unintentionally inheriting the root or backend Firefly heartbeat scheduler.

## Existing source + exact review state

- Combined parent #444 retains the protected source-only branch `review/one-arbor-grove-440-441-compose-20261010`.
- Dedicated Vercel project `grove-private-api` (`prj_nw2X0SyLn4e8CXWZ83MEs4jwn1JN`) exists; provider metadata reports `live=false` and SSO protection. Presence of the project is not proof of a configured private host.
- `apps/backend/vercel.grove.json` has `crons: []` and the same existing no-build branch fence. This **alternate filename is not automatically selected by Vercel**.
- `apps/backend/vercel.json` and repository-root `vercel.json` are untouched; both retain Firefly heartbeat schedules.
- The existing shared ignore script additionally **refuses every build on the exact dedicated Grove Vercel project ID**, including `main` and unknown branches, until there is a separately reviewed owner-approved release. This is a source-only guard until the host's effective configuration actually uses it; it does not change Firefly/Preview build decisions.
- Existing `ops/grove/source-only-ignore.test.mjs` verifies no-cron separation and both the combined review branch fence and dedicated-project fail-closed behavior. All historical source fingerprints remain protected, with new proposal files separately pinned.

## Before selecting this for any real dedicated deployment

1. Confirm the actual dedicated Vercel project root directory, framework, effective `vercel.json`, and cron configuration from the project settings / approved release tooling. A review-only alternate config has no operational effect until explicitly selected in the intended deployment context.
2. Review and authorize the exact no-cron configuration in the effective Grove deployment directory **without replacing the shared Firefly configs**. Verify a no-build decision on the current source-only review ref and ensure there is no unintended automatic deploy.
3. Approve the exact HTTPS private API hostname and matching phone `GROVE_APPROVED_API_HOST` plus `GROVE_API_URL`, and independently verify Grove JWT, invitation, bridge, grant and conversation ownership on the actual host. Handle any SSO protection through an approved native-app-compatible policy, never a bypass secret in the APK.
4. Resolve signed private model runtime/revision/cost ceiling, Grove-only transcript/claim table approval, RLS/function privileges, deletion/retention/rollback decisions before enabling chat/model/transcript flags or using real data.
5. Only after separate owner authorization, create a staged release, inspect effective cron list (must be empty), verify route/source/identity, and perform a bounded authenticated owner readback and Android close/reopen test.

This file grants no production release, model call, schema mutation, runtime grant, Vercel config update, merge, or device install. 
