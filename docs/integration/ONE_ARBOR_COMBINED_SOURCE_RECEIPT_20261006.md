# One Arbor combined source receipt — 2026-10-06

## Result and boundary

Isolated source reconciliation of three published workstreams. No source branch was overwritten, no PR merged, no production alias moved, no hosted database changed, no grants or worker flags activated, and no paid inference requested. This is a review candidate, not a live connection or behavioral acceptance receipt.

Inputs:
- Pattern Hop / historical controls / document research: `3f35463b` on `feat/pattern-hop-combined-source-20261006`.
- Behavior capture source: local `f1815d31`, tree identical to published `3430f69c52997c7af506de77d4b745c8d206874e` on `test/arbor-behavior-acceptance-20261006`.
- Grove phone recovery: `98e69d74` on `arbor/grove-phone-recovery-20261005`.

Normal three-way merges retained both lineages. Conflicts were resolved explicitly: independent read-task, Pattern Hop and behavior-test grants all survive; full test discovery survives; latest personality/calibration and contract version survive alongside Grove context/work-order support; seed contradiction protection survives; broader roundabout assertions survive. Duplicate chat imports and whitespace conflicts were removed. Existing migrations and deployment gates were retained.

## Integration findings and fixes

1. The document route directly instantiated privileged clients, violating the shared client-boundary contract. POST now delegates to a server-only research host boundary. That boundary itself authenticates, validates strict input, proves project ownership and session access, checks feature/integration gates, and only then obtains an admin client. Existing route tests still exercise foreign/missing ownership, closed gates, STOP and readback failures. GET remains user-scoped.
2. The expanded canonical identity creates a 16,200-character fixture prompt, exceeding the older test's 12,000-character assumption. Full canonical identity is preserved. Behavior projection now has an explicit 24,000-character fail-closed ceiling; excess raises `arbor_behavior_context_too_large` rather than silently cropping identity or corrections. This is not a receiver schema upgrade. The independent transport's 32 KiB UTF-8 envelope cap remains unchanged and may reject shorter histories once complete context is included.
3. The pinned private LM receiver contract is `2026-09-21.1`, while current canonical behavior is `2026-10-05.1`. This mismatch remains an explicit RELEASE HOLD. A new combined test proves rejection before network/inference. Do not relabel current identity with the old version merely to pass the receiver. Receiver source/schema, identity budget and full signed envelope must be reconciled and tested in the LM workstream before private chat activation.

## Verification

- Full backend suite: 1,198 passed, zero failed, one skipped (1,199 total).
- Skipped: actual signed-envelope passage through the preserved Python receiver; `GROVE_LM_RECEIVER_SOURCE` is not supplied in this checkout. Mocked transport checks are not receiver or model proof.
- Offline Node scripts: 26 passed across comparison preparation/audit and private host/build/release guards.
- Combined optimized Next.js Turbopack build passed, including TypeScript, static page generation and route registration, using CI placeholder credentials. No real account/model/DB calls were used.
- The first local font-fetch build failed on TLS; retrying with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` and system certificate bundle passed. No application font/layout/config change was made.
- Whitespace checks passed.
- Flutter is unavailable in this workspace. No analyzer, device APK or mobile UI acceptance is claimed.

## Deployment and remaining connection steps

Read-only Vercel recheck still shows latest attempted preview ERROR at `446404000792487d928c6e47bb7ba4c4ba34dc03`; that partial source is older than the reconciled Pattern Hop runner. The newer combined local build passes. The Pattern Hop workstream's current checked-in deployment receipt reports HTTP 402 `api-deployments-free-per-day`, 100 used / zero remaining, reset October 6 at 7:56:01 PM America/Los_Angeles. This pass did not retry or independently consume that deployment quota.

Remaining:
1. Review exact atomic combined source; preserve the Grove-specific build filter and separate protected-host release rather than silently relaxing either.
2. Obtain a READY isolated sandbox preview after deployment quota permits, using a reviewed exact commit. No production promotion.
3. Verify installed MCP tool profile, actual OAuth client/project grants and existing worker gates; refresh connector only when required.
4. Run the single bounded behavior canary with scoped receipts, read back complete captured JSON, then judge behavior separately from capture completion.
5. Reconcile the pinned Python receiver contract and envelope budget separately; run receiver, Flutter and device checks before Grove private chat.
6. Actual memory after restart, correction behavior, duplicate paid-action prevention, model personality and voice acoustics remain live acceptance items. Source tests do not close them.
