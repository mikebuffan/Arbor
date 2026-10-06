# One Arbor behavior comparison — work pass

Date: October 6 UTC / October 5 Pacific, 2026. Parent source: `373fa57995985eb12613ae0f29678c98e41de39a`. This thread owns behavior comparison, not the memory/export import or Grove/LM implementation being handled elsewhere. Preserve their newer work when reconciling this small patch. No claim that the parent remains the latest deployed or tested source.

## Completed available work

1. **Existing tests found and reused.** Reviewed canonical personality projection, one-host identity parity, behavior guards, verifier request boundaries, runtime restart/correction recovery and interruption/continuation tests. Existing source has tests and synthetic conversation references; no second personality engine is needed.
2. **Real exchange evidence selected.** Reviewed the current September personality research and retrieved six dated historical archive excerpts through ARK. The evidence supports humor through shared callbacks, situation-specific association, independent contribution, useful technical analogies and bounded pushback. Retrieval was truncated; it does not establish full export reading or wholesale memory integration. Raw private excerpts were not committed or sent to a new model/provider.
3. **Actual test discovery gap repaired.** Backend Vitest's `lib/**/__tests__/**/*.test.ts` pattern excluded three existing colocated files: `providers/openai.test.ts`, `arbor/subsystem/context.test.ts`, `arbor/behavior/behaviorProjection.test.ts`. Changed the pattern to `lib/**/*.test.ts`. The expanded suite passed 708 tests, zero failures. This count is from this parent plus discovery fix, not another thread's similarly sized suite.
4. **Prepared cases expanded, not replaced.** Retained the fourteen cases in `ARBOR_CONVERSATION_ACCEPTANCE_CASES_20261005.json`, versioned the pack as 2026-10-06.2, and added four non-personal scenarios: bounded blocker/workaround, ambiguous-but-resolvable edit scope, casual Ever register/independent writing critique, and interruption followed by actual action recovery. All eighteen remain not-run. Fixture actions use isolated reversible tools, never actual manuscripts or external messages.
5. **Paired preparation and evidence auditing added.** `scripts/behavior-acceptance.mjs` reads the same pack. It separates generation turns from scoring rubrics, creates reproducible A/B condition assignments, and writes an empty results template. No model, network, database or worker call occurs. Actual intermediate assistant responses must come from the host; scripted replies are not acceptance data.
6. **Comparison validity checks completed.** Audit checks pack hash, exact user sequence, alternating complete transcripts, response IDs/context hashes, matching provider/model/settings/surface/fixture, case uniqueness and rubric evidence references. Missing judgments are unknown. Declared tool/storage/restart/acoustic criteria require external receipt references. These references are supplied evidence that an independent reviewer must inspect; the utility cannot authenticate a fabricated receipt or prove metadata truth.
7. **Tooling validated.** Ten Node tests passed, including empty-run truthfulness, model/fixture mismatch, incomplete or changed transcript rejection, scripted-origin rejection, response-ID reuse, pack drift, duplicate pairs, user-turn evidence rejection and restart evidence requirements. Ran prepare and audit on the actual eighteen-case pack: zero captured pairs, status not-run. `git diff --check` passed. Runtime code, dependency/lockfiles and schemas are unchanged; no production build rerun was needed for this test-discovery/offline-tooling patch.

## What remains open

| Requested work | Status / exact next step |
| --- | --- |
| Tired/terse, humor, disagreement and correction demonstration | Cases ready; collect actual baseline/candidate replies |
| Professional/casual/writing transition | Cases ready; collect actual replies and confirm active authority/context |
| Authorized follow-through, blockers, interruptions | Source tests pass; host run needs isolated action tools and independently inspected execution receipts |
| Fresh thread/restart and memory absence/presence | Source tests pass; host run needs controlled scoped fixture, save/readback, process restart and current-context evidence |
| Acoustic rendering | Cannot judge from text; use intended voice surface recording when available |
| Matched baseline/candidate comparison | Blocked here: no model credential or paired acceptance host configured; neither is probed through unrelated sessions |
| Score usefulness, humor, judgment and prompting burden | Human review must follow actual captured outputs; no phrase/profanity scoring and no automatic personality verdict |
| Repair behavior failures | Fix demonstrated test-discovery gap now; generation failures remain unknown until measured |
| Demonstration | Prepare only after independently reviewed results; no demo claiming improvement has been fabricated |

## Run on the existing authorized host

```sh
node --test scripts/behavior-acceptance.test.mjs
node scripts/behavior-acceptance.mjs prepare \
  docs/integration/ARBOR_CONVERSATION_ACCEPTANCE_CASES_20261005.json \
  recorded-run-seed /absolute/private/path/run
node scripts/behavior-acceptance.mjs audit \
  docs/integration/ARBOR_CONVERSATION_ACCEPTANCE_CASES_20261005.json \
  /absolute/private/path/captured-results.json \
  /absolute/private/path/audit.json
```

