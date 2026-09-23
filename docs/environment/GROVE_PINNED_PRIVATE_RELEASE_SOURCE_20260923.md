# Private Grove — pinned source candidate / no deploy authorization

Prepared: 2026-09-23 PDT. **SOURCE CANDIDATE ONLY**. Not a verified Vercel deployment, real LM, installed phone, live SQL migration, or permission grant.

## Source of truth and lineage

- This isolated candidate was cut from **exact tested** retry/lease-fencing source [PR #209](https://github.com/mikebuffan/Arbor/pull/209), SHA `f2229eb321ce84dcbc69af9841c1f6ca4a1f02d0`, [five-job CI 35909314777](https://github.com/mikebuffan/Arbor/actions/runs/35909314777) SUCCESS, not from a mixed workspace or default `main`.
- The stack is Grove backend/transcript [#194](https://github.com/mikebuffan/Arbor/pull/194) → cron-free release [#205](https://github.com/mikebuffan/Arbor/pull/205) → combined real Grove house/Android/backend **CI source only** [#206](https://github.com/mikebuffan/Arbor/pull/206) → credential-free build and private Vercel branch filtering [#208](https://github.com/mikebuffan/Arbor/pull/208) → fenced durable claim [#209](https://github.com/mikebuffan/Arbor/pull/209) → THIS separately staged source review.
- The separately authored Grove phone [#196](https://github.com/mikebuffan/Arbor/pull/196) was brought into combined #206, not by independently merging #196 onto an unrelated branch. DO NOT MERGE duplicate source mirror #195/#197 or CI-only #206 as an independent release.
- Original #194 advanced **four commits** after #205 branched (role grants, exact owner/bridge disposable migrations, independent schema test). Do NOT force a merge just to make PR ancestry look linear: #209's proposed SQL intentionally supersedes original #194's direct service-role INSERT in favor of **DB-minted, atomically fenced completion**, and #209's disposable fixture tests the actual original owner+bridge SQL. Review semantic compatibility and preserve the earlier commits' history.
- The existing Vercel project `grove-private-api` tracks old production branch `deploy/grove-private-api-20260921` SHA `8999a570cf20b8496f984f62a298a58ef67d7217`. The candidate and old production branch diverge at `main` `d46f6b46fc51ac3db4e158cddfc592c52cc2b5ef` — never blindly merge, rebase or reset the owner's production branch. Preserve it as an available *source* rollback reference; no successful live Grove production deployment is established.
- Research #201/#207 and public Arbor #159 remain separately owned, not part of this candidate; Grove is not a public app.
- Candidate source changes after the anchor require a NEW exact-head CI run. Parent's green result cannot be assigned to a changed SHA.

## Checked source configuration (candidate requires exact-head test)

- Two `vercel.json` scopes each use `{"crons":[]}`, not inherited Firefly admin heartbeat.
- Vercel framework **Next.js**, repository `mikebuffan/Arbor`, root `apps/backend`, root-external files enabled from owner screenshots. Actual protected Vercel **project ID and functional deploy host remain unverified** through connected tools.
- Legacy Firefly OpenAI SDK is lazy; the Grove CI builds the Next.js backend with `OPENAI_API_KEY=""` and all of `GROVE_PRIVATE_CHAT_PREVIEW_ENABLED`, `GROVE_PRIVATE_MODEL_TURN_ENABLED`, `GROVE_PRIVATE_TRANSCRIPT_ENABLED`, `GROVE_PRIVATE_CLAIM_ENABLED`, `GROVE_PRIVATE_NEW_CONVERSATION_ENABLED`, `GROVE_COGNITIVE_PREVIEW_ENABLED` **false**. This does NOT independently prove a hosted Qwen receiver.
- Optional *Grove Vercel project-only* Ignored Build Step source: `node ../../ops/grove/should-build-private-host.mjs` (Vercel exit 0 skips, 1 builds). It allows old confirmed production branch **only when target is production** and this reviewed source candidate **only when preview**. Unrelated research, public, main and old CI/draft branches should skip. It is NOT installed in Vercel; do NOT apply it to Firefly or research projects.
- Before any approved promotion, review the build filter and update the production branch rule together with Vercel branch tracking. This candidate's preview branch must NOT silently become production.
- Private-host smoke command is available at `ops/grove/verify-private-host.mjs` and must ONLY run against a confirmed, approved live **Grove** HTTPS origin. Synthetic test never contacts live host.
- Proposed `docs/migrations/PROPOSED_grove_private_turns_20260923.sql` and `docs/migrations/PROPOSED_grove_private_turn_claims_20260923.sql` have **not** been applied. Transcript direct INSERT is denied to service-role; only separately approved fenced `grove_private_complete_turn` SQL may save the current lease owner response. An expired claim can generate *another inference* after 240 seconds; only persistence is fenced — never claim exactly-once model inference.
- No owner, bridge or project grant is auto-seeded. Revocation cascades to proposed transcript/claim rows; owner must review retention, backups and deletion semantics before approval.

## Explicit order before real users / model

1. Re-fetch candidate exact HEAD, all parent PRs, latest integration/research/public heads, run CI on candidate and review source config + compatibility. Preserve old prod for rollback.
2. Owner/ops verifies existing dedicated Vercel **project ID**, team, quota, target origin and protected server-only env without exposing secrets in chat or repository. Vercel quota errors do NOT mean code build failure; do not buy or retry by assumption.
3. Owner explicitly approves migration/deletion policy, backs up the correct Grove Supabase project, reconciles manually applied bridge SQL with migration ledger, then reviews/applies exact Grove-only transcript + claim proposals. No Firefly or ARK Preview DB writes.
4. Owner confirms actual Grove invited user, linked Firefly identity, chosen ARK project/conversation grant; separately authorizes provisioning. Recheck anonymous, wrong user/project, revoked grant and other-host route denial.
5. Independently host **real** Arbor LM with signed r2 receiver, TLS/HMAC/API-key isolation and shared replay protection; observe actual no-OpenAI inference. Do not enable model flag before this proof.
6. Owner approves preview/production promotion and scoped flags; first private host comes up with chat/model/transcript/claim/creation/cognitive flags OFF, then sequentially enabled after authorization. Keep real privacy data out of public CI.
7. Mike/owner builds device APK with real **Grove-only** publishable key and domain; Danelle verifies sign-in, return to same thread, deterministic retry, revoke/wrong scope, window/Moss/clock, Text then Voice.

## Rollback and stop

- Immediate runtime HOLD: keep or return private model/chat switches OFF on the dedicated Grove project, preserve original source ref, no public Firefly or research deployment changes.
- Owner permission rollback must respect deletion-on-grant-removal and approved retention/backups.
- STOP for new charge, live SQL, release, secrets, source ingestion, owner identity linking, real model tools/worker/scheduler or user-content training without distinct authorization.
