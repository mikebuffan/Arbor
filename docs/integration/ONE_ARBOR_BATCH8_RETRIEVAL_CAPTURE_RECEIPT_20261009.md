# Execution batch 8: retrieval, decisions and capture

Parent: draft PR #391 at `b070ad225387226aab0567913f6b34e69f76207e`, tree `d1ca1ac7838079bdbddba20c62580b66785695af`. Fresh open-PR read confirmed #391 current. Preserve #388 research tooling separately. Source-only child; no merge, deployment or activation.

## Actual repairs

1. `candidateContext` ranked thread breadth by array length. Copies of one thread or blank identifiers counted as independent recurrence and could pass the existing prompt-selection threshold. Count distinct trimmed nonblank thread IDs instead, consistent with the existing promotion rule. The failing regression selected duplicate/blank candidates; after repair only genuinely distinct-source evidence passes. Existing finite metadata validation, owner/project/status/exclusion/sensitive/cue guards remain.
2. `promoteEligibleMemoryCandidates` reported a candidate promoted after a guarded status update even if it changed no row. Select the changed ID and require matching readback before adding a promotion receipt. Zero-row/mismatched results are not confirmed lifecycle promotion; errors still propagate. The durable memory upsert may already have committed: no rollback or transaction-wide privacy guarantee is claimed.

Both regressions failed before repair. A paired test through the actual `buildPromptContext` confirms the weak duplicate-source candidate is absent from the system prompt and injected IDs, whereas two distinct sources expose the same candidate as explicitly provisional, not canonical truth. This tests actual prompt construction, not model judgment or causal behavioral benefit.

## Three task outcomes

| ID | Executed/inspected | Remaining acceptance |
| --- | --- | --- |
| B06 semantic retrieval | Existing optional vector RPC path, current owned-row eligibility refresh and lexical fallback traced. Scope/exclusion/stale-content/fallback tests pass. Candidate rank independence repaired. Current prompt retrieval defaults to vector off; live readRecall is lexical. | Approved embedding/index/provider budget and hosted semantic relevance acceptance. No vector activation or new ingestion. |
| B08 memory changing decisions | Actual prompt construction checked in a paired synthetic comparison with otherwise matching state. Existing privacy, correction precedence, sensitive gating and freshness checks pass. | Accepted live model/host and a blinded later-decision outcome; prompt difference is not a demonstrated model decision. |
| B09 automatic capture | Existing chat best-effort signal ingest/extraction/classification/promotion paths traced, including synchronous explicit correction and later background pipeline. Existing current-turn authorization, user-authored evidence, probe/sensitive/excluded/contradicted candidates retained. Final promotion status receipt repaired; tests cover ignored upsert, failed upsert, status-save error and zero-row status result. | Broad capture/consent and hosted failed/uncertain save/replay acceptance. Existing heuristics are bounded, not universal intent understanding; memory upsert and candidate status are separate writes, not atomic. No new capture enabled. |

## Verification

- Local: 387 tests passed across 53 suites (memory, durable correction writes, temporal precedence/promotion and actual prompt construction). Includes six added cases; repeated focused runs overlap this total.
- Backend TypeScript no-emit passed. Tests use synthetic records, fake provider credentials and deny external networking. No paid embedding/model or live database query.
- All 194 source fingerprints and six deployment fence tests passed before publication. Exact-head remote full CI is recorded separately in PR/assessment after completion.

Result: two actual source repairs; Group 8 remains PARTIAL at model/host/capture acceptance boundaries. Existing source paths were repaired without a second engine, new caller, broad import, schema/RLS/grant/settings change or deployment.
