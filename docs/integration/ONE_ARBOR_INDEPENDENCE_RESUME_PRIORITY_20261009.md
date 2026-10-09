# One Arbor independence — safe resumptions and priority-aware backlog (review)

Child of exact source-green #380 (`d6258b486bdaedb83bfcc2b77dcb203bdd59119e`). Scope: source-only agency and independent task selection; **not ARK** and not any deployed or paid model path.

## Proven defects and bounded corrections
1. `runAgency` currently reset *every* restored matching state to `active` with `blocker: null`. This could erase a durable protected blocker on an ordinary continuation, and even rerun a terminal goal with no work left. A fast return now retains restored `blocked` state (including malformed missing-blocker case) and genuinely `complete` states with no unfinished work without assessment or side effects. A distinctly requested, unrelated safe goal still runs as a new objective. A separate trusted authorization/state transition is required to clear a real block. No new worker or grant path.
2. `planBacklogContinuation` previously picked the first runnable item regardless of importance. Add an **optional trusted caller priority** between 0 and 100, rank eligible pending work descending while preserving input order for ties, and reject malformed rankings. Existing unranked calls behave unchanged. Dependencies, already-complete work and human boundaries always outrank urgency. It is input ranking, **not** model judgment.

## Tests
In existing suites: negatives for every protected blocker class and a malformed blocker; no side effects on already-complete goal; positive separate-goal execution; prioritization among blocked/dependent/completed/pending cases; equal-priority stability; invalid priority and missing dependency. Existing independent/continuation test and full backend, TypeScript, control and CI builds should pass on exact child SHA before source completion.

No main merge, deployment, paid inference, model evaluation, private ingestion or new autonomous executor. Fresh blind model behavior remains unproven; source pass is not a live independence acceptance.
