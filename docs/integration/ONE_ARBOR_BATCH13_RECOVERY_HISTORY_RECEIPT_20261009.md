# Execution batch 13: existing recovery/history projections

Parent draft PR #397 at `357ce8d16cc42c6f3c7aeced0a0699e0a08e4d3f`, tree `940bbc9405e79f9d015969c5705356a5131a8ac4`. Preserve its operating self-model wiring and independent #388. Source-only, no main merge/deployment.

## Actual repair

Array.some skipped sparse slots in decision-history evidence references and discovery allowed-project/visited-ID validation. Hole-only outcome refs were accepted as nonempty and avoided the unreferenced-outcome warning; source-plus-hole refs and project/visited lists were also accepted. Validate every slot through Array.from before forming projections or sets; use existing invalid-input errors. This does not authenticate outcome references or grant access.

Four properly constructed regressions failed before source repair and pass after it: two history reference lists, one allowed-project list and one visited-ID list. Existing valid/empty lists, scope denial, competing-choice review, history rewrite rejection and source-family dedupe remain intact.

## Nine task outcomes

| ID | Checked now | Remaining acceptance |
| --- | --- | --- |
| B15 Decision Ancestry | Outcome-reference validation repaired; causal links, competing choices, retries and missing predecessors tested. | No established production caller or authenticated durable outcome history. |
| B16 What Changed | Existing diff rejects same-ID rewrites and reports disappearing events; source checks pass. | Two actual durable checkpoints and action receipts; no established production caller. |
| E01 Failure Radar | Existing correction/recovery warnings tested for duplicates, benign state and conflicting completion; no auto-close. | Real caller observations and behavioral benefit; no new radar service. |
| E02 Human Decision Inbox | Read-only candidates and existing-state adapter deny foreign/forged views, preserve explicit blockers and grant no actions. | Authenticated host/UI caller and actual approval queue; none added. |
| E03 Discovery Radar | Sparse allowed-project/visited-ID lists repaired; existing family dedupe, visited progress and scope denial retained. | Pure projection has no established production caller; real metadata provenance and useful discovery. |
| E04 Host What Changed | Existing state comparison reports lost coverage/cleared blockers without treating them as permission. | Durable hosted comparison and caller; none added. |
| E07 Decision-history receipts | Existing scoped agency state/restart tests pass; references remain caller-reported, not self-verifying. | Authenticated receipts, hosted persistence and real failure/reopen. |
| A11 System Health UI | Existing shell/workspace → SystemHealthView → adapter → public/private ARK status readers traced; stale/demo/unavailable distinctions retained. | Flutter/device/live endpoint acceptance. No Dart/Flutter runtime available; no install workaround. |
| E05 Useful Idle Time | Existing read-only scope and scheduler dependency inspected. Idle UI state is not proof a worker ran. | Authorized scheduler/grant and bounded execution receipts; no worker activation. |

## Verification

Local 154 distinct backend tests across 14 files: 112 initial history/review/restart/private Grove/startup tests plus 42 recovery/correction tests. Backend TypeScript passed. Initial broad test run had two import-time errors because the test-only OpenAI placeholder was absent; rerun with a synthetic placeholder passed all selected suites. Backend networking denied; no actual provider/database operation.

Source fingerprints and six deployment fences checked before publication; exact-head CI recorded in PR and assessment after completion. Counts overlap focused/remote checks.

Group 13 remains PARTIAL for caller/durable/live/device acceptance. No new production caller, approval queue, history store, worker, scheduler, idle activation, engine, paid inference, schema/grant/settings change, main merge or deployment.
