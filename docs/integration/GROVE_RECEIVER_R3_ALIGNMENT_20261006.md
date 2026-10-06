# Grove host and private receiver r3 alignment — source acceptance

This bounded child starts from PR #254 at immutable head `ed843a9d187c38caf176bdf57e8c6cd1eb4d9c1f` (tree `106c801ff33a201224adc291da07ac93cbd73a0c`). It preserves the moving Buffalo branch, original app, restored private phone implementations, ARK engines and memory/archive ownership. No production merge, deployment, hosted migration, account grant, real model loading, inference, private import or execution activation occurs here.

## Supplied receiver and repaired mismatch

The supplied private `Arbor_LM_One_Arbor_Receiver_r3_Source_20261006.zip` has SHA-256 `3da204d51f98d35c4d065534feb2b2de4d9d223b25b735418ed7a9210d93235d`. All 66 current manifest entries verified. Its bytes remain private and are not included in this repository. The receiver source is a candidate, not evidence of a deployed runtime or real weights.

The restored #254 host still pinned the historical behavior contract and 32 KiB signed body. This child:

- Pins exactly behavior contract `2026-10-05.1` and receiver revision `2026-10-06.1`; the old contract and absent/old revision reject. No broad version allowlist.
- Matches receiver r3's 98,304-byte raw UTF-8 body ceiling. Context remains complete; nothing is silently truncated. The receiver independently enforces its 32,768-character behavior limit, 128 guard rules, strict schema, freshness and actual-tokenizer/model-context budget.
- Preserves existing HMAC over exact bytes, no redirects, scope checks, unchanged 13-turn/12,000-character history limits, foundation/adapter/card consistency checks and unverified-text/no-execution receipts.
- Strengthens the actual TypeScript → Python fake-model fixture to assert canonical identity, requested-conversation goal, runtime and permanent corrections, owned memory source reference and host UTC offset at generation. The fixture supplies the actual current user text to the existing recall seam; without it, recall is intentionally absent. Synthetic assertion failures remain visible in the fixture, without changing production error handling.
- Adds an isolated backend-only CI workflow and child-branch deployment skip guards in all three configurations. Existing schedules remain unchanged; the dedicated Grove config still has no cron.

## Verification

- Receiver: **90 passed, 1 skipped** across `tests` and `evaluation_next`. The skipped original adapter archive test requires the separately preserved private adapter; this source ZIP contains no weights/archive. No model is loaded.
- Combined backend: **941 passed, 0 skipped**, 149 files. This includes **156 affected host/Layer tests**, including actual signed TS → Python receiver r3 → fake generation → TS response validation. Do not add subset counts.
- TypeScript: passed. Dependency lockfile/workspace manifests unchanged. Whitespace checks passed.
- Production Webpack and default Turbopack builds: passed. Initial default build failed fetching Google Fonts due to local TLS trust; its retry with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` passed, without changing source or disabling certificate checks. Existing middleware/Sentry warnings remain.
- Parent #254 exact-head GitHub run **37420167073**: independently read as successful for both backend-source and phone-source. Phone job includes focused/full Flutter checks and synthetic Grove and original Arbor APK compilation. This child does not change phone source; inherited CI does not establish installed package/signing or physical-device behavior.
- Deployment guard commands were parsed and executed for this child: all three skip it, with original schedules preserved.

## Remaining acceptance, in order

1. Review this narrow child against current One Arbor/Grove integration heads; use the existing master integrator. Do not merge overlapping #252/#254 implementations wholesale or overwrite the moving integration branch.
2. Approve and identify a dedicated private host/receiver release and compute budget. Receiver r3 defaults to 2,400 input tokens; the supplied r3 handoff's tokenizer-only fixture measures 4,020. A future explicit 8,192 ceiling is a proposal, not active configuration or a guarantee for full history. Actual loaded foundation context plus 170 output tokens must fit; reject oversize rather than dropping identity/corrections. Verify exact foundation/adapter/tokenizer and deployed revision independently.
3. Review existing transcript/claim SQL/RPC, retention and denial acceptance; separately authorize any hosted provisioning. Verify owner invitation, owner bridge and explicit project/conversation grant through the existing broker. Keep secrets in approved storage. This source pass does not establish real owner grants.
4. Choose the approved independent Grove package ID/signing identity and private phone config. The existing release guard remains present. Build through the safe runner; install on Danelle's Android phone after approved provenance is recorded. A computer is not required for the source work or eventual phone interaction; installation/account prompts require Danelle.
5. Denial checks precede a separately budgeted real Text turn. Record actual host boundary/context, request UUID, provider reply and fenced transcript readback. Run retention OFF/ON, kill/reopen, lost-response/same-ID retry, changed-text conflict, write/readback failure, revocation and time checks. No automatic resend or new UUID on an uncertain send.
6. Private Voice is not connected; source Text/Voice parity fixtures do not permit live private Voice activation. Private chat still has no reviewed objective-scoped ARK checkpoint writer. Keep those stages BLOCKED pending their separate existing-owner connections; do not replay the consumed first canary.

Live replay/rate protection remains a protected-runtime gate: receiver nonce/generation guards are process-local. Restart/replicas and expiring transcript leases do not prove exactly-once GPU execution. Runtime goal and bounded objective-window context do not establish selected work, authorized execution or completion.

No owner terminal action or screenshot is needed to review this source result. Live activation still requires the previously retained explicit authorization boundary.
