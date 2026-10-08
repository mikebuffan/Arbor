# ONE ARBOR — 15-group source-only assembly, final review lane

Date: 2026-10-07. This is a **source review candidate only**. It does not authorize deploy, merge into main, worker/STOP, database write, personal memory ingestion, private transcript, model inference, voice capture, training, data deletion or any release gate.

## Reviewed ancestry and owner lanes

Base: Group 4 PR #352 @ `45e041443d78ae34431f88d6be6630bf9d7e6056` incorporates PR #349 five-lane source (Groups 1,3,4,5,6), including verified owner/project exclusions, timeline/recovery, memory shelf with bounded owner-scoped pages, and 21-file source fingerprint guard.

Fresh review-only source imports from individually source-tested owner branches:
- Group 07 #350 `e984d41194972b408ebffa5d5c473b618162d8a5`, behavior/STOP interpretation, 7 changed owner files.
- Group 08 #351 `f1f1a2330160472a31969bfa5a6b308a9ef639be`, Body System/Felt Life/causal negatives, 9 files.
- Group 09 #353 `604616cd748281cbfb14b257e53225bbaa119f72`, decision/truth/priority negatives, 5 files.
- Group 10 #354 `4a25b836bbbd99505fa28ea340794ed6679e69c9`, Pattern Hop independence, 4 files.
- Group 12 integration #358 `3c3c3a10186e915b3058d6c112f3646028c73c2b`, existing private Grove persistence/replay and its tests, 7 feature+receipt files. The original Group 12 owner work is #355.
- Group 13 #356 `3a6afea9d93d30b43d3cd3a1387c3d1938bf20b5`, read-only Grove rooms and unsaved Workshop, 4 files; its #341 read-only professional workspace ancestor contributes 3 more.
- Group 14 #357 `e104958982c1e4f133304d4c5d2c672d01258b72`, Annabelle diagnostic checkpoint safety, 4 files.
- Group 15 #359 `30e29fac47b5b3ae48de9b3f5f955ae0c9465c61`, manually reviewed records and contributor scope, 4 files; #342 unsaved diary ancestor contributes 5 more including the Grove environment navigation shell.

**52 owner-source files** were imported by exact Git blob SHA, not recreated as a parallel engine. The preserved base plus this source subtree are review-only. Each original PR remains independent and unmerged. Source-only Vercel exclusions from all lanes are unioned, never replaced with a single sibling variant.

## Do not overwrite older Group 11 continuity

Group 11 decision ancestry/review/radar implementation in #334 is already present byte-for-byte in the consolidated base for its session, decisionAncestry, decisionReviewAdapter and discoveryRadar files. `longitudinalPolicy` and `longitudinalShorthand.integration.test` differ because Group 5 later corrected them. Their newer Group 5 source was deliberately retained, rather than silently restoring stale Group 11 files.

## Group 2 — still genuinely gated

The ARK acceptance route from #326, hosted STOP objective, grants, worker and hosted control/resume are **not** imported or run as part of this source-only assembly. The authenticated Fresh App role has `canControlObjectives=false` and no behavior-test authority. The final STOP canary remains queued; it must not be advanced by CI/source composition.

## Boundary collision decisions

- Keep Group 4's currently verified scoped shelf and 21-file fingerprint source base; **do not** import older Group 12 fingerprint manifest, which had 20 pins and could lose updated Group 4 privacy guards.
- Import Group 12's owned Grove data/loop, tests, and dedicated workflows. Preserve the previously reviewed source guard executable and expand the manifest with exact new owner blobs, without changing its checks.
- Use #342 as the descendant of #341 for the Grove navigation shell, preserving both professional workspace and unsaved diary; import #356's room inventory independently.
- Keep the server's exclusions and manual review paths; all new tests use synthetic data, no user-owned data.
- No arbitrary merge of release branches; this is one descendant review PR with its own testing and owner handoff.

## Acceptance hierarchy

1. Git source composition/source fingerprints: verify exact source blobs and CI checkout SHA.
2. Synthetic multi-lane source tests: backend and control tests/build, TypeScript, Flutter analyzer/widgets.
3. Owner source/permissions/release review: separate; Green CI is NOT permission.
4. Authenticated hosted runtime parity, private scope/forget negatives, Android UI and fresh-session behavior tests: protected; not inferred.
5. Real independent model causality, voice/LM acceptance, deployment, production rollback: protected.

A skipped or failing test blocks source acceptance; an unavailable tool blocks a protected live gate. No silent continuation into higher-authority actions.
