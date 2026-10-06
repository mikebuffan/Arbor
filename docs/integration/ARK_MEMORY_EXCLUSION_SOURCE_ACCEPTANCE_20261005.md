# Memory eligibility connection repair — October 5, 2026

This source candidate extends the deployed bridge candidate fea53e279c66ea61e80de9891b3e20db97048829. It does not change the deployed sandbox, import archives, copy memories or enable execution.

## Demonstrated gap and repair

General direct retrieval and always-included anchors did not enforce the existing excluded_from_memory column. Prompt selection also ignored it. The legacy vector RPC can omit current exclusion state, so its result is not sufficient evidence of current eligibility.

Direct retrieval and anchors now query non-excluded rows and filter returned excluded rows defensively. Prompt selection excludes them even if core, pinned, locked or explicitly triggered. Vector candidates are reloaded through owner-scoped current rows; current content, status, deletion, exclusion and project/conversation scope replace stale vector snapshots. Missing rows disappear. If eligibility lookup fails, existing direct scoped retrieval is used; failed direct retrieval propagates. Permanent behavior-correction reads enforce exclusion too. No schema or dependency changes.

The correction storage fixture now models the existing database false default for excluded_from_memory. This fixes fixture-only recovery failures discovered when the new query predicate was added; production logic does not relax exclusion for missing eligibility reads.

## Verification

- 702 backend tests across 127 files passed, including five new retrieval exclusions/current-vector tests and the expanded durable-correction rejection case.
- TypeScript passed.
- Production Webpack build passed with offline placeholder configuration; existing middleware/Sentry warnings remain nonfatal.
- git diff --check passed.
- No private archive contents or extracted personal-memory values are included in this commit.

## Remaining acceptance

Deploy only through the established release process. Verify exclusion and current-record scope against the intended live host before connecting a larger memory inventory. Source tests do not establish generated behavior or live persistence. Main/preview memory ownership mapping, old-rule supersession, archive ingestion, automatic ChatGPT capture and worker activation remain separate tasks.
