# Grove effective backend no-cron release candidate — SOURCE ONLY (2026-10-11)

**Separate protected candidate branch:** `review/grove-private-backend-no-cron-20261011`.
**Parent combined foundation:** draft PR #453, `8fe1a254b669e004072fbf7a9f8e40bb2ddbda3e`.
**NOT approved for merging into the Firefly/shared foundation, or deploying.**
**2026-10-16 authoritative correction:** Root Directory is UNVERIFIED, not null. Grove deployment URLs are SSO protected; native Android API acceptance needs an approved host/origin arrangement, with no bypass token in the app. See the updated shared `GROVE_DEDICATED_HOST_RELEASE_PREFLIGHT_20261010.md` for the remaining release gates.

## Exact intended future boundary

- Updated 2026-10-16 Vercel readback for dedicated `grove-private-api` / `prj_nw2X0SyLn4e8CXWZ83MEs4jwn1JN` **omits `rootDirectory`**. Neither repository root nor `apps/backend` can be inferred; the earlier `rootDirectory=null` claim was incorrect. Provider metadata still reports `live=false`, latest review CANCELED and SSO enabled. We DID NOT change project settings.
- Root `vercel.json` STILL contains Firefly's heartbeat cron in this candidate and is unchanged from the foundation parent. It is NOT an acceptable effective config for private Grove.
- This **isolated review branch only** changes `apps/backend/vercel.json` to the already reviewed `crons: []` and existing shared `ignoreCommand`. This could become the effective no-cron configuration **only after the selected Root Directory is independently verified as `apps/backend`** and a separately authorized release proves the actual effective config. If a project setting change is needed, it requires narrow approval and rollback; do not assume a change is needed based on the omitted API field.
- The candidate branch itself is protected in the existing `ops/grove/source-only-ignore.mjs`; the dedicated project continues to refuse ALL builds for ALL branches. The new source-only workflow verifies this without host credentials.
- At initial candidate creation this was only the host/config change. Subsequent independent source-security fixes (Grove private request byte bounds and tests) have since been mirrored to both protected drafts with matching blobs, and are documented in PR #453. No new model, worker, engine, migration or product feature was activated.

## Gate before any release

1. Review effective Vercel Root Directory and no-cron config for this exact dedicated project, identify appropriate Git project linkage and Next.js monorepo build settings. A filename in an unselected directory is NOT an effective Vercel config.
2. Obtain **separate specific owner approval**, rollback plan and confirmed **no-cost or explicitly capped** budget for any private Preview.
3. Keep the public Firefly root/backend configs unchanged: **NEVER merge this backend config change into the shared parent or main.** If a release is authorized, use a dedicated, independently reviewed Grove-only release composition and verify public Firefly continues to run its own schedules.
4. Keep private Talk/model OFF until isolated owner identity, conversation schema/claims, provider-independent deletion-state custody and 30-day encrypted snapshot compliance, signed LM receiver and bounded runtime are verified and approved.
5. Only then stage and inspect the real no-cron deployment, prove route isolation, native private auth, owner-scoped send/save/reopen, STOP/retry safety, and rollback. No real data or worker activation during this review.

**Scope result:** Release-specific **effective backend config proposal prepared; actual host selection/deployment remains GATED**. It does not promote any original 97-task item to DONE.
