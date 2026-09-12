# Arbor backend closed-beta readiness

Date: 2026-09-12

## Purpose

This document is the canonical backend disposition for Arbor closed beta. It separates required backend work from frontend/product work and post-beta enhancement so the backend cannot remain indefinitely unfinished.

The Milestone 1B acceptance source is PR #54 candidate `2819a0b1ff0bb20b6e327423c1979deb80e678a4`, exact preview `dpl_98uG6fvfRa7BbsMM5r4JwD1nhAUM`. The broader beta-finish work is carried on `arbor/backend-beta-finish` and must pass the normal integration CI plus `pnpm --filter firefly-backend test:beta-gate` before merge review.

## Current conclusion

**BACKEND HOLD — finite release checks only**

No known unfinished foundational backend architecture remains on the accepted closed-beta product surface. The remaining hold items are operational acceptance conditions:

1. Complete the focused PR #54 exact-preview live acceptance after usable OpenAI quota/model capacity is available.
2. Confirm a published Vercel Firewall rate-limit rule protects the expensive closed-beta API surface.
3. Record the Firefly backup tier and recovery method appropriate to the beta environment before admitting external beta data.
4. Require integration CI, build, migration reconciliation, beta gate, and preview deployment success for the final beta-finish PR head.

If those checks are green and no new correctness/security/privacy defect is found, the conclusion becomes **BACKEND READY FOR CLOSED BETA** without additional architecture work.

## Frozen closed-beta product contracts

### Conversation and session — complete

Canonical application behavior is:

- authenticated project ownership is required;
- a conversation belongs to one authenticated user and project;
- the client may continue an existing owned conversation or create a new conversation;
- new-thread behavior preserves the active project and clears the conversation identifier;
- each logical model turn uses a durable `turnId`;
- same-turn retries converge rather than creating duplicate authoritative or observational effects;
- successful text and voice turns share the canonical Arbor turn/session path;
- successful chat returns the exact persisted assistant response;
- history reopening uses the conversation routes rather than direct client table inference;
- validation, auth, ownership, agency, correction, provider, and server failures use bounded frontend-consumable error semantics.

Conversation route database failures are redacted to `server_error`; raw database exception messages are not part of the client contract.

### Memory authority and user controls — complete for exposed beta surface

Authoritative behavior:

- explicit user correction is durable before acknowledgement;
- stale aliases converge/tombstone rather than remaining simultaneously authoritative;
- assistant-only recall cannot silently become user truth;
- project-scoped retrieval is isolated from foreign projects;
- ordinary conversation does not depend on background memory maintenance;
- backend routes exist to list/view memory, correct memory, delete memory, reset memory, and export memory.

The current beta client does not expose a full memory-management UI, so no larger memory administration platform is required for beta.

Known deferred limitation: Firefly currently enforces `UNIQUE (user_id, key)` on `memory_items`. That prevents the same logical key from being stored independently in multiple projects for one user. The closed-beta client stores one active project per user and does not expose multi-project creation/selection, so this limitation is outside the accepted beta surface. Before multi-project memory is exposed, replace this constraint with scope-aware uniqueness and add live cross-project insertion evidence.

### Settings — complete for current beta surface

Only settings actually exposed by the current client are beta requirements. Device-local client state remains device-local. Unsupported disappearing-message behavior fails closed rather than implying unsupported durable semantics.

Any future setting intended to follow a user across devices must gain an authenticated durable backend contract before the UI exposes it.

### History / continuity — complete for current beta surface

The backend provides conversation creation/continuation, latest-conversation lookup, conversation listing, canonical turn persistence, and shared Text/Voice runtime continuity.

Full user-facing conversation deletion is not exposed by the current beta client and is therefore deferred until the product exposes that control.

### Account privacy controls — dispositioned

Implemented backend capability includes memory deletion/reset/export and attachment deletion.

The current beta client does not expose account deletion, project deletion, full conversation deletion, or whole-account export. These are not silently promised beta controls and are intentionally deferred until product UX exposes them. They must be implemented before such controls are presented to users.

No destructive real-user cleanup operation is part of the automatic beta release procedure.

### Safety and error contract — complete

Canonical safety/postcheck behavior remains on the Text/Voice turn path. Frontend-visible failures are bounded and must not include raw provider payloads, database exception payloads, credentials, prompts, transcript content, memory content, authorization headers, SQL, or signed attachment URLs.

Stable categories include validation/auth/ownership failures, `agency_boundary`, `correction_unresolved`, bounded provider failure, and `server_error`.

No beta route may bypass the canonical safety/postcheck path for an ordinary Arbor turn.

### Attachments — backend security complete; upload UX not in beta

Attachment ownership, project/conversation scoping, broker access, and deletion boundaries are implemented and regression-tested. The current Flutter beta surface does not expose a user attachment-upload lifecycle. Therefore a new upload product flow is not a backend beta requirement.

If attachment upload is later exposed, that release must include type/size validation, upload ownership metadata, retrieval, deletion, orphan cleanup, and stable client errors as one complete lifecycle.

### Provider resilience — complete, live acceptance pending

The provider path uses bounded retry for transient model failures and fails closed after exhaustion. Permanent quota/account availability failures are not converted into endless retry storms. Provider bodies are not returned to clients or copied into diagnostics.