Prepare writes four private files using exclusive creation: generation, scoring, assignment and resultsTemplate. Output prefixes must be unused; a partial preparation is not a completed run. Keep private output outside the repository. Preserve the pack hash, seed and original captures.

Choose and record the intended comparison before generation. For the user's model-with/without-Arbor question, keep model, task tools, task-specific instructions, budgets and fixtures equal; vary the reviewed Arbor context only. Do not give the baseline fewer task permissions or secretly different history. For a prior-versus-new-source question, record that different contrast separately; do not call it model-with/without-Arbor. This utility does not assemble either model request or implement context ablation.

Run cases through the actual host, including its existing tools and context builder. Feed generation userTurns only, using real intermediate replies. Never include the scoring rubric or expected assistant wording in inference. Condition assignment is recorded separately. Reviewers should receive labels A/B and transcripts with condition-revealing metadata concealed until judgments are finalized; fluent style can still reveal the condition, so this is limited blinding, not guaranteed blindness.

For memory and continuation scenarios, provision the same reviewed isolated fixture in both conditions and run present/absent evidence and foreign-scope controls. A fixture ID alone is insufficient; independently inspect its contents and eligibility. Record restart/storage/action/audio receipts where required. Observing reply text alone cannot close those criteria. Use multiple recorded repetitions, preserve failures, and account for nondeterministic output. One pass is a demonstration, not population-level superiority.

## Results input contract

Each `pairs` item has `caseId`, `A` and `B`. Each arm has `origin: host-captured`, `metadata`, `turns` and `judgments`. Metadata requires provider, model, surface, fixtureId, sourceIdentity, contextSha256 and explicit settings. Every assistant turn includes requestId and requestContextSha256. A rubric judgment contains rubricIndex, pass/fail/unknown verdict, reason and zero-based assistantTurnIndices. Non-unknown judgments require assistant evidence. Cases declare externalEvidenceCriteria for indices needing externalReceipts. No secrets, bearer tokens, raw headers or protected user content belong in public results.

The human review records concrete benefits and costs: correct action, useful contribution, needless repeat questions, rework, appropriate disagreement, retained correction, natural humor when earned, and time/call cost. Absence of a joke is not failure. A guessed fact is not successful familiarity. Reusing a reference punch line is not a humor benchmark.

## Shared-queue handoff

Reconcile this isolated source patch with the current integration candidate. It advances preparation and fixes test discovery for connection-checklist C36; it does not close C25–C35, C37–C46 or live acceptance C70. The canonical queue remains the existing One Arbor queue. This repository handoff does not prove ARK consumed it. Publish source/head and receipts, then collect actual host outputs when that authorized route is available.

No model inference, deployment, merge, protected write, export import, manuscript edit, worker activation or ARK task submission occurred in this pass.

## Existing host compatibility check

Source inspection of this branch confirms that supplying a model credential alone will not complete the comparison:

| Existing surface | Finding | Consequence |
| --- | --- | --- |
| `app/api/chat/route.ts` | Builds actual prompt context, runs the agency agent, and persists turns, episodes and memory signals. Its request schema has no baseline/candidate context selector or model override. | Ordinary paired chat requests cannot implement controlled context ablation; use isolated fixtures rather than the user's normal conversation. |
| `app/api/debug/chat/route.ts` | Returns 404 in production, requires user and admin authorization elsewhere, and sends a single message through Chat Completions. | Its system override is useful for limited diagnostics, but does not reproduce the chat host's context, multi-turn agency or tools. |
| `lib/chat/routeSupport.ts` | Public success response exposes assistant text, not provider response IDs and request-context hashes. | The current public response alone cannot fill the comparison's capture contract. |
| `lib/arbor/agency/openaiAgent.ts` | Existing agent exposes tool/boundary/verification hooks and provider response IDs in its result. | Reuse this agent for an isolated server-side evaluation harness; a second agency engine is unnecessary. |

The remaining implementation is a private server-side runner that selects the reviewed condition, assembles equal task context and scoped fixtures, invokes the existing agent, and records actual request hashes, provider identifiers, intermediate replies and tool receipts. Explicitly capture the verification calls and any additional model calls; a final response ID alone is not a complete request trace. Preserve each condition's own intermediate replies. Memory/restart cases also require independently inspected storage and eligibility evidence. Keep the scoring material outside inference and do not expose an arbitrary client-controlled context override on production chat.

Run that harness on the authorized host with its existing model configuration. Current ARK read-only access does not provide generation, and no paired generation host or model credential is configured in this workspace. This is a source compatibility finding, not a failed live inference run. The runner has not been implemented in this pass; the eighteen prepared cases remain not-run.
