# Pattern Hop connection work pass — 2026-10-06

This is the execution receipt for the fifteen-item investigation-loop list. It supplements the existing master reconciliation and engine checklist. Source composition and passing tests are not claims that the connected ChatGPT/ARK runtime executed the work.

## Reviewed source anchors

- Deployed baseline identified for this work: `fea53e279c66ea61e80de9891b3e20db97048829`; no deployment changed here.
- Checkpoint-repair tree: `025be790be4146663dc2069b33bffcb440879747`, published parent head `fc8ab7b3c21d320a67e4200953ffe37387da37e3`.
- PR #236 queue bridge tree: `35f12a47`; published head `dab867f3654dea349d3ef7f444b1db092a8136c2`.
- Recovery/handoff source: `40371564`, built on that queue bridge.
- The user-identified memory exclusion repair: `373fa57995985eb12613ae0f29678c98e41de39a`, reconciled by cherry-pick without conflict into this candidate. Pattern Hop's own memory retrieval also enforces exclusion, including defensive rejection of unknown eligibility.
- Research stack baseline: `2a726225fbd09b5be8ded725fa080f9542822110`; isolated research patch `fcf304a4`. Its schema and review gates remain separate.
- Grove work continues in another thread; no unprovided Grove changes were overwritten or represented as integrated.

## Ordered ledger

| Item | Current source result | Still needed |
|---|---|---|
| 1. Combine repairs | Checkpoint + MCP + recovery/provenance + memory exclusion reconciled and tested together. Public research stays an isolated review patch. | Reconcile the current Grove/host commit once supplied by that workstream; run its intended-surface acceptance. |
| 2. Live submission | Existing worker path exposed through a separately granted, bounded MCP tool in PR #236. Current installed plugin reports read-only. | Deploy the integrated candidate and verify the exact validated client/project grant and discovered tool. |
| 3. Real run | Queue, task receipt and worker classification have source tests. | Actual worker claim, progress, owned source results and durable readback. |
| 4. Interrupt/resume | Checkpoint commit failures, blocked retrieval, cooperative cancellation and time-budget continuation tested. | Live process interruption and readback. Same-task idempotency does not give different continuation requests an atomic shared-run lease; concurrent continuation must remain disabled pending a lease/CAS connection. |
| 5. Document Evidence bridge | Existing review packet + next-hop explanation now compose into the existing prepared Pattern Hop candidate with page/hash provenance. | Trusted owned caller and document-corpus retrieval adapter. A document lead must not be passed to historical memory as though it searches that corpus. |
| 6. Provenance | Per-hop durable sources/edges precede checkpoint advancement; runtime projection/handoff retains parent and source IDs. Document preparation retains original bytes/page hashes. | Live source capture and original-page verification; persisted retrieval method remains labelled persisted rather than invented. |
| 7. Independence | Shared uncaptured originals now connect derivative reports into one origin family. | Independent source review. A family count alone never verifies corroboration. |
| 8. Identity/aliases | Existing unresolved/resolved decision gate retained; Unicode aliases no longer become empty exact matches. | Trusted identity review and scoped durable decision readback. |
| 9. Contradictions | Contradictory seed holds Roundabout; document timeline conflicts and unresolved identity requirements reach prepared leads. | Real counterevidence retrieval and original-source resolution; no contradiction is auto-confirmed. |
| 10. Branch/reroute | Existing frontier, clue generation, visited dedupe, rejection rerouter and learned pathways reused. Failed retrieval remains pending rather than falsely exhausted. | Live causal branch usefulness and alternate-route proof; source loss cannot be counted as a dead end. |
| 11. Timelines | Existing timeline conflict detector used in document-to-hop composition tests; historical chronology retained. | Actual calendar/travel/message/payment sources, accurate temporal relations, and scope-preserving corpus queries. |
| 12. Decision/consequence | Existing cognitive assembly, Roundabout, snapshot/session port and pathway outcome mechanisms inventoried; no replacement engine added. | Authenticated host action -> independently observed consequence -> reviewed receipt in the intended runtime. |
| 13. Reviewed learning | Existing independently host-reviewed outcome and receipt dedupe retained. Research preparation and previews grant no execution or learning. | Live scoped review/write/restart/change-in-behavior evidence. |
| 14. Longer sessions | Existing one-unit session runner has cost/time/cancellation/lease policy and synthetic restart tests. Historical runner gains cooperative time/cancellation boundaries. | Trusted executor adapter, per-run exclusivity, remote STOP, provider cancellation and authorized scheduler. No unattended loop enabled. |
| 15. Handoff | Existing agency output now includes exact seed/depth, pending queries, contradiction refs, blocker, stop reason and bounded/traversal completion distinction. | Actual handoff returned through the live plugin; preserve owned provenance during readback. |

## Validation

The combined historical/queue/memory candidate passes 742 backend tests and TypeScript checking. The research patch passes 212 offline research tests and TypeScript checking. Both pass whitespace checks. Publication must be fetched back and tree-compared to the tested commits.

The initial full-backend run on the research branch was rejected by automatic approval review for possible unauthorized model-provider egress. The safer research-only run, with external fetch forbidden, passed. Full-backend research-branch verification remains unclaimed. No live database queries, migrations, deployments, grants, source ingestion, publication or schedules were changed during this pass.
