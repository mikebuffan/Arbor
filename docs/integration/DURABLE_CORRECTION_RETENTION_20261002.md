# Long-term correction retention — completed source checklist

This pass extends #234/#233/#232 on the existing #223 integration candidate. It uses existing `memory_items`, explicit durable authorization, correction-family promotion, and canonical behavior projection. No new memory store or migration.

## Checklist and results

1. **Trace durable save — done.** Chat's existing memory pipeline calls promoteRepeatedBehaviorCorrections only for corrections observed in that turn. Promotion uses upsertMemoryItems and existing global memory keys.
2. **Respect authorization — done.** Existing hasExplicitDurableAuthorization remains the entry gate. Unrequested feedback does not become a global permanent rule through this promoter. Acoustic calibration remains separate.
3. **Remove unnecessary repetition — done.** Explicitly authorized behavioral correction can promote on its first observation. Direct correctionPromotionItem callers retain the former default repeated-observation policy unless they explicitly opt in.
4. **Trace retrieval budgets — done.** General pinned/core anchors have a 24-item retrieval limit followed by a 14-item continuity selection. Those limits can crowd out a permanent behavior correction even though age decay already protects it.
5. **Dedicated durable read — done.** loadDurableBehaviorCorrections queries the three existing behavior.correction family keys directly, scoped to authenticated owner, global scope, null project/conversation, active status and no deletion. It is independent of the 50-conversation snapshot window and general memory ranking.
6. **Reconcile new versus old — done.** Generation combines durable corrections with recent runtime corrections using chronological snapshot merge, without adding copied recurrence counts. A newer runtime correction wins over an older durable value. The promoter also reads current permanent values and skips older/equal observations so an older thread cannot sequentially overwrite a newer calibration. Concurrent write races still require transactional store acceptance; this check is not a transaction.
7. **Connect to generation — done.** buildPromptContext feeds merged corrections into host startup, continuity and canonical behavior guards, including when no conversation runtime or general memory has been selected. This preserves existing Text/Voice/Annabelle paths rather than introducing a separate identity.
8. **Isolation and honest failure — done.** Returned rows are checked for owner/global scope/key validity/deletion; duplicate family rows and invalid payloads reject. Database errors propagate instead of turning failed durable recall into apparent empty memory.
9. **Verify after the recall boundary — done in source simulation.** A 60-conversation fixture places the original correction outside the newest 50 snapshots. Runtime recall alone omits it, but existing durable memory restores it into host generation context.
10. **Verify actual generation wiring — done in source test.** A prompt build with empty general memory and no runtime still contains the durable rule and applies it to behavior guard requirements.
11. **Validate candidate — done.** 596 backend tests passed, including eight added retention/prompt checks. Production backend build passed with CI placeholders and system TLS certificates. No dependency, lockfile or schema changes.
12. **Publish for ARK integration — done in accompanying draft PR.** GitHub publication is a handoff, not proof of deployment or ARK consumption.

## Limits and live acceptance

- This repair covers the three existing promoted behavioral families: agency-followthrough, identity-drift, continuity. It does not claim every personal preference, factual correction, acoustic rule or manuscript note has lifetime retention; those have existing separate stores/routes.
- The existing promotion runs in the post-response memory pipeline. A durable write must be read back before live acceptance says it succeeded; background failure is logged by the existing scheduler. No new retry worker or deployment is enabled here.
- Durable store values are loaded only on active backend prompt construction. This does not prove this ChatGPT conversation uses that backend, nor that an independent host/LM loads the same route.
- Source tests use controlled database contracts and mock the promotion store boundary. They prove eligibility, scope, chronological selection and generation-context inclusion, not a live write or model adherence.
- Once integrated and authorized on Preview: save one explicit rule, read its memory row, exceed the recent snapshot boundary or use the equivalent controlled live fixture, restart the intended surface, inspect active context and a real response, then correct and revoke the rule to verify supersession/deletion. Foreign-owner denial must remain intact.
- No deployment, protected database write, migration, manuscript edit or autonomous execution occurred in this pass.
