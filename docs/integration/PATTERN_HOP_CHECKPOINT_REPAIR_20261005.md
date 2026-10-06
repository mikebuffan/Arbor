# Pattern Hop checkpoint repair

Connection checklist: C44 (Pattern Hop), C62 (research adapters). Source baseline: `fea53e279c66ea61e80de9891b3e20db97048829`, the deployed candidate recorded in the October 5 connection checklist.

## Repaired behavior

The historical research runner saved the advanced frontier inside each hop but saved its sources and relationship edges only after the entire pass. A source-save failure or process interruption could therefore leave committed child hops without their parent evidence.

The runner now persists each hop's new sources and edges before advancing its checkpoint. Restored source IDs are resolved once; subsequent writes contain only new rows. If sources or edges survive a failed checkpoint, replay rebuilds pending children without adding another path step. Only edges associated with a committed parent retrieval count as visited.

Four new regression cases cover source-write failure, edge-write failure, checkpoint failure before commit, and interruption after checkpoint commit followed by resume. They use the real candidate selection and path engine with an in-memory persistence boundary. They prove ordering and recovery logic, not database transactions or live execution. Existing store deduplication remains in use. Concurrent execution/claiming and atomic multi-table commits are separate unresolved concerns.

Validation on this candidate: 701 backend tests passed, zero failed; backend TypeScript `--noEmit` passed; 28 Pattern Hop checks passed; `git diff --check` passed. The regression tests failed against the original checkpoint order before the repair. No external model or database requests were made by these tests.

## Connection evidence and next work

- Existing engine: `lib/memory/patternHopResearch.ts`, `patternHopEngine.ts`, retrieval and store modules.
- Active application entry points: `app/api/pattern-hop/search/route.ts` and `lib/arbor/agency/arborTools.ts` (`arbor_pattern_hop_research`). The agency tool classifies this as `reversible_write`, not a read-only recall operation.
- ChatGPT/ARK submission boundary: `lib/mcp/registerArkTaskTools.ts` and its task-bridge tests support bounded read tasks and reject `arbor_pattern_hop_research`. Installed recall and task-result reads do not authorize or execute it.
- Historical memory/timeline research is distinct from the public-document investigation stack in #224–231. This runner does not ingest the Epstein corpus.

Next: reconcile the existing authorized worker capability registry and research persistence adapter against the research stack; add an explicitly scoped Pattern Hop submission contract only through that existing authorization path. Verify one bounded source-preserving result, interrupted resume, and owner/project isolation on the intended host. Preserve disabled live/background execution until its deployment and activation gates are satisfied. This patch does not enable a worker, scheduler, grant, migration, paid inference, or corpus ingestion.

Review the repair commit alone against its parent. The branch contains the prior combined candidate; merging it wholesale into main would also bring unrelated integration work.
