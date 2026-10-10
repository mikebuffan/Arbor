# Execution batch 7: owner memory controls and privacy

Parent: PR #390 at `3a9167251bf40177f37c29352d9b5b0995398429`, tree `57a97980c641789cd7d84cae4567f72e95aaea0d`. Draft source child, not merged or deployed. Historical subject-group numbering is separate. Fresh open-PR inspection found #390 current and preserved separately owned research PR #388.

## Actual repairs

Six existing API error branches leaked raw database messages: owner review (`GET /api/memory/items`), pin/discard/confirmFact item mutations, and confirmation candidate read/pending deletion. They now use the existing sanitized `routeErrorResponse`; authorization responses and successful item payloads remain supported. Existing DELETE read/write error redaction is retained.

DELETE previously reported the number of rows selected as the number deleted, without reading the mutation result. A zero-row or partial update could report total success. The mutation now repeats authenticated owner, selected scope, unlocked and not-already-deleted predicates, selects returned IDs, and requires all selected rows to have changed before returning success. A zero/partial result returns sanitized `409 memory_changed_during_delete`. Partial writes may already be committed: this is not transactional rollback or whole-account erasure. A lock acquired before the mutation is protected by its write predicate. RLS remains enabled and no policy is broadened.

Nine new route regressions failed before repair: six message leaks, two false-success outcomes and missing write ownership guard in the successful case. All 16 route tests now pass, including existing DELETE error redaction and foreign-project/owner negatives. Fixtures are synthetic; no live memory was changed.

## Five task outcomes

| ID | Work/result | Remaining acceptance |
| --- | --- | --- |
| B05 Firefly memory integration | Traced owned memory retrieval, actual prompt construction and authenticated selected-project shelf caller. Scope, eligibility and prompt freshness tests pass. | Hosted authenticated owner/project/schema/RLS readback and model usage; no private export import or broad capture performed. |
| B07 temporal memory validity | Existing latest correction precedence, stale alias retirement, current-row vector refresh and prevention of ordinary reactivation of retired records tested. | Full validity/expiry/conflict semantics across every source class are not implemented or proved by correction chronology; deployed temporal matrix needed. |
| B12 forgetting/scope isolation | DELETE completion and mutation guards repaired; exclusion/deleted/superseded/foreign-user/project/conversation negatives pass. | Hosted negative and reopened readback; this route soft-deletes selected memory_items, not all archive/runtime/model copies. |
| B13 Memory Review UI | Existing authenticated backend review/mutation routes traced; privacy errors repaired. Grove cards remain read-only with scope invalidation and pagination. | No established frontend correction editor caller found; full review/edit UX and real-device sign-out/scope switch remain unaccepted. |
| B14 Memory Library | Actual environment shell → MemoryStateView → scoped GroveMemoryShelfView → paginated shelf API traced. Existing saved-memory and document shelves preserved. | Unified primary-source archive/provenance browsing and installed-device acceptance; no new caller or archive ownership changes. |

## Verification and limits

- Local: 381 tests passed across 53 suites covering memory, durable correction writes, temporal precedence, promotion and actual prompt construction; counts include the 16 route checks.
- Backend TypeScript no-emit passed. External networking is denied by test setup; only fake provider credentials were used.
- All six deployment-fence tests and 193 exact composed-source pins passed before publication. Remote full regression/build result is recorded separately in the PR/assessment after completion.
- Current official Supabase update docs confirm `.select()` returns changed rows; changelog inspected, no SDK/schema/policy upgrade added. No live query, paid provider call, main merge, deployment, key/grant/settings change or data ingestion.

Group 7 remains PARTIAL with two concrete repaired defects. Source/fixture proof does not accept the deployed database, device or model. Continue one group at a time.
