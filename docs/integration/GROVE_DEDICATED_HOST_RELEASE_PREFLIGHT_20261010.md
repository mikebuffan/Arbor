# Grove dedicated private host release preflight — review only, October 10 2026


> **CURRENT AUTHORITATIVE READBACK — 2026-10-16.** This document was written
> before the two protected release candidates diverged. The Vercel project
> API currently **omits** the `rootDirectory` property. This is NOT
> `rootDirectory: null`, is NOT proof of a repository-root selection,
> and is NOT proof that `apps/backend` is selected. Both possibilities
> remain **UNVERIFIED** until directly observed in project settings.
>
> Foundation draft [#453](https://github.com/mikebuffan/Arbor/pull/453)
> retains Firefly cron in `apps/backend/vercel.json`; dedicated Grove-only
> draft [#454](https://github.com/mikebuffan/Arbor/pull/454)
> has `apps/backend/vercel.json` with `crons: []` plus strict
> dedicated-project middleware fail-closed protection. Both drafts preserve
> the shared root `vercel.json` Firefly cron. Grove's no-cron configuration
> is **SOURCE-ONLY** and could be effective only if the approved host selects
> the matching backend directory. Never merge #454's configuration into
> Firefly or deploy it merely to discover Root Directory.
>
> The Vercel Grove project is `live=false`, newest reviews CANCELED,
> and `ssoProtection.enabled=true` with
> `deploymentType=all_except_custom_domains`. Its current default
> `grove-private-api.vercel.app` domain is not independently accepted as
> a working native Grove API origin. Preserve the phone's exact approved
> host pin and no-redirect JWT handling. No SSO bypass credential may be
> embedded in the app. Signed model, independent deletion custody,
> schema migration/rollback, provider snapshot retention and capped
> release approval remain separate GATED prerequisites.


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

## Dedicated project source-layout hold (2026-10-11 historical; superseded)

The 2026-10-11 note previously inferred `rootDirectory = null` from an
**omitted** Vercel API field. That inference was incorrect: the currently
selected Root Directory has **not been established**. Framework `nextjs`
is reported, but no effective deployment configuration is verified.
The repository-root `vercel.json` retains Firefly's heartbeat cron.
Foundation #453 `apps/backend/vercel.json` retains the Firefly daily cron;
isolated Grove #454 `apps/backend/vercel.json` has `crons: []`.
Neither file is proven effective without the actual Root Directory.
The alternate `apps/backend/grove.vercel.json` and
`apps/backend/vercel.grove.json` are not automatically selected.
Neither deployment-root option is approved for Grove until the actual
effective config is proven no-cron.

The existing `verify-private-host.mjs` source preflight now computes a
metadata-only fail-closed `inspectPrivateGroveReleaseLayout` outcome.
Its offline tests read the actual checked-in root, backend and alternate
configs, challenge both root choices, validate the alternate-file trap,
reject wrong project/config shapes, and demonstrate that even a hypothetical
valid no-cron root **STILL requires separate owner release approval**.

This is NOT a deployment config change, project setting mutation, Vercel
budget approval, signed-owner host acceptance, model connection or live
Supabase schema change. Do not edit effective Firefly `vercel.json` or
project root merely to turn a checker green; prepare a separately reviewed
Grove-only effective config in its own authorized release later. All drafts
remain build-fenced.

## Concurrent owner-approved privacy policy — 2026-10-11

While the source-only host layout remains blocked, the owner also approved
**30 days maximum for encrypted backup snapshots**, distinct from keeping
active conversations indefinitely until explicit user deletion. The
`inspectGroveBackupSnapshotRetention` pure preflight exercises this policy
without touching any provider backups. No automatic cleanup, backup job,
provider retention setting, billing change or deployment has been activated.
This decision does NOT lift the no-cron, migration, missing-key, private
owner/device, model-budget or independently protected deletion-record gates.
