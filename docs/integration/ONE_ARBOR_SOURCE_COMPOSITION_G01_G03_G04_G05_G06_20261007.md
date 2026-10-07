# ONE ARBOR — isolated five-lane source composition and protected live handoff

Date 2026-10-07. **Review-only source candidate. Not deployed, not merged into main, not an authorized Preview cutover.**

## Frozen lineage and owner review

Base inherited directly: Group 5 PR #343 at `e9077a66bac293437916c4ab11228752cfd2e6da`, itself a source-only child of #340 `595375d525cf561172449726ed0c086ab4ece7db`.

Read and imported exact source blobs (not source-owner PRs):
- Group 01 #344: `79d1810a605d96577b1307bbf4eb3c8047828638`, canonical ownership/release ledger.
- Group 04 #345: `e725265533123b5ca2296bc94f16810594fea114`, retrieval project isolation, API eligibility selection, Grove project-scoped memory shelf.
- Group 03 #346: `6b733602eae8b78a54cec53379fea2765a460261`, archive inventory and coverage ledger.
- Group 04 #347: `bc1f1ebbdb2a23f11abf5dff5d4dbc2112528f4e`, default-excluded memory filtering and privacy negative tests.
- Group 06 #348: `c6cc1611a3e8fdc88be3fc34815afc72b6edc7e4`, self-model evidence independence and prompt attribution.

All original branch heads remain untouched; this does not claim owner signoff. Group 13/15 Grove UI descendants #341/#342 and independent Group 02 STOP are intentionally not folded into this five-lane source pass.

## Deterministic collision decisions

The combined tree is built from base Group 5, then 23 exact source entries from sibling Git trees. Shared path `ops/grove/source-only-ignore.mjs` is the **union** of all source-only branch exclusions, plus this branch; a matching raw file from any single sibling would drop other protections.

Overlapping Group 04 paths reconciled deliberately:
1. `apps/backend/app/api/memory/items/route.ts`: #347 blob `7ad485a62c0b7433b270ec2ecfc4f71f7a5d60bc` supersets #345's required select-field change and additionally filters `excluded_from_memory=false` before default pagination.
2. `apps/frontend/lib/environment/grove_memory_shelf.dart`: #345 blob `111fedcd3e3d24d64e3e8f7b910f0a71b378069d` includes #347's exclusion fail-closed gate **and** #345's malformed project/conversation-scope rejection.
3. `apps/frontend/test/grove_memory_shelf_test.dart`: a new combined blob `e5902e4c3ba98a7c5fb6f3c73752f6577751d9cb` retains #345's misplaced project and stale-API tests plus #347's explicit exclusion/eligibility negative tests.

Direct readback checked both memory tests, project-scope and excluded-from-memory guards, Group 5 recovery/time changes, and this branch's Vercel exclusion. No owner data imported, privileges added, workers started, or memory activated.

## Test / acceptance

`.github/workflows/one-arbor-reviewed-composition-20261007.yml` invokes the existing locked pnpm/Flutter toolchains, focused five-lane regression, **full backend suite**, control suite/build, backend TypeScript/build, local-LM fixture isolation, and Flutter private shelf/isolation negatives. GitHub Actions must finish successfully on the **exact composed head** to claim source acceptance; old green component PRs are insufficient.

**Independent owner code review and R0–R9 release gates remain required after CI:**
- Confirm all source heads are unchanged or explicitly reconcile newer owner fixes.
- Obtain real authenticated Preview manifest (effective hostname, environment/project, commit, tool-catalog version), owner/project scope and known grant state.
- Validate genuine fresh-session continuity/corrections/time/context behavior after a separately authorized Preview deployment, not against the older #322 running SHA.
- Run real blind multi-turn/voice behavior tests only with consented private examples and explicit model-runtime authorization.
- Do not infer live success, behavioral retention, source consumption, objective control, or released functionality from this source-only draft.

## Protected checkpoint

Never touch September 28 research task, Group 02 queued STOP/canary, unapproved archive exports, excluded memories, public/private realm boundaries, model training, production aliases, main branch or release secrets. A blocker in any live gate remains **BLOCKED**, not silently waived by this review composition.
