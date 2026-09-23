# Research CI bridge cleanup plan — 2026-09-23

Status: prepared only. Do not execute until item 45 and item 52 exact-head evidence is retained.

## Temporary artifacts identified

- PR #198 — CI-only bridge from research item-45 branch to `main`. It is open, draft, explicitly DO NOT MERGE.
- `.github/workflows/arbor-ci.yml` currently contains temporary pull_request base entries for multiple stacked research branches, each annotated for removal before main integration.

## Cleanup dependency

Do not close/remove verification machinery until:
1. #199 item-45 corrected head has a successful exact-head disposable PostgreSQL acceptance receipt through an approved non-deploy mechanism.
2. Item 52 persisted-session simulation has been run in the disposable environment and its exact commit/result recorded.
3. Any failure logs needed for audit have been referenced in the research handoff.

## Cleanup actions when dependency is satisfied

1. Re-read latest workflow and all open research PR heads; do not use this dated plan as authority if branches changed.
2. Remove only research-specific temporary pull_request base filters that are no longer needed. Preserve any filter another active workstream still owns.
3. Close CI-only PR #198; do not merge it.
4. Verify no CI-only bridge remains pointed at `main` solely to trigger research tests.
5. Run workflow syntax/source review on the cleanup head.
6. Record before/after workflow SHA and list of removed filters.
7. Leave normal `main` and shared supported CI triggers intact.
8. Do not deploy or merge as part of cleanup.

## Current decision

Item 8 remains OPEN. Cleanup is intentionally deferred because item 45 exact-head verification is still missing and item 52 is staged but not executed.
