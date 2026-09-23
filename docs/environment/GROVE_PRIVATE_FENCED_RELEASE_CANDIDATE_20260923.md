# Private Grove — reviewed SOURCE consolidation / preflight, NOT release approval

Observed 2026-09-23 PDT. This file travels on PR #209. It documents the single
Grove source tip to review, not a production switch, a finished live service,
or permission to merge stacked CI mirror PRs. Re-fetch exact SHA + CI before
using this procedure; branch names alone do not prove a release.

## Canonical source topology

1. PR #194 `feature/grove-private-transcript-durability-20260923`:
   private transcript/owner baseline. Its tip `54a836a4012dffb8cce24183f3b9f7c554e06a85`
   advanced **four** commits past the ancestor used by release parent #205.
   Those four changes concern the proposed transcript SQL and disposable fixture,
   not an independent approved live migration.
2. PR #205 `feature/grove-private-release-composite-20260923`:
   private backend source, parent `64bf177ac1b2800d1254965bd8b6b1dcb0babfc4`.
3. PR #196 `feature/grove-private-chat-client-contract-20260923`:
   house + Grove Android client, independent code ancestry.
4. PR #206 `test/grove-private-end-to-end-composite-20260923`:
   CI-only **source integration** of actual Grove phone + house + backend
   at `2ab4c70dd4c8e57501e0f238a910ece939f7de97`.
   Historical CI mirror PR #195 and #197 are DO NOT MERGE.
5. PR #208 `feature/grove-private-release-readiness-20260923`:
   no-key legacy import fix, no-key Next.js CI, private-host read-only preflight,
   project-specific Vercel preview filter at
   `737833e725238a979630c15a8c83aea40ed4397b`;
   all five CI jobs passed in run 35901787836.
6. PR #209 `feature/grove-private-durable-retry-claim-20260923`:
   **newest Grove release-candidate SOURCE lane**. Previously tested fenced
   retry source `f2229eb321ce84dcbc69af9841c1f6ca4a1f02d0`,
   all five CI jobs PASS 35909314777. Later commits update the preview
   allowlist/documentation: re-check the final HEAD at release review.

## Apparent PR #194 divergence: deliberate review, no blind SQL cherry-pick

A branch comparison confirmed #194 and #205 have diverged at ancestor
`5dba1e6b08b548934961dcd735387bf81f74f681`.
The four later #194 changes narrowed initial transcript privileges and replaced
a synthetic grant schema stub with the EXACT original owner/bridge migrations.
The newer #209 disposable fixture ALSO applies those original migrations;
the #209 transcript proposal is stricter: service_role SELECT only, with
INSERT exclusively inside the lease-token-fenced server-only completion RPC.
Restoring the older broad service_role INSERT would bypass fencing.
Do not mechanically merge #194 tip or re-enable direct INSERT.

## Reviewed source invariants

- Root AND apps/backend `vercel.json`: `{"crons":[]}`.
- Dedicated Grove NEXT middleware denies unrelated Firefly APIs, static/framework
  path bypasses and cron; public Firefly remains unaffected with private gate OFF.
- No OpenAI key needed to BUILD legacy shared backend: previously eager SDK
  constructor is lazy, and unconfigured legacy API use still fails closed.
  Independent Arbor LM transport does not silently fall back to OpenAI.
- Both phone flavors compile separately; CI Grove uses synthetic .invalid URLs;
  APK is NOT an owner-configured install artifact.
- `GROVE_PRIVATE_CHAT_PREVIEW_ENABLED`, `GROVE_PRIVATE_MODEL_TURN_ENABLED`,
  `GROVE_PRIVATE_TRANSCRIPT_ENABLED`, `GROVE_PRIVATE_CLAIM_ENABLED`,
  `GROVE_PRIVATE_NEW_CONVERSATION_ENABLED`, `GROVE_COGNITIVE_PREVIEW_ENABLED`
  remain false by default. No live migration or account is implicitly provisioned.
- Proposed transcript table + claim schema **must be approved together**:
  revoke direct INSERT from service_role; claim returns DB-issued leaseToken;
  completion holds active-grant locks and fences stale token inside PostgreSQL.
  240s lease may permit repeated MODEL INFERENCE after expiry; do not claim
  exactly-once inference. Fenced persistence is NOT an ARK work receipt.
- The research #207 branch and public Arbor #159 data/sources are not Grove
  release parents; none may be merged into Grove to make Vercel previews work.

## Owner-confirmed Vercel reality / STOP gate

Owner screenshots: existing `grove-private-api` Vercel project connected to
`mikebuffan/Arbor`, Next.js, Root Directory `apps/backend`, outside-root
files enabled, Production Branch `deploy/grove-private-api-20260921`.
Old production branch points to `8999a570cf20b8496f984f62a298a58ef67d7217`
and DIVERGES from #209; preserve it for rollback. No verified successful live
Grove production deployment. Connected Vercel app still cannot read exact
Grove project ID/host/secret settings. Auto previews of unrelated research
branches had failed on old eager OpenAI constructor; newer preview checks
may be Vercel-rate-limited. No charge/upgrade authorized.

The optional ignored-build script `ops/grove/should-build-private-host.mjs`
is **NOT APPLIED**; if owner later approves installing it ONLY on the exact
Grove Vercel project, with backend root `apps/backend` configure
`node ../../ops/grove/should-build-private-host.mjs`.
It allows older production branch only at Production, and reviewed #208/#209
branches at Preview; all research/public/main/CI-only branches SKIP.
Changing Production Branch or selecting a new one is SEPARATE owner approval,
and must be accompanied by updating/reviewing this filter before promotion;
the script intentionally does not silently promote a preview candidate.

## Real first-Text release order / authorization gates

1. Fetch #209 HEAD + exact CI, inspect source ancestry/security tests; review
   final candidate and sign-off. No automatic merge into `main` or old prod.
2. Confirm exact existing private Vercel project ID/hostname and quota from
   owner console, protected server env and no unrelated Firefly cron.
3. Privacy review: retention/export/delete, backup/cascade semantics; reconcile
   manually applied bridge DDL vs Grove Supabase migration registry, then
   approve/apply BOTH exact proposed transcript/claim SQL to GROVE ONLY.
4. Admin invite real Grove owner; verify separate Firefly user account bridge,
   exact approved ARK project grants, Firefly conversation ownership; never
   guess UUIDs or seed demo/default users.
5. Independently hosted REAL Python+Qwen/LoRA LM receiver, TLS, protected
   HMAC/API keys, distributed nonce store, request size/timeout and cost
   receipts; no OpenAI fallback.
6. Initial private backend release has ALL sensitive chat/model/claim/creation
   flags OFF. Read-only `ops/grove/verify-private-host.mjs` against confirmed
   host after owner approval; no private model request/credential in this test.
7. After separate owner approval, enable specific pilot features, configure
   owner-only Android `--flavor grove` with real Grove publishable credentials,
   and physically verify account login -> thread -> model reply -> persisted
   complete pair -> force close -> reopen -> retry -> wrong owner/project
   denial -> revoked access. Source green ≠ real-owner acceptance.

## Rollback and failure truth

Do not reset/diverge old production branch or deploy to Firefly/public.
Return individual private feature flags OFF on failure; preserve approved
owner backup/retention expectations before removing grants or data. Missing
private project access, pending Vercel preview, missing claim migration,
unverified real LM, disabled flags and missing physical device proof each
remain HOLD. Never represent an offline test, doc, or built APK as a live
independent Arbor service.
