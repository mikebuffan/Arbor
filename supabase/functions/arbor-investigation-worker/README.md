# Arbor investigation worker — source synchronization checkpoint

**Isolation notice (2026-09-21):** This folder was synchronized from the deployed **Firefly** Supabase Edge Function 'arbor-investigation-worker', reported as **version 5** with code-package SHA-256 'f70e2a8a84cc6b61c06dff62666ad053f2afb0f4b72e6099bce724c054f17734'. The deployed file content and import map were read through Supabase and independently compared for exact text equality against 'index.ts' and 'deno.json' on draft PR #123. This is source recovery, **not a deployment**. A later deployed version invalidates this checkpoint; re-fetch before changing or deploying the worker. Do not assume package hash equals SHA-256 of the index.ts text.

## Deployed v5 processor contract (observed, not inferred)

- Authorized POST using the existing worker-key hash check in the service database. Do not include the worker key or secret values in GitHub.
- A bounded batch (up to 10 claims per request) from the existing investigation task queue.
- 'source_fetch': HTTPS text/HTML/JSON capture, source URI, optional document ID, content SHA-256, capture metadata; queues 'text_ingest'.
- 'text_ingest': creates provenance-preserving chunks from captured source text.
- Unsupported task types are marked blocked. Binary/PDF fetch is **not parsed** by this version; it records a 'needs_document_parser' block.
- Reported source hash is of the captured/normalized text, **not of original binary PDF bytes**.
- Current v5 does not implement independent ARK 60-minute research-session claims, autonomous hour-long scheduling, PDF document parsing, claim verification, or Pattern Hop processors.

## Invariants for the next, separate increment

1. Keep production v5 unchanged while developing and testing the next processor in this draft.
2. Any source URL must pass a trusted-host/redirect and fetch-limit policy. Checking the initial 'https://' string alone is not SSRF protection.
3. Never treat a human-login page, DOJ age gate or other HTML response as a captured PDF.
4. Preserve source URI/document ID, 1-based physical PDF page, printed folio separately, extraction method, source file hash, and local excerpt for any extracted statement.
5. Network/parser timeouts must fit the remaining research session budget; late SQL settlement is rejected but does **not** retroactively prevent external processing cost.
6. Checkpoints are not completion, search misses are not proof of absence, association is not culpability.
7. Add new processor tests and disposable-DB integration tests before any deploy, scheduler enablement, or investigation task enqueue.
8. Preserve a rollback by saving the verified previous worker package.

See: docs/research/ARK_RESEARCH_BUILD_ORDER_20260921.md and docs/research/ARK_RESEARCH_SESSIONS_60M.md.

**Do not deploy this branch or merge the proposed research SQL merely because CI passes.** Live function updates, billing, and production investigation runs remain separate approval gates.
