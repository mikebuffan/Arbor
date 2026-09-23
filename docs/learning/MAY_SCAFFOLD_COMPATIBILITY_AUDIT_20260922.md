# May 2026 associative-pathway scaffold — verified compatibility audit

**Source provenance:** Private user-owned ChatGPT archive `conversations-002(3).json`, May 16, 2026 technical draft, directly inspected and extracted into private `/Arbor/Pathway Recovery/ORIGINAL_MAY_2026_*` files. The historical module is ~33.8 KB TypeScript and its example test block ~7.2 KB. Both are archival designs; finding code *in a conversation* does NOT prove the module was ever committed, installed, run or deployed. As of source-tree inspection, the original named module was absent from `main`. Do not copy the raw archived conversation or private examples into this PUBLIC repo.

**Historical intended order:** Original master index explicitly parked Neural Pathways until extract → store → retrieve → inject → verify/debug and routing were observable. The original designer distinguished Memory (facts), Nervous System (detects), Neural Pathways (learned wiring), Executive (chooses), and Muscular System (executes). This remains the boundary.

## Actual May source vs September bounded draft #188

| May original | #188 September reconstruction | Required disposition |
| --- | --- | --- |
| `evaluateNeuralPathwayNetwork` central evaluator, self-detected signals and input classification | No evaluator or signal detector, exact host-provided cues only | Keep host-side detection separate; no silently replacing earlier interface in app. |
| 26 in-code seed pathway entries | None | Review old seeds against actual current body-system names; import only safe, tested, non-user-specific routes. |
| 20+ named body systems and recommended modes | 9 broad system classes, no modes | Preserve an explicit mapping of old systems/modes to current code; don't invent missing modules. |
| 12 domain/pathway types, 10 proposed actions, 9 statuses | 4 path types, 2 suggestion actions, 3 statuses | Deliberate *narrow experiment*, not historical API parity. Lock, supersede, quarantine and review need explicit reviewed semantics. |
| Suggested suppressions, activation rankings, mode recommendations and detailed debug proof | Suggestions and concise trace | Extend only after validating overlap with current runtime/router and safety gates. |
| `weight` and `confidence`, count fields, timestamps, suppress reason, metadata | `strength`, source receipt list, protected flag, scope | Keep salience separate from truth/confidence and migrate no old schema blindly. |
| `updatePathwayWeights` returns a list of proposed changes | #188 returns updated immutable in-memory pathways upon caller-supplied verified outcomes | Old draft did not prove durable online learning: no persistence/write receipt in historical evaluator. |
| Optional `neural_pathways` SQL for later, nullable user scope | No DB schema or writes | Do NOT deploy proposed old SQL without modern per-user/project RLS/schema/ledger review. |
| Examples/tests scaffold in chat | Actual #188 strict TypeScript + synthetic tests and green exact-head Integration CI | Do not claim old tests were integrated; keep historical source separately. |
| Example calls suggested an executable integration position | #188/#190 disconnected from Grove/ARK | No real-live pipeline activation, auth or release evidenced. |

## What we verified in the historical source locally

- Extracted historical TS module compiled with strict TypeScript (no external project dependencies).
- Ran deterministic seed examples: `Prompt please` proposed `prompt_packet`; `Continue the scene` proposed `fiction_scene` with execution/memory suggestions; generic TypeScript code request proposed code packet.
- A feedback success generated a proposed weight update (e.g. 0.90 → 0.96), while the matched pathway returned its original 0.90. That demonstration does **not** prove persistence or application of the suggestion.
- The September #188 remains a safer, bounded *new reconstruction*. The #190 softmax router and typed nickname assertion graph are distinct experiments; neither is a complete equivalent of the May evaluator or a new LLM.

## Reconciliation action items

- [x] Locate original May module, test examples, optional schema and notes in user archive.
- [x] Preserve exact private extraction outside public GitHub.
- [x] Compile source and run representative deterministic seed-route checks.
- [x] Identify lost interfaces, changed names and missing historical scope.
- [ ] Compare all 26 seed routes with current `main` router, body-system modules, source ownership and safety guards; record old → current mapping individually.
- [ ] Audit May test scenarios against present real capabilities; remove any paths whose source component does not exist or is only a design.
- [ ] Design an adapter or migration plan explicitly, not a rename of #188 into May's evaluator.
- [ ] Decide persistence model, SQL/RLS and evidence authorization only after current ARK/Layer and Grove lane review.
- [ ] Test real model outputs separately under matched conditions; preserve private eval material outside public repo.