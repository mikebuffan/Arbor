# Combined repair review and single ARK handoff

Reviewed October 2, 2026. This supersedes the sequence of individual handoff instructions for this repair stack; the earlier documents remain evidence/history.

## Candidate and result

The four draft PRs form one sequential candidate on integration draft #223, not four independent patches to apply to main. Review found no conflicting source changes among these repairs. No additional engine, dependency, schema or code change was needed for this joint review. This is source readiness for integration review, not deployment approval or completed live acceptance.

| Order | Draft | Base | Purpose |
| --- | --- | --- | --- |
| 1 | [#232](https://github.com/mikebuffan/Arbor/pull/232) | #223 | Evidence-led Annabelle calibration and truthful workspace mutation failures |
| 2 | [#233](https://github.com/mikebuffan/Arbor/pull/233) | #232 | Cross-thread correction hydration, chronological supersession, explicit goal clearing and truthful runtime saves |
| 3 | [#234](https://github.com/mikebuffan/Arbor/pull/234) | #233 | Existing editorial records connected to active Annabelle generation context |
| 4 | [#235](https://github.com/mikebuffan/Arbor/pull/235) | #234 | Existing durable behavior keys retrieved independently of conversation and general-memory limits |

Reviewed remote code head: `bfbd1220782f7fc957a08fccd1159a2f692b861d`. Its tree matches tested local candidate `7e7a4b961a1926e193ca0e57a1f7e51447fb7802`. This document changes the handoff only, so later documentation commit/tree IDs differ.

## Joint checks

- **Active caller:** backend chat route builds `buildPromptContext` and sends the resulting system prompt as agency-agent instructions. That builder invokes the shared subsystem context and durable correction read. The editorial bridge activates only for Annabelle. This does not establish routing of this ChatGPT session or every independent host.
- **Identity and correction composition:** durable and runtime correction snapshots merge before startup/continuity/canonical behavioral guards. Latest observation wins chronologically; copied snapshot counts use the maximum, not addition. Acoustic correction projection stays separate. No separate Annabelle identity was added.
- **Integration preservation:** the #233 reconciliation retains the newer prompt builder, TimeCore, embodied bridge and open-loop handling. Do not replace it wholesale with the older #221 branch. The #234 bridge consumes #222 storage contracts; it does not claim the whole #222 worker/source-reading stack was integrated.
- **Storage contracts:** read-only compatibility for missing runtime/workspace/editorial storage remains where documented. Workspace mutations and runtime saves reject failure. The new durable behavior read rejects storage errors, invalid payloads and duplicate/scope-mismatched rows; it does not silently continue with empty recall.
- **Scope and source:** runtime rows check both database and serialized owner/project/conversation identity. Durable reads check authenticated owner, global scope, active state, deletion and exact existing keys. Editorial selection checks owner/project, canonical uniqueness, chapter/source consistency, supersession and evidence status. Stored hashes/locators do not establish actual reading.
- **Validation receipts:** inspected the existing final-candidate JSON receipt: 596/596 backend tests passed, zero failures. Inspected the successful backend production build receipt. Earlier control checks passed 124 tests and TypeScript build; the later patches do not change control source. No new test run was needed for this documentation-only review. `git diff --check` passed before this document was added.

## Open integration and live gates

1. **Version and storage alignment:** confirm intended deployment, owner/project and database. Resolve the earlier editorial connector result (two manuscripts, zero chapters/records/checkpoints) against the saved report of 60 chapters. Empty connector output is not permission to reimport, erase or reconstruct the manuscript. Existing #222 tables may need their already-planned migration; this repair stack does not apply one.
2. **Availability tradeoff:** durable correction storage errors now prevent prompt construction rather than erase recall invisibly. Verify `memory_items` columns, permissions and valid existing payloads before Preview acceptance. Do not weaken scope checks or swallow errors merely to make a request pass.
3. **Concurrent updates:** permanent promotion reads then upserts. Older sequential writes are blocked, but simultaneous threads can race. Atomic timestamp-conditional storage acceptance remains unverified and must be resolved before claiming concurrency-safe retention.
4. **Save completion:** promotion runs after the response in the existing memory pipeline. Failure is logged; this pass adds no retry worker. Read back the permanent row before saying a rule was saved. Test failure recovery separately.
5. **Editorial scale:** more than 200 manuscript records, or selected context beyond 30,000 characters, returns incomplete without partial locks. For a full novel, verify capacity; if exceeded, use an existing current projection or scoped query with cross-scope supersession checks. Do not simply increase the cap or clip protected text.
6. **Selection and coverage:** chapter selection requires one explicit supported chapter mention; without it only manuscript-wide records load. Permanent retention here covers the three existing behavior families, not every preference, factual memory, manuscript note or acoustic calibration. Keep the other existing routes.
7. **Full-system work:** private Grove/host/LM/Layer routing, worker deployment, source-backed reading and phone acceptance remain separate open tasks in the master checklist. A successful backend test cannot close them.

## One message to paste to ARK

Continue the existing One Arbor integration queue. Read `docs/integration/ARBOR_COMBINED_REVIEW_AND_ARK_HANDOFF_20261002.md` on `fix/durable-correction-retention-20261002` and the linked evidence documents.

Reconcile draft #223 with the stacked repairs #232 → #233 → #234 → #235 as one candidate. Preserve existing completed engines and newer TimeCore, embodied bridge, open loops and shared identity. Do not wholesale replace the prompt builder with #221, duplicate stores or assume #222's full worker/source-reading implementation is integrated.

First verify source/version/owner/project/database alignment and investigate the editorial readback mismatch. Do all available source reconciliation and checks within existing authorization. Keep deployment, protected writes/migrations and execution activation pending while Danelle is away; report the exact remaining human action rather than inventing a new setup process.

When Preview actions are authorized, verify correction save/readback, restart, older-thread hydration, meaningful unfinished-goal preservation, explicit goal clearing, supersession and deletion. Check simultaneous correction writes and post-response save failure recovery. Verify Annabelle loads the selected manuscript/chapter's current evidence and locks, excludes stale/superseded material, reports unavailable/incomplete context, and never claims unread chapters were read. Inspect active request inclusion and actual responses on the intended surfaces; retain foreign-owner/project denial.

Return one concise ledger with integrated source head, tests, deployed version, stored/retrieved/request-included evidence, restart/behavior result, and unresolved gates. Source tests passed 596 backend tests and a production build on the reviewed candidate; neither deployment nor live memory repair has been claimed.

## Status

Combined source review and consolidated handoff complete. Four PRs remain drafts. No merge, deployment, protected database write, migration, manuscript edit, reading receipt, ARK task submission or execution activation occurred during this review.
