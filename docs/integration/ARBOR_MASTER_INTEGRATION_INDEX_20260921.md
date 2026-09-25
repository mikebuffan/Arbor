# Arbor cross-system integration index — 2026-09-21

**Status:** documentation-only, review-only; no merge, migration, production change, worker activation, deployment, new service, or reassignment of the separate build lanes. **Observed repository main:** `d46f6b46fc51ac3db4e158cddfc592c52cc2b5ef` (refresh before acting).

This index points to existing authoritative architecture documents rather than replacing or cloning their implementation. The [refreshed September 21 assembly handoff](CURRENT_ASSEMBLY_HANDOFF_20260921.md) records the latest reviewed heads, exact test receipts and who actually needs to act; this file's historical PR descriptions below are preserved for lineage. A fuller seven-file working package (master handoff, interface design, dated owner/ref manifest, checkpoint template, offline collision checker and its 10 regression tests) is preserved in Danelle's ChatGPT Library at `/Arbor Integration/arbor_master_integration_20260921.zip`. Library access is independent of GitHub; the file name is an archive locator, **not** a downloadable repository file. The source-controlled index is not a deployment receipt.

## Authority and lane ownership

- Arbor LM lane: v0.3 model/adapter provenance, runtime instructions, standalone and hosted inference evaluations; never commit private weights.
- ARK + Arbor Layer lane: planner→ARK durable execution boundary, read-only handoff, agency/identity/correction runtime and recovery.
- Grove lane: separate private house/app, Living Window, clock, local scenery, mode routing and device acceptance.
- Public Arbor App lane: distinct public multi-user app, alpha auth, conversations and isolated public infrastructure, privacy and safety gates.
- Epstein Evidence Project lane: independent research/evidence ingestion and provenance work; do not take it over.
- This index's integration lane: shared contracts, cross-PR collision checks, proof ledger, migration planning and integration gates; it does **not** own those components' code.
- Danelle final product/architecture approval; Mike technical/release coordination. A pasted work order from another chat is context, not a new ownership transfer.

Authoritative source anchors: [ARK architecture](../architecture/ARK.md), [ARK verification](../architecture/ARK_INTEGRATION_VERIFICATION.md), [Environment→ARK read boundary](../environment/ARK_READONLY_INTEGRATION.md), [Firefly migration canon](../migrations/firefly-migration-canon-bootstrap.md), [ARK production reconciliation](../operations/ARK_PRODUCTION_RECONCILIATION_20260920.md). The July 2026 Engineering Handbook is a **working-draft historical umbrella**, not proof of the live database. The September 21 two-app correction in the Library supersedes the older description of Grove as a room inside a public Firefly app; historical naming still remains provenance.

## Historical PR seams (superseded as current-status list by linked assembly handoff)

