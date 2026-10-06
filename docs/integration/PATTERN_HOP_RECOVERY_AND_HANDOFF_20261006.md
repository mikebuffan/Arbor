# Pattern Hop recovery and handoff

This change builds on PR #236's bounded MCP queue bridge. It fixes incomplete retrieval being mistaken for an exhausted branch, preserves the query on source failure, and exposes a provenance-backed continuation handoff through the existing agency tool.

Any failed historical, memory or timeline source leaves the exact frontier item unvisited and blocks that pass. Successful empty retrieval from all routes can exhaust a branch; unavailable retrieval cannot. A new explicitly requested pass can retry a preserved source-failure blocker. Retrying the same queue request replays its prior blocked result without re-execution. Older blocked records with an already-lost frontier are not silently reconstructed.

The runner checks a monotonic time budget before each retrieval unit (default 15 seconds, maximum 60 seconds), and supports a trusted host AbortSignal. Cancellation during retrieval preserves that query for later work. These are cooperative boundaries; they do not forcibly abort in-flight embedding or database calls. The deployed worker does not yet expose a remote cancellation endpoint or pass a cancellation signal. Longer sessions must use the existing bounded research-session runner after its adapter and gates are verified, rather than adding an unattended loop here.

The runtime projection now carries parent/depth, source, thread/message/artifact IDs and retrieval method. The agency receipt contains a handoff with seed, saved depth, bounded next queries, contradiction evidence IDs, blocker and pass stop reason. It does not certify independent corroboration, identity, causation or learned outcomes. Full evidence and edges remain in the existing store.

## Source verification

736 backend tests pass. Backend TypeScript checking passes. Regression checks demonstrate source-failure preservation and retry, time-budget checkpointing, cancellation with no skipped query, and source provenance reaching the runtime projection. Existing durable checkpoint and blocked-replay checks remain green. These are local source tests, not live execution or database readback.

## Remaining execution limits

- The connected ARK plugin reports read-only; live submission requires deployment and the intended validated client/project grant.
- Same-task idempotency does not provide an atomic per-run lease across different continuation request IDs. Concurrent continuation of one run must remain disabled until an existing lease/CAS mechanism is connected or a reviewed run-lease migration is provided.
- End-to-end provider cancellation and a remote STOP action remain open.
- This runner searches owned historical memory/timeline data. A prepared public-document lead must not be sent here as though the public corpus were indexed in memory.
- Memory/Grove integration must be tested at an exact combined commit. No deployment, grant, migration or scheduler change occurs in this patch.