PR #54 live smoke reached Vercel, deployment protection, Arbor auth, Firefly, request validation, and the model-agency boundary, then repeatedly received provider HTTP 429 responses. This remains an external acceptance-environment blocker until quota/model capacity is usable.

### Operational diagnostics — complete for beta

Operators can distinguish bounded stages/failure families without reading private user content. Runtime/platform error aggregation plus Arbor's allowlisted diagnostics are sufficient for beta diagnosis.

Observed historical evidence: one `/api/chat` platform timeout occurred on 2026-09-11 before the current provider retry/reset-window candidate. It is recorded as historical evidence, not a reproduced current-candidate defect.

### Rate limiting / abuse protection — release check

Do not add process-local serverless counters and call them durable rate limiting.

Closed beta uses Vercel Firewall as the edge abuse boundary. Before beta admission, publish and verify a rate-limit rule covering expensive API paths, with `/api/chat` and Voice included. The exact threshold is an operational beta parameter, not an application architecture contract.

Authentication and ownership checks remain mandatory even when the firewall is active.

### Privileged surfaces — complete and bounded

Service-role/admin/machine privilege remains limited to explicit backend helpers and administrative/maintenance paths. Ordinary conversation must not depend on heartbeat, decay, reflection, or successful machine-authenticated maintenance.

`cleanup_expired_messages()` is currently `SECURITY DEFINER` with fixed `search_path=pg_catalog, public`; `anon`, `authenticated`, and `PUBLIC` do not have execute privilege.

No mystery client-accessible service-role path is accepted for beta.

### Heartbeat / Cron / maintenance — intentionally not required

Heartbeat/maintenance is not a closed-beta dependency. Machine-authenticated maintenance may remain inactive/fail-closed. Persistent decay and reflection remain quarantined and must not be activated merely because code exists.

### Database integrity and migrations — complete at 1B baseline

Accepted Firefly/repository migration ledger at the 1B source candidate contains exactly eight migrations:

1. `20260823175536_firefly_public_baseline.sql`
2. `20260823175539_firefly_storage_attachment_policies_baseline.sql`
3. `20260823175543_milestone_1b_attachment_scope.sql`
4. `20260829070348_fix_attachment_scoped_metadata_policy.sql`
5. `20260910_arbor_linear_runtime.sql`
6. `20260910204000_arbor_agency_strategy_candidates.sql`
7. `20260911033524_arbor_runtime_state.sql`
8. `20260911174750_backend_closeout_hardening.sql`

The beta gate fails on unexpected migration-ledger drift. Accepted historical migration files are immutable.

No schema change is required by the beta-finish branch described here. The deferred multi-project memory uniqueness correction must be a later reviewed migration when multi-project UX becomes a product dependency.

### Backup / recovery / rollback — release check plus documented procedure

Application rollback uses an immutable prior Vercel deployment / Instant Rollback rather than pretending a source revert is instantaneous production recovery.

Database schema rollback is not assumed to be reversible. Migrations must be forward-compatible; a schema/data incident uses the configured Firefly recovery mechanism rather than an automatic down migration.

Before external beta data is admitted, record which Supabase tier Firefly is on and one of:

- paid tier: confirm the applicable automatic backup retention (and PITR only if separately enabled/required); or
- free tier: take and retain an external logical database dump according to the beta backup procedure.

A release is unhealthy when required CI/gates fail, the preview cannot complete a bounded authenticated turn, auth/tenant isolation fails, persistence diverges from returned output, or runtime error evidence shows a new reproducible correctness/security/privacy defect.

## Reproducible backend release gate

Every beta backend candidate must satisfy:

1. backend tests;
2. `pnpm --filter firefly-backend test:beta-gate`;
3. production backend build;
4. control-backend tests/build where applicable;
5. migration ledger reconciliation / no unexpected pending migration;
6. auth and ownership isolation regression evidence;
7. turn durability and same-turn retry convergence;
8. memory correction/tombstone regression evidence;
9. safety and sensitive-output/logging regression evidence;
10. required attachment authorization evidence;
11. provider connectivity on the exact candidate;
12. bounded synthetic live acceptance and verified cleanup;
13. published edge rate-limit rule verified for expensive endpoints;
14. backup/recovery method recorded for the beta database tier.

Do not invent a different release ritual for each candidate.

## Deliberately deferred / not beta blockers

Unless the product surface changes, these do not block backend completion:

- multi-project same-key memory schema support;
- semantic/vector retrieval expansion;
- richer provenance schema;
- weighted multi-source arbitration;
- temporal reasoning framework;
- automatic decay;
- reflection;
- generalized durable queue/outbox infrastructure;
- broader heartbeat/maintenance automation;
- advanced self-model/persona work;
- deeper Framework architecture;
- richer system-observed authority;
- long-term strategy/self-update sophistication;
- arbitrary custom modules;
- full account/project/conversation deletion UX before the product exposes it;
- attachment upload UX before the product exposes it;
- generic Supabase advisor/performance cleanup without a demonstrated correctness/security problem;
- architecture cleanup whose only benefit is elegance;
- broad legacy lint cleanup;
- performance optimization without an observed beta problem.

## Final promotion rule

Promote this document to **BACKEND READY FOR CLOSED BETA** only when the four finite release checks at the top are green. Do not add enhancement wishlist items to the hold list unless the accepted beta product surface materially changes.
