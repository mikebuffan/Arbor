# Execution batch 9: identity and independent judgment

Parent: draft PR #392 at `e16e487c69e66abffffa41d78298b42aec0306e9`, tree `e31022729c3dc508ff8d60a943188e2b841604fe`. Source-only child; preserve independent PR #388. No merge, deployment, model activation, paid provider call or live state mutation.

## Actual repairs

1. Self-model observations counted case variants of one domain as separate domains. Two source turns marked Communication and communication could falsely qualify as cross-domain candidate evidence. Normalize domain labels when summarizing, including existing stored rows, consistently with the existing case-insensitive observation fingerprint. Records remain caller supplied, not independently authenticated; candidate status does not promote durable identity. A separate actual domain still qualifies, and contradictions remain contested.
2. The acceptance runner used truthiness to validate provider IDs and models. Blank strings and numeric values could qualify as captured evidence (numeric model even reached paired metadata). Require nonblank strings before a response qualifies, preserving rejected responses in the trace and existing stable resolved-model parity and duplicate-ID checks. No model-specific naming assumptions or private rubric sent to inference.

Five regressions failed before repair and pass after repair.

## Six task outcomes

| ID | Executed/inspected | Remaining acceptance |
| --- | --- | --- |
| C01 unified self-model | Backend/control version and 1300 count align; source core fingerprint invariant across text, voice and Annabelle, mode projections differ. Identity precedes task overlays. | Hosted state readback and actual cross-surface model behavior. |
| C02 1300-question lineage | Existing 300+1000 rebuild, checksum, source digest, migration and projection checks pass. Source answers retained without rewriting lineage. | Authentic live host/model readback, not a computed source digest. |
| C03 falsifiable observations | Existing control service/server/tool path inspected. Domain normalization repaired; recorded support, distinct turns, contradiction and identity separation checked. | Caller records are not independently authenticated observations; real behavioral evidence and review. |
| C04 independent judgment | Existing 16-case blind pack and offline paired runner exercised; provider receipt validity repaired. Existing independent followthrough and completion boundary tests pass. | Approved live model/host, blinded scoring and actual independent decisions. Mock replies remain unscored test evidence. |
| C12 user versus Arbor preferences | Existing personality projection and source attribution tests retain user style separately from canonical priors. Conflicting mood/context cannot rewrite source identity. | Model behavior under preference conflict. |
| D13 prompt independence | Existing paired context ablation, private rubric exclusion, model parity, identity/task/reference boundaries retained; actual prompt construction checks pass. | Live paired causal outcome; context ablation is not an unprimed intrinsic-identity test. |

## Verification

- Local backend: 140 passed, one skipped across 14 suites (identity, behavior, blinded runner, independent followthrough, completion boundaries and actual prompt construction).
- Full control backend: 157 passed across 37 suites, including lineage/rebuild/migration/observations/evidence and restart tests. Control build and backend TypeScript no-emit pass.
- Initial backend broad run lacked dummy OpenAI credentials and two suites failed during import. Rerun with synthetic credentials passed; network is denied by test setup, no real provider calls.
- Source pins and six deployment fences verified before publication; exact-head remote CI recorded in PR/assessment after completion.

Group 9 remains PARTIAL at hosted model, independent observation and cross-surface acceptance boundaries. No new identity engine, caller, question lineage, schema, grant or activation.
