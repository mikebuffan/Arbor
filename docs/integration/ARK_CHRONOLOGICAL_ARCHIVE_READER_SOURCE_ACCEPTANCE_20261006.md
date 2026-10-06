# Chronological archive reader source acceptance

Status: tested source candidate. This does not establish a deployed reader, a submitted/completed live ARK reading job, a full-export import, or completed developmental analysis.

## Result

The existing owned historical archive now has a bounded chronological page reader. `get_arbor_archive_page` exposes it as an authenticated read tool; `arbor_read_historical_archive_page` registers the same reader in the existing agency registry and ARK agency executor. The existing granted read-task bridge can enqueue this capability with strict bounded options. No new engine, worker, schema, dependency, model request or archive write is introduced.

Pages contain original source/thread/message IDs, normalized source position, role and timestamp. Ordering is timestamp ascending, unknown dates last, then row UUID ascending; tied timestamps are deterministic but do not establish conversational causality. A scope-bound cursor carries the anchor ID, full-message SHA-256 and next character offset. Long messages continue across pages rather than disappearing behind a clip. Cursor scope mismatch, missing/changed anchor content, ownership failure and database failure reject the read. Options reject unknown keys, including caller attempts to override trusted scope.

Historical text remains reference data and cannot authorize actions or supersede current corrections. A page reads imported rows only; it is not a developmental analysis result. Pagination is not a snapshot of the entire archive: earlier inserts or ordering metadata changes during a run require reconciliation against a source manifest before whole-export coverage can be claimed. Task result reads retain their existing 20,000-character truncation indicator; large serialized page results may require direct page retrieval, and clipped output is not full delivery.

## Verification

- 722 backend tests passed in 130 files, including exact reconstruction of long messages, cursor continuation after tied and null timestamps, ownership before archive access, foreign cursors, content changes, database failure, strict scope/options, and actual execution through the existing ARK agency executor with a mocked database.
- TypeScript `tsc --noEmit` passed.
- Backend production build passed with existing telemetry dependency warnings.
- MCP submission grants, flag-off behavior, privileged-client ordering and retry identity remain covered by the existing suite. Archive task options are explicitly tested through the bridge.
- Live read-only checks confirmed the connected profile still reports read-only access and the intended preview project contains six historical rows. No live task was created/executed in this pass.

## Remaining live links

1. Make the authorized original exports available through the existing import/archive path, preserving their verified source hashes, owner/project, conflict checks and restart coverage. The local/export Library files are not automatically accessible to a remote ARK worker.
2. Deploy this exact candidate to the intended preview host through the established release process. Preserve existing completion work and draft stack.
3. Configure the existing scoped submission/client/project grant and approved objective-scoped worker activation. Do not bypass current gates or enable unrelated background tasks.
4. Execute one small real chronological reading task, retrieve its durable output and cursor, then exercise interruption/restart. Only actual task receipts establish live ARK execution.
5. Run complete chronological coverage and record developmental observations separately: user observation, Arbor reply, correction, proposed versus verified implementation, later behavioral evidence, failures and supersession. Reading pages alone does not close this analysis.

This repair leaves Pattern Hop and Grove in their existing workstreams.