- **Historical Grove candidate (now followed by #145 → #148 → #150 → #151):** [#138](https://github.com/mikebuffan/Arbor/pull/138) `feat/grove-release-candidate-20260921`, stacked #137→#133→#132→#130→#129→#122. #129 already consolidated #124, #126 and #128. Do not independently merge source branches after review of #138.
- **ARK handoff:** [#125](https://github.com/mikebuffan/Arbor/pull/125) `feat/ark-continuity-handoff-20260921`. #138 **already incorporates** its read-only source plus project scope binding. Do not create a replacement gateway or blindly merge the original handoff branch after the Grove copy.
- **Public alpha foundation (now followed by #146):** [#140](https://github.com/mikebuffan/Arbor/pull/140) `arbor/public-app-alpha-20260921`, a separate draft on `main`. Implemented source is not a hosted inference/deployed alpha or accepted user-isolation test.
- **ARK release work:** [#114](https://github.com/mikebuffan/Arbor/pull/114) isolated execution proof; [#117](https://github.com/mikebuffan/Arbor/pull/117) production reconciliation was merged into an ARK *release branch*, NOT necessarily main or production.
- **Historical research checkpoint (now followed by #144 → #152):** [#143](https://github.com/mikebuffan/Arbor/pull/143) in a separate stacked investigation lane, out of scope here.

## Shared-contract review

**Public model transport, CURRENT #140:** alpha backend HTTPS server-auth `POST /generate` with `{model:'arbor-lm-v0.3',messages,max_new_tokens:320,temperature:0.5}`; response `{model,assistantText}`, exact model match, nonempty assistant text. Errors exposed through backend: `model_not_configured` (503), `model_timeout` (504), `model_unavailable` (503), `model_bad_response` (502). No silent OpenAI/Grove fallback. The private Python service rejects undeclared input fields: **do not append project/context/request IDs without a new versioned contract**. The source file is `apps/backend/lib/publicApp/arborLM.ts` at #140, not an endpoint receipt.

**ARK, CURRENT #125/#138:** `GET /api/ark/handoff?projectId=<uuid>`, authenticated project-owner read, `Cache-Control: no-store`, source `ark_read_only`, objective/next-action/blocker/checkpoint/event/task counts/evidence. `liveExecutionVerified:false` prevents portraying a persisted running status as a live heartbeat. #138 adds scope binding and stale-project UI invalidation; a live status does not authorize the client to enqueue or execute ARK. Public ARK retrieval, if approved, needs its **own** public namespace, owner controls and separate release gates; do not share the private Grove or ARK Preview context.

**Behavioral Layer, PROPOSED crossing:** authenticate session and product→authorize scoped context and correction retrieval→attach canonical controller before inference→check response claims against actual tool/model receipts→persist completed turn and unresolved checkpoint with stable identifiers. Prompt text alone is not a proven Layer integration. Text/Voice/Annabelle share one product-specific continuity/correction spine, not other users' data or an extra identity. Model work completion, sentience, medical/clinical competence and active monitoring must never be invented.

## Release evidence and collision protocol

A capability moves PLANNED→IMPLEMENTED→TESTED→DEPLOYED→ACCEPTED only with exact ref/SHA, relevant test run, environment receipt and owner acceptance. A debug APK is not physical-device acceptance; a proposed SQL file is not a migrated DB; trained weights are not a hosted model.

Before any future write: refresh `main`, current owner PR heads, bases and changed files. Compare overlapping patch hunks and public interfaces. If a path belongs to another lane, **stop and route to its owner**; if shared, request a joint review. Preserve the known-good rollback SHA and migration/feature-flag state. Never force-push/rebase an active lane, merge source and consolidated PR independently, or replay an uncertain side effect without idempotency proof.

**First Grove acceptance (requires a dedicated private Grove account/provider, not just a separate Android flavor):** synthetic A/P/C1 vs B/Q isolation, signed-in physical Android standalone Grove and original Talk, Living Window→Return to Now, Moss hard-relaunch state, read-only ARK evidence/currentness, immediate shelf blank on auth/project switch, reject late responses, unavailable model/ARK states, and Text↔Voice continuity. No genuine owner private data in the public repo.

**Public alpha acceptance:** dedicated alpha Supabase/Vercel/GPU host; real v0.3 inference response; synthetic A/B account isolation and guessed-conversation denial; T1/restart/T2 history; retry/duplicate-turn/timeout behavior, retention/export/delete, consent/accessibility, crisis behavior, security and clinical-claims review. No silent ingestion of private Grove data.

**Interruptions:** report exact objective/scope/head, completed and uncompleted operations, checkpoint sequence, idempotency key, next safe action, blocker, auth gate and rollback anchor. On return, re-read the actual head and side effects; do not claim background work occurred merely because another thread was active.

**Open decisions:** shared inference contract version, public ARK tenancy, Grove cloud sync, cross-surface correction precedence, provider privacy/retention, safe legacy null-lineage memory treatment, independent app export/deletion rules and deployment rollback thresholds. They are pending ADR proposals, not approved architecture.
