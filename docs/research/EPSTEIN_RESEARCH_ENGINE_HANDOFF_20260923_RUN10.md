# Epstein public-records research engine — Run 10 handoff

Date: 2026-09-23
Branch: `chore/research-ci-trigger-cleanup-handoff-20260923`
Base exact head: `d74a107af8eeda30cb1b477bb9fee4122722679a` (draft PR #201)

## Verified lineage and current evidence

Re-opened the canonical master list from the current research head; default `main` still does not contain that path, so the research lineage remains the canonical source. Re-checked #123 (`0158b395...`) → #131 (`cf000dc8...`) → #134 (`2b938069...`) and current #201 (`d74a107...`). No newer open research PR was found that supersedes #201; newer open #206 is Grove CI-only work and explicitly says the research workstream is unchanged.

Exact-head evidence preserved: disposable PostgreSQL items 42/45/52 passed on `8330d6be2dcc4b4f1e6502a66d2874ce9a6f4eb4`, Actions run `35871998690`; research-side ARK handoff tests passed on exact #201 head `d74a107af8eeda30cb1b477bb9fee4122722679a`, Arbor Integration CI run `35873618991`. This is synthetic/disposable and CI integration evidence only, not live ARK/worker/deployment acceptance.

## Dependency-ordered remaining checklist

1. **Item 8 — IN PROGRESS:** remove temporary stacked research PR base triggers from `.github/workflows/arbor-ci.yml` before any main integration. Current exact #201 head still contains the temporary base filters. This Run 10 branch is isolated specifically for cleanup/handoff; do not merge or deploy without separate authorization.
2. **Item 18 — PARTIAL / HUMAN HOLD:** engineering acceptance against blank independently published IRS 2025 Form 1040 is green; human rendered-page/line-order fidelity receipt remains missing.
3. **Item 22 — CONDITIONAL:** opt-in OCR only if manual fidelity review demonstrates it is required. No OCR is authorized or needed merely to advance the checklist.
4. **Item 23 — CONDITIONAL:** glyph/box geometry only if exact visual highlighting becomes a real requirement.
5. **Items 29/30/32/33/35/41 — PARTIAL:** designs/synthetic acceptance exist; production persistence/index, human original-page review, privacy release workflow, human source-independence proof, and target production role review remain gated or manual.
6. **Items 42/45/52 — VERIFIED FOR DISPOSABLE/SYNTHETIC SCOPE:** preserve as complete for that scope; do not duplicate implementation or promote to production proof.
7. **Item 54 — PARTIAL:** research-side ARK/Layer compatibility is exact-head CI verified; shared-branch/live ARK integration remains separately gated.
8. **Item 55 — PENDING:** real phone/operator acceptance; UI/read-only state must never be treated as worker liveness.
9. **Items 5/6/47/49/56 — BLOCKED:** explicit live integration / production / deployment approval plus rollback review.
10. **Item 48 — BLOCKED:** separate real-source authorization for third-party investigation-source capture/parse. Benign IRS fixture is not EFTA authorization.
11. **Item 51 — BLOCKED:** separate scheduler authorization; scheduler remains default OFF.
12. **Item 53 — BLOCKED:** explicit approval for genuine unattended benign-source hour.
13. **Items 58/59 — BLOCKED:** separate EFTA source authorization plus human original-page workflow before source reconciliation.
14. **Item 60 — BLOCKED/PARTIAL:** synthetic privacy contracts only; no private/victim dataset processing or release workflow authorized.
15. **Items 61/63/64 — SYNTHETIC/HOLD:** finding classification/report scaffolding exists, but no real finding publication or automatic publication is authorized.

## Run 10 actions and boundaries

- Verified the canonical master and historical/current PR heads before making changes.
- Confirmed #201 remains the newest research implementation draft in the open-PR set inspected; #206 is a separate Grove CI composition and states research is unchanged.
- Inspected current `arbor-ci.yml`; temporary research base triggers are still present, so item 8 cannot be marked complete yet.
- Created this isolated cleanup/handoff branch from the exact verified #201 head. No duplicate engine, runner, schema, parser, adapter, or evidence module was created.
- No merge, deployment, production DB/migration, live worker change, scheduler activation, paid API use, EFTA/private/victim-data processing, or publication was performed.

## Next numbered item

**NEXT: item 8.** Remove only the temporary stacked research PR base filters from `arbor-ci.yml`, retain ordinary `main` and `arbor-linear-runtime` PR CI targets, run exact-head CI if an authorized non-deploying trigger is available, then update the master checklist. After item 8, proceed to independent safe/manual work where possible; do not cross the explicit live/source/privacy/publication gates above.
