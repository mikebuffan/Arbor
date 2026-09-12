# Milestone 1B backend closeout evidence

Date: 2026-09-11

Frozen base: `01a9c95108bd6b30bde7f1eaad7b247d8ca45187`

Branch: `codex/milestone-1b-backend-closeout`

## Bounded correction

The final implementation pass changes only request-reachable diagnostic
exports plus their security regression and closeout documentation. Functional
fallback and retry behavior is unchanged.

Corrected paths:

- continuity fallback;
- episode get-or-create fallback;
- memory-reset failure;
- prompt-cache invalidation after identity-anchor promotion;
- `safeQuery()` console, Sentry, and tracing exports.

Each path now exports a fixed subsystem and operation, a bounded safe
code/category, and a resource type. `safeQuery()` additionally exports the
one-based retry attempt, maximum attempts, and whether another retry is
scheduled. No request/trace identifier was already available at these call
sites, so none was invented or copied from untrusted input.

Raw caught exceptions, messages, stacks, user/project identifiers, private
content, prompts, credentials, authorization material, signed URLs, SQL
internals, and provider/database payloads are not exported. `safeQuery()` is
retained and keeps its original retry/fallback behavior.

## Current contract summary

- Explicit corrections are durable before successful acknowledgement.
  Resolution failure is `409 correction_unresolved`; an unexpected internal
  failure is redacted `500 server_error`.
- `interactionMode` is `text | voice`, defaulting to `text`. A logical send
  requires UUID `turnId` and reuses it for retry/reconnect.
- Current chat orchestration includes runtime and agency participation;
  bounded `409 agency_boundary` protects an incomplete agency boundary.
- Canonical assistant persistence is the exact post-guard/post-fallback text
  returned to the user.
- `chat_completed`, telemetry, and decisions are observational. Ordinary
  extraction/reinforcement is enrichment. Assistant speech is context, not
  independent evidence for durable user facts.
- The daily Vercel heartbeat schedule exists, while valid execution remains
  fail-closed/inactive until separately approved machine authentication is
  configured. Conversation does not depend on heartbeat, decay, or reflection.

## PR #3 reconciliation

PR #3 contained no unique required behavior on the frozen base. Eight runtime
and core-test files were byte-identical to current code. Its only remaining
diffs were stronger current sensitive-log coverage and equivalent regex quote
syntax. It was closed unmerged as superseded by PR #34/current main, with its
historical live evidence preserved in the close note.

## Verification record

The exact candidate must pass the complete/focused Vitest matrix, applicable
Arbor control-backend tests and build, standalone TypeScript, production
backend build, changed-file ESLint, `git diff --check`, raw-sensitive-logging
and service-role scans, the eight-file local/live migration ledger comparison,
and a pinned Supabase CLI dry run with no pending or remote-only migration.

The historical Michael/Mike failure remains documented in the live-acceptance
audit. It is not waived for this closeout; the current exact-candidate result
is classified from the fresh run.

Publication is Draft-only. Synthetic live data and comprehensive live
acceptance remain behind Mike's next explicit approval gate.
