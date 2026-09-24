# Epstein research engine — run 12 handoff (2026-09-23)

## Verified baseline
Canonical master: `docs/research/EPSTEIN_RESEARCH_ENGINE_MASTER_BUILD_LIST_20260921.md`.
Verified lineage remains #123 → #131 → #134 → later stacked research drafts → #181 → #187 → #189/#199 → #201 → #207 → #212. Latest research implementation found in reconciliation is draft PR #212, branch `feature/research-offline-pdf-batch-pilot-20260923`, child of #207. No duplicate engine was created.

## Meaningful progress this run
Exact pre-handoff source head `f41b3d4dfcb583793a2cedb594ecfab5252a8ac8` has isolated GitHub Actions run `35940635969` SUCCESS. Job `107447570206` (`ARK research bridge and isolated PDF pilot tests`) completed successfully. Passing stages included dependency install, Poppler fixture support, ARK session bridge + Docker argument + benign PDF tests, backend build/typecheck, digest-pinned non-root PDF parser sandbox build, and real isolated benign PDF staging/idempotent-return acceptance.

This verifies master item 48 only for bounded offline local-file staging/source scope and item 54 only for the optional research-owned executor registration/source integration scope. It does NOT verify live ARK Preview execution, production persistence, external-source ingestion, scheduler/unattended work, privacy-sensitive processing, or findings.

PR #212 description was refreshed with the exact head/run/job evidence and preserved gates.

## Dependency-ordered next work
1. Item 18 remains HOLD: human rendered-page/line-order fidelity review. Do not promote OCR unless this review demonstrates a need.
2. Item 22 remains conditional on item 18.
3. Items 29/30/32/33/35/41 remain partial with their existing durability/human/privacy/production-review requirements.
4. Live ARK Preview canary claim→execution→persisted receipt→restart requires separate explicit approval; source/mock acceptance is not a substitute.
5. Items 5/6/47/49/56 remain BLOCKED on live integration/deployment/production DB authorization.
6. Item 51 remains BLOCKED on separate scheduler authorization.
7. Item 53 remains BLOCKED on explicit benign unattended-run authorization.
8. Item 55 requires real operator/phone acceptance after an authorized live host exists.
9. Item 58 remains BLOCKED on separate original-source authorization plus human original-page workflow; item 59 follows only after authorized capture.
10. Item 60 remains HOLD for actual victim/private-person detection/human verification/release workflow. No publication is authorized.

## Cleanup note
The isolated branch-scoped `research-ark-pilot-ci.yml` is useful only for this draft verification lane and must be reconciled/removed before any eventual main integration. Do not reintroduce temporary shared stacked research triggers.

## Boundaries preserved
No merge, deployment, production DB/migration, live worker, scheduler, paid API, external EFTA source processing, private/victim data processing, model inference, or publication was performed.
