# First bounded archive import

`boundedPlan.ts` adds an explicit 1–20-message import plan over the existing parser and write-free preflight. The fingerprint binds the source file hashes and byte counts, target user/project, selected source identities, original normalized positions, roles, timestamps and content. Verification rejects scope changes, modified payloads, changed source files, missing selections and duplicates. It does not invoke extraction, embeddings, database writes or the legacy numeric resume checkpoint.

## Live acceptance

Under the user's explicit request to import a reviewed first batch, six original messages from two previously read exchanges were selected as dated historical reference. They were inserted into the existing `historical_conversation_turns` table, using its existing source-identity indexes. This controlled batch used an owner-guarded SQL transaction through the authenticated database connector; it did not run the legacy bulk-import CLI or replace `upsertHistoricalConversationTurns`.

- Project ownership verified and locked during the insert.
- Archive count before: 0.
- First application inserted: 6.
- Exact rerun inserted: 0.
- Independent readback: all 6 rows match original content, role, position, source IDs and timestamps.
- Deliberately conflicting source payload rejected before writes; independent readback still matches all 6 originals.
- Deployed `get_arbor_memory_recall` returned all 6 records through owned lexical recall, with source and speaker attribution.
- One long response was clipped in tool output and explicitly marked `content_truncated`; full database content remained exact.
- Semantic lookup remains disabled, episodes and derived memory items remain empty. Retrieval does not elevate historical directives above current corrections.

The plan and selected private messages are saved separately from public source. No main-database transfer, global memory promotion, model call, schema migration, worker activation, merge or deployment was performed. The preview archive now has six historical turns; older empty-archive receipts are superseded for this project.

Validation: 712 backend tests across 129 files passed and TypeScript passed. The production Webpack build also passed; the final source-hash binding adjustment passed focused tests and TypeScript afterward. The deployed runtime remains the previously accepted `fea53` candidate; source-only plan tooling does not require deployment for the existing lexical recall route.

Remaining: wider reviewed import selection, global memory scope/supersession reconciliation, legacy bulk-import checkpoint binding, automatic capture/startup hydration, semantic backfill where authorized, fresh-session and foreign-owner live acceptance. The six-row controlled transaction does not prove the legacy CLI or automatic ingestion flow.
