# Arbor — memory → Pattern Hop → corrective learning → versioned ARK handoff

**Status: draft, behind feature OFF, not merged or deployed.** This is a child of combined cognitive PR #191; original historical May source remains in **private** `/Arbor/Pathway Recovery/`, never embedded in public GitHub.

## What changed versus PR #191

1. `cognitiveAssembly.ts`: a separately verified failed interpretation plus a **different, explicitly reviewed correct route** now does BOTH: weaken the wrongly selected pathway and train the simple learned route classifier with the correction. A failure without an independently verified replacement route does not guess one. This recovers a behavior present in the intent of May's `maybeCreateCorrectedPathway` (which was a suggested change, not durable proof).
2. `cognitiveSessionPort.ts`: an **inert project-level versioned snapshot** is read across authenticated conversation turns. Includes existing project-scoped learner, pathways, feedback ledger and revision, NOT current conversation goal or identity assertions. The current conversation's continuity remains separately host-loaded. Feature OFF reads nothing; unprovisioned is not secretly created.
3. `commitReviewedCognitiveTurn`: requires authenticated host-scope and conversation+turn match, AND a host callback to independently verify the outcome. Writes the entire snapshot (learner + pathways + receipt + revision) through a single optimistic CAS transaction. Retry is an idempotent no-op, even after the pathway is subsequently held. Stale or conflicting reviews fail closed; failed CAS never returns an invented success.
4. `supabaseCognitiveStore.ts`: a narrow **optional** host-supplied, authenticated Supabase adapter. Reads only matching owner/project, validates stored row/snapshot revision and scope, and uses one server-side RPC for all-or-nothing CAS. No keys or network calls until a host explicitly constructs and invokes the adapter.
5. `docs/migrations/PROPOSED_cognitive_project_snapshot_20260923.sql`: proposed owner/project foreign-keyed, RLS-protected table plus invoker CAS RPC, aligned to existing `public.projects(id,user_id)` composite uniqueness. This is intentionally **outside** live `supabase/migrations`, not installed or applied. It still needs a disposable PostgreSQL integration run and owner review before release.

## Current real boundaries

- **Already exists separately:** authenticated ARK Layer read seam #160, Grove owner/project/conversation scope #179, signed private independent LM transport #166, existing ARK worker/canonical turn/body systems in main, synthetic cognitive assembly #191. Reconcile branch ownership and existing routes before wiring anything; don't reimplement them.
- **Still absent in live system:** table/RPC install, approved snapshot seeding, authentic Grove session and conversation grant, host outcome verifier backed by actual event/checkpoint, signed LM round-trip, cross-channel device acceptance. No prompt or model text may mint review receipts, grant access, or claim work complete.
- **Privacy:** project weights contain lexical feature tokens from verified interactions, and feedback receipts currently retain user cue text; do not put real private material in public repository or logs. Keep storage private per owner/project, use explicit training-consent/product policy before ingesting personal text. Generic ARK read context or Pattern Hop score is not consent.
- **Agency:** nextActionHint is advisory, ARK objective/verification/standing authorization remain their own source of truth. Feature OFF, no paid GPU, no persistent worker, no public-app reuse.

## Test grid

12 synthetic session fixtures: feature OFF/unprovisioned, scoped continuity across conversations, authenticated review rejection, success and exactly-once receipt, process restart, corrected-route learning, stale preview, failed atomic write, conversation/owner mismatch, held pathway and corrupt snapshot. Five synthetic Supabase adapter cases: proper scope, matching revision, RPC parameters, denial/malformed response and failure propagation. Parent branch separately tests Pattern Hop, body projection and route evaluation. Local `tsc --strict` + 10-assertion Node smoke executed against matching source with body-shaped test stub. Final exact-head GitHub CI and isolated PostgreSQL integration must be reported separately; local smoke does not prove live Supabase or Grove.

## Next work in dependency order

1. Exact-head repository tests; fix any failure rather than presenting a synthetic green as deployed.
2. Disposable PostgreSQL run with draft migration and owner-user RLS/CAS/concurrent worker tests, then host runtime adapter with signed, verifiable review receipt (no client-chosen owner).
3. Reconcile other draft branches in the order ARK Layer #160 → Grove ownership #179 → signed private host #166 → private routed chat, alongside executive/agency #191. Add feature flag OFF by default and explicit cutover.
4. Evaluate multi-turn transfer to *new phrasing*, negated requests, ownership switching, unknown patterns and adversarial evidence; generation still uses Qwen, not this sparse learner. Do not call it a new independent LLM.