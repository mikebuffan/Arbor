# One Arbor independence — actual chat loop completion-response boundary

**Source-only review continuation** of #383 at exact head `15aaae464f1344031941d6219406970c306324fa`. Unlike the canonical `runAgency` helper, the connected chat request path directly uses `runOpenAIAgencyAgent`; this bounded hardening is aimed at that existing loop.

The source agent could receive provider `status="incomplete"/"failed"` with convincing final text, or `status="completed"` with blank text and no tool calls, and emit a `status="complete"` result when verification was disabled or potentially route failed provider artifacts into tool execution. Treat *explicitly* noncompleted provider statuses or malformed output arrays as internal checkpoints before executing any tool or forming a completion. Treat an empty completed text response with no tool calls as an internal checkpoint. Preserve legacy missing status for existing synthetic callers; real behavior proof remains separately gated.

Seven new synthetic tests (including parametrized failed/queued/incomplete status cases) verify no false completion, no tool calls on uncompleted provider outputs, no blank final response, positive completed answer and mid-chain unfinished-provider checkpoint after a prior read. The native chat route already responds to internal `checkpointed` state with a non-final 202, not a user-visible completed turn. No changes to hosting, worker, ARK operations, approvals, idempotency, paid inference or user data.

A verified exact-head CI run is REQUIRED before saying this source repair is green. This is not deployed behavior proof or independent model judgment.
