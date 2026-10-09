# ONE ARBOR — PR #372 + #373 source-only reconciliation

**Draft review source, no deployment or release.** Full 97-task / 15-group master remains authoritative.

## Frozen source ancestry
- First parent PR #372: `b707573d6b66f678ab7fb5671a79aa989407d38c` (the newer Preview, archive, memory and project-isolation source).
- Second parent PR #373: `c05d962ff8c6717bb08b805c06766dcfca98b5ec` (independent judgment, correction/reopen, Discovery Radar source repairs).
- Common ancestor: `f17f5b5d346c887768f91c0a7668e618c718ceae`.
- Candidate branch: `review/one-arbor-372-373-safe-composition-20261009`. Both owner PRs remain untouched.

## Integration review
Retain **all** source from #372 as the first-parent tree. Port 14 exact source/test/fixture blobs from #373 that the ancestor-to-#372 comparison proves were not changed on the newer branch. Preserve #372's stronger archive/memory and Portal changes; no stale replacement. Union both source-only Vercel ignore lists and both Actions workflows, retaining #372's existing anonymous Preview protection smoke check, adding #373 tests, and using the existing SHA-pinned source verifier.

## Test and runtime boundaries
The two parents passed their respective prior source-only CI receipts (PR #373 37879137045, 37879137077 and 37879142131). **Combined exact-head CI is NOT RUN at branch creation** and must independently verify fingerprints, full backend and control tests/build, Flutter/Grove, TypeScript and judgment/agency negatives. Built source is not deployed.

ARK Fresh App objective control remained `canControlObjectives=false` on last authenticated read. The final STOP canary was queued with 0 attempts. No canary, workers, secrets, model inference, archive import, auth changes, Vercel configuration/deployment, main merge or production change is authorized in this draft. R0–R9 release/approval gates remain independently required.
