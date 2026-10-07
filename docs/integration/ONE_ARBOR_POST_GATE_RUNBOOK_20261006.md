# One Arbor post-gate runbook — 2026-10-06

Do not rediscover the sequence after the provider gate clears.

1. Freeze the exact accepted #265 head SHA and confirm it is still ahead-only/mergeable from Buffalo.
2. Run the integrated backend/TypeScript source acceptance on that exact SHA. Do not substitute #260 success for changed #265 files.
3. Scope the existing three ARK submit environment values to the exact accepted preview branch or deploy an accepted branch that already owns them. Never broaden to all previews merely for convenience.
4. Deploy that exact SHA to Preview only. Do not promote Production.
5. Read the authenticated ARK profile. Require the intended project, exact OAuth client, `access=read-and-submit-read-tasks`, and `canSubmitReadTasks=true`.
6. Submit one bounded `arbor_read_historical_archive_page` task with a new request id and tiny limits.
7. Read durable task status until terminal through ordinary bounded acceptance (no rapid polling). Require stored task/objective/request ids; never infer completion from submission.
8. Repeat the same request id once and prove idempotent recovery/no duplicate objective.
9. Resume with returned content-bound cursor; prove long-message continuation if encountered.
10. STOP a bounded acceptance before a later page/checkpoint and prove no stale continuation advances afterward.
11. Rebuild the export manifest from original source bytes. Require the saved fingerprint and intended owner/project target.
12. Reverify destination coverage for batch 0 before trusting `nextBatch=1`.
13. Resume transport in bounded chunks. Each batch: apply exact → exact readback → checkpoint. On any failure, stop advancing and retry the same batch after diagnosis.
14. At transport completion, independently count/verify all normalized source identities and record **transported=59,909** only if exact coverage proves it.
15. Start ARK chronological consumption at the beginning. Reading receipts/cursors are **consumed**, not analyzed.
16. Run the developmental contract over consumed evidence. Preserve speaker, chronology, hashes, contradiction, supersession and uncertainty.
17. Reconcile later corrections before declaring any current behavior rule. Historical instructions remain evidence only.
18. Produce separate totals for transported / consumed / analyzed / reconciled / unresolved.
19. Restart the intended host/new conversation and test early, middle and recent correction retrieval plus current agency continuity.
20. Only after live evidence update the completion ledger. Do not merge/activate Production merely because this runbook passed Preview.

Separate gates remain separate: Grove hosted grants/migrations, private LM/inference budget, signed phone package, physical-device acceptance, Annabelle lane and Voice acoustic acceptance.