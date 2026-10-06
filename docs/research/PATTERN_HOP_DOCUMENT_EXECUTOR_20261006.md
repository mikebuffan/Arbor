# Stored document hop executor and durable receipt

A trusted host can now invoke `runStoredDocumentHopTick` to connect the existing
research session runner, owner/project scoped document store, review adapter,
stored-page search and receipt settlement. One invocation claims at most one
`document_pattern_hop_search` unit. Its payload contains the original `review`
input for `preparePatternHopFromReviewPacket`, optional `afterPageId`, and optional
`limit` (1–20; default 20). Review validation runs again before search.

The source entry point requires `enabled: true`; omission fails before any DB
access. This internal parameter is not client authorization. A host must resolve
owner/project authorization and honor the existing deployment/integration gates
before invoking it. This change installs no public route, live worker registration,
cron, enqueue loop or MCP tool. The existing edge investigation worker uses a
different task schema and has not been silently repurposed.

## Receipt and restart

The existing settlement RPC already accepts `p_result` and atomically saves it in
the receipt and unit. The TypeScript adapter previously sent only a timestamp.
It now also sends optional `unit_result`, preserving the prepared lead, originating
page hashes, review requirements, ranked source/page anchors, stopping condition,
missing-original markers, and continuation cursor. No schema change is needed for
this payload beyond the existing proposed session schema being installed.

`SupabaseResearchStore.loadUnitResult(sessionId, unitId)` reads the latest receipt
under fixed owner/project scope, checks returned row scope, and validates bounded,
lossless JSON before returning it. Older timestamp-only receipts return null.
Storage errors propagate. Readback does not execute another unit. To continue,
the trusted host must separately authorize/enqueue another unit with the saved
cursor and original review input; this adapter does not self-schedule.

The unit is marked completed only for its bounded search batch. Its zero-cent
receipt means no external model/provider charge was recorded; it is not a claim
that infrastructure is free. Required review work remains unchanged and discovery
hits are not added to the session's completed-evidence ledger. Original page
review, identity review, corroboration and corpus exhaustion remain unverified.
STOP/cancellation and lease settlement remain governed by the existing session
policy and RPC. This is not a provider abort mechanism.

Results reject non-JSON values, cycles, excessive nesting, more than 10,000 values,
and serialized payloads over 256 KiB. Settlement also validates receipt status
and claim identity before calling the RPC.

## Validation

- 222 offline research tests passed with external fetch forbidden, including the
  real review/search/ranker → session → receipt integration with a simulated DB
  transport and JSON serialization, fresh-adapter readback, foreign-row rejection,
  cancelled-session stop and disabled entry point.
- Backend TypeScript check passed.
- `scripts/verification/document-hop-receipt-restart.mjs` exercises the existing
  proposed SQL in disposable PostgreSQL (PGlite 0.5.8): commit, duplicate settlement,
  database close/reopen, exact receipt readback, unchanged unresolved review and
  no re-claim of the completed batch. This is a local SQL test, not live Supabase
  or multi-worker deployment proof.

Run the SQL check with a separately installed pinned PGlite package:

```sh
ARBOR_PGLITE_MODULE=/path/to/node_modules/@electric-sql/pglite node scripts/verification/document-hop-receipt-restart.mjs
```

No live database, production flag, deployment, grants or schedules were changed.
Live host registration, proposed schema installation and scoped corpus readback
remain outstanding.
