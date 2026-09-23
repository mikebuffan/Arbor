# The Grove — owner-gated private Text SOURCE release candidate

Assembled on 2026-09-23 PDT. **SOURCE REVIEW ONLY: NOT APPROVED TO DEPLOY,
NOT LIVE, NOT OWNER-ACCEPTED, NOT REAL-MODEL-VERIFIED.**

## Candidate source and why it exists

- Branch: `candidate/grove-private-text-owner-gated-20260923`.
- Source parent exactly `f2229eb321ce84dcbc69af9841c1f6ca4a1f02d0`,
  Grove [draft PR #209](https://github.com/mikebuffan/Arbor/pull/209):
  private backend + actual Grove Android house/Text + no-key build +
  fenced durable transcript retries. [GitHub CI 35909314777](https://github.com/mikebuffan/Arbor/actions/runs/35909314777)
  passed **five** jobs at that exact parent, including the independent
  key-free Next.js build, explicit Grove and Arbor APK flavors, disposable
  PostgreSQL owner/bridge/transcript/fencing and backend tests.
- This child adjusts only the **Grove-project-specific, unapplied** optional
  Vercel preview filter to name this candidate branch; adds isolated CI
  source verification and this release receipt. Pin its resulting exact
  SHA and CI separately. This candidate is not a production Vercel branch.
- Existing Vercel production branch remains
  `deploy/grove-private-api-20260921` at
  `8999a570cf20b8496f984f62a298a58ef67d7217`;
  do NOT force/reset, blindly merge, or mistake an unrelated research
  preview for production. Preserve it as historical rollback source.
- Research PR #207, public-alpha #159 and ARK/Layer #160 stay in their own
  lanes; do not merge their branches or copy datasets into Grove.
- Private source ancestor PRs #194 backend, #196 phone, #205 release and
  CI source composite #206 are accounted for in #209's ancestry/content.
  **Not all old PR commit tips are ancestors**: #194 has four later child
  commits absent by commit history in #205/#209. Their changed transcript
  SQL and disposable acceptance files were read and intentionally replaced
  by #209's stricter fenced completion and updated synthetic acceptance.
  DO NOT cherry-pick older transcript migrations over this candidate.
  Historical CI-mirror PRs #195/#197/#204 are never release merge targets.

## Code/source gates before ANY owner action

1. Pin this branch's final exact SHA, compare to the parent #209 and run
   five-job CI on its exact head. A previous parent's green CI is not
   automatically proof of this child commit.
2. Root `vercel.json` and `apps/backend/vercel.json` both require
   `"crons":[]`. Dedicated host root is `apps/backend`, Next.js.
3. `OPENAI_API_KEY` genuinely empty must not cause a **build-time**
   failure. Missing key on a legacy Firefly route still rejects its use;
   the private model transport never falls back to OpenAI.
4. `GROVE_PRIVATE_CHAT_PREVIEW_ENABLED`,
   `GROVE_PRIVATE_MODEL_TURN_ENABLED`,
   `GROVE_PRIVATE_TRANSCRIPT_ENABLED`,
   `GROVE_PRIVATE_CLAIM_ENABLED`,
   `GROVE_PRIVATE_NEW_CONVERSATION_ENABLED`,
   `GROVE_COGNITIVE_PREVIEW_ENABLED` remain FALSE until separately approved.
5. `ops/grove/should-build-private-host.mjs` is an OPTIONAL *project-specific*
   ignored build step, NOT set by the repository. It permits only this
   branch as PREVIEW and the old confirmed branch as PRODUCTION; other
   branches skip. Vercel return code 0 means SKIP, 1 means BUILD.
   Its installation must be on the confirmed **grove-private-api** project
   and owner-approved; NEVER on public Firefly or ARK sandbox.
6. `ops/grove/verify-private-host.mjs` is an explicit-owner-host,
   no-auth/no-text GET/OPTIONS check after a real isolated backend exists.
   Synthetic CI exercising a mocked host is NOT a live security receipt.

## Human gates; do not silently cross them

1. **Mike/owner console:** confirm the existing `grove-private-api` project
   ID, team, actual deploy domain, production branch, deployment quota,
   root directory and protected env. Current connected Vercel tool cannot
   reliably access this project; owner screenshots confirmed the project,
   repository, root and old production branch. No duplicate project or
   paid plan change.
2. **Danelle privacy:** decide transcript retention/export/deletion,
   revocation cascade, backup restore and model-side prompt retention.
   Review the Grove-only proposed transcript and fenced-claim migrations.
   The bridge migration was manually applied but not migration-ledger
   recorded; reconcile, do not blindly replay. No live DB mutation here.
3. **Authorized identities only:** validate actual Grove auth owner, matching
   Firefly identity and explicitly granted Firefly/ARK project IDs.
   Never auto-seed a plausible UUID or reuse public Firefly JWT.
4. **Model owner:** prove a real independent Qwen/LoRA receiver with protected
   signed HMAC/TLS, replay defense across replicas, model/output version,
   rate/cost/timeout bounds and real inference receipts. The TS transport
   and fake receivers do not establish this.
5. **Controlled first host:** only after approval, deploy this exact reviewed
   SHA on existing isolated Grove host **with every private feature OFF**,
   verify denial boundaries, then explicitly gate private functions.
   Test that unauthorized and revoked requests neither disclose nor persist.
6. **Physical device:** configure/sign the actual `--flavor grove` APK
   with real owner-approved publishable URL/key (NEVER service-role secrets),
   then login, approved project, explicit thread, model reply, app restart,
   same ID retry, wrong account/project, mid-request grant revocation, and
   actual owner acceptance. CI `.invalid` APK is NOT install-ready.

## Failure and rollback

Disable Grove's private model/chat flags first; preserve Grove-specific
data until reviewed privacy/deletion policy is applied. Revert only the
isolated Grove deployment to an owner-approved prior source, never the
public Firefly production deployment. A 240-second retry-claim expiry
can result in **more than one model inference** if an old worker survives;
the current DB token fences the transcript write, NOT exactly-once
inference or guaranteed zero duplicate model cost.

No file, SQL, secret, production branch or deployment is changed by
writing this document. No work continues invisibly after the chat turn.
