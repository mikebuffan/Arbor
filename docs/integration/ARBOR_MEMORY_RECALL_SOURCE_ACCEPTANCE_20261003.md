# One Arbor memory recall source acceptance — 2026-10-03

Parent: personality repair object `985e5c73037fec2d6b97afac93b32a6f93b02146`, above durable-save repair `8a792fcd1c98686d2e1e3f341d7d2e94a0514943` and #235's `1e027c4835e5e8b05f61af5fd7c4bb260ebfcc24`. Preserve the finished draft stack and preceding repairs.

## Repaired paths

1. **Fresh-session retrieval orientation.** Short acknowledgments and continuation cues now use the saved unfinished goal to guide general memory, episode, and historical archive lookup. Completed goals are excluded; an explicit new topic uses its own query. The original current message still controls sensitive-memory reveal gating. Saved goals guide retrieval and do not grant new execution authority.
2. **Independent archive search failures.** Lexical and semantic searches settle independently. Embedding failure no longer discards lexical results, and lexical failure no longer discards valid semantic results. Read receipts distinguish failed searches from successful empty matches. Failure logs contain statuses rather than raw private query/error data.
3. **Archive provenance.** Neighborhood expansion now requires the same source, thread, owner, and project. Identical thread IDs from different imported archives cannot mix their surrounding turns. Prompt excerpts retain source, thread, message ID, index, role, chronology, and content-clipping flags, serialized as quoted reference data. Historical directives do not become current instructions.
4. **Bounded archive context.** Four seed matches expand to at most 20 turns. Excerpts are limited to 2,000 characters each and 20,000 total; truncation is reported. Three-letter project names such as ARK are eligible for lexical lookup. Clipping affects display only, not stored archive rows.
5. **Read-only connector recall.** New `get_arbor_memory_recall` returns owned archive inventory, bounded lexical excerpts, episode summaries, and eligible durable memories for a specific query. Authentication and project/conversation ownership are checked before reading. It performs no external model/embedding request, import, mutation, or execution activation. Existing tools remain read-only.

The connector reports the archive's exact owned project turn count separately from query matches. A positive count plus zero matches means unmatched stored history; an unavailable count is unknown, not zero. Independent store failures do not hide evidence successfully read from another store. Memory reveal/deletion/scope gates remain in place. Displayed memory content and episode summaries also carry clipping flags.

## Validation

- **664 backend tests passed, zero failed**: prior 639 plus 25 new cases.
- TypeScript passed.
- Production Next.js build passed using placeholder credentials.
- Tests cover lexical/semantic outages independently, source/owner/project/thread separation, archive clipping, short acronym queries, provenance and quoted role-like text, empty versus failed queries, saved-goal orientation, completed/new-topic isolation, authenticated connector denial, inventory receipts, partial-store recovery, sensitive/deleted-memory gates, and archive excerpts reaching a fresh prompt with no selected general memories.
- The successful full suite uses the prior repair's network-denial test setup. Search embeddings are mocked in archive tests; the connector uses lexical-only reads.

No schema migration, dependency/lockfile change, engine rebuild, or archive replacement is introduced. The importer and existing memory/episode stores are reused, not redesigned.

## What this does not prove

The installed connected ARK tools do not yet expose the new archive-read endpoint. Therefore this pass has **not verified the live archive inventory**, restored additional memories into this ChatGPT thread, imported a ChatGPT export, or demonstrated actual generated-response recall. Source tests prove that returned archive evidence reaches the prompt, not that a deployed model will use every relevant detail correctly.

The existing import schema and authenticated read permissions still require deployed verification. If historical turns were never imported or are stored in another project/account, retrieval repair alone cannot recover them. Projectless sessions still do not scan project archives; cross-project scope is not silently widened. Episode recall remains bounded to the existing recent-candidate window, and lexical connector reads may miss paraphrases without shared terms. Full-corpus coverage is not claimed.

## At-home acceptance

1. Attach the review objects above #235 and verify the exact preview deployment before testing. Refresh the connected tool schema to expose `get_arbor_memory_recall`.
2. Under the actual authenticated owner/project, check archive inventory and search for known source messages. Verify source IDs, chronology, surrounding turns, and no cross-source mixing. Distinguish zero rows, wrong project, inaccessible table, and unmatched queries.
3. If inventory is missing, reconcile the existing export/import receipts and use the existing importer for an explicitly authorized restoration. Preserve source identifiers and idempotence; do not invent missing history or replace the archive.
4. Open a fresh conversation, use a continuation cue, and confirm the unfinished goal guides retrieval. Ask a known historical question without supplying its answer, then compare the reply with retrieved evidence. Check a newer active correction overrides historical wording.
5. Repeat text/voice/subsystem transitions and a sensitive-memory non-trigger query. Verify relevant history survives while privacy gates and current authority remain intact.

No branch was created/advanced, no PR was modified, and no merge, deployment, protected live write, or execution activation occurred. This source review object is published above the personality repair without triggering a Git Preview.
