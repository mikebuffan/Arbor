# Pattern Hop research improvement pass — 2026-10-06

This child lane starts from the existing Evidence Engine torture-audit head and does **not** rebuild already-present research components.

## Existing capabilities retained
- source-family reconstruction and collapse through explicit/deterministic document links
- conservative source-independence grouping
- alias/entity candidate gate with no silent identity merge
- temporal conflict detection
- bounded failed-lead rerouting
- research-value lead prioritization ("why this hop")
- research coverage map
- original PDF/page provenance and manual original-page review
- Claim ↔ Evidence ↔ Counterevidence summaries

## Added in this pass
1. Travel verification lens
   - itinerary stays "planned only"
   - actual movement requires movement/airport/tail/manifest/customs/pilot evidence
   - traveler presence is separate from aircraft movement
   - conflicting actual routes and impossible arrival/departure order are explicit

2. Payment-chain lens
   - witness reports, ATM withdrawals, ledgers, bank records, receipts and staff/household records remain distinct
   - ATM/cash availability never proves payment
   - direct payer→payee records can be represented without upgrading unrelated evidence

3. Witness cross-check lens
   - compares claims against phone/calendar/travel/payment/message/other-witness records
   - tracks independent supporting and counter source families
   - explicitly produces no witness credibility verdict

4. Contradiction propagation
   - contradictions reduce only the affected claim confidence
   - downstream claims weaken according to explicit dependency weights
   - source evidence is retained; cycles fail closed

5. Event-level evidence coverage matrix
   - messages / phone / calendar / travel / payment / witness / original-document channels
   - checked / partial / unchecked / not-observed states
   - absence remains a coverage statement, not a truth statement

6. Original-source preference
   - ranks original record → authenticated copy → sworn testimony → official summary → secondary → tertiary
   - summaries remain usable with provenance while original retrieval is preferred

## Guardrails preserved
- repeated reporting != independent corroboration
- association != conduct
- itinerary != completed travel
- cash availability != completed payment
- source preference != truth
- source independence != truth
- coverage != truth
- witness cross-check != credibility verdict
- identities never silently merge
- uncertainty stays explicit
- findings remain traceable to evidence references and source-family IDs

## Integration boundary
This is source-only research logic stacked on the independent Evidence Engine audit lane. It does not apply migrations, activate a worker, ingest live corpus data, deploy, publish findings, merge to main, or modify the moving One Arbor candidate. Reconciliation into the current One Arbor / latest Pattern Hop lineage should happen only after exact-head tests are green and the active integration lane is stable.
