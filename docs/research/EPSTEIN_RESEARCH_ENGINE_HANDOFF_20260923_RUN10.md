# Epstein public-records research engine — Run 10 handoff

Date: 2026-09-23
Branch: `chore/research-ci-trigger-cleanup-handoff-20260923`
Base exact head: `d74a107af8eeda30cb1b477bb9fee4122722679a` (draft PR #201)
Cleanup commit: `a3a756c07f8ef123fd702d2e6f8afda15dc07b08`

## Verified lineage and current evidence

Re-opened the canonical 64-item master list and re-checked #123 (`0158b395...`) → #131 (`cf000dc8...`) → #134 (`2b938069...`) → #201 (`d74a107...`). No newer research implementation superseding #201 was found; newer Grove work is a separate lane.

Preserved exact-head evidence: disposable PostgreSQL items 42/45/52 passed on `8330d6be2dcc4b4f1e6502a66d2874ce9a6f4eb4`, Actions run `35871998690`; research-side ARK handoff tests passed on exact #201 head `d74a107af8eeda30cb1b477bb9fee4122722679a`, Arbor Integration CI run `35873618991`. This is synthetic/disposable CI evidence only, not live worker/deployment acceptance.

## Dependency-ordered remaining checklist

1. **Item 8 — CODE COMPLETE / VERIFICATION HOLD:** removed all temporary stacked research `pull_request` base targets from `.github/workflows/arbor-ci.yml`; retained only `main` and `arbor-linear-runtime`. Because this cleanup deliberately removes the trigger path for this stacked branch, no PR workflow run was created for cleanup commit `a3a756c...`. Do not call item 8 CI-verified until an authorized non-deploying verification path checks the exact cleanup head.
2. **Item 18 — PARTIAL / HUMAN HOLD:** engineering acceptance against blank independently published IRS 2025 Form 1040 is green; human rendered-page/line-order fidelity receipt remains missing.
3. **Item 22 — CONDITIONAL:** opt-in OCR only if manual fidelity review demonstrates it is required.
4. **Item 23 — CONDITIONAL:** glyph/box geometry only if exact visual highlighting becomes a real requirement.
5. **Items 29/30/32/33/35/41 — PARTIAL:** designs/synthetic acceptance exist; production persistence/index, human original-page review, privacy release workflow, human source-independence proof, and target production role review remain gated or manual.
6. **Items 42/45/52 — VERIFIED FOR DISPOSABLE/SYNTHETIC SCOPE:** preserve; do not duplicate or promote to production proof.
7. **Item 54 — PARTIAL:** research-side ARK/Layer compatibility is exact-head CI verified; shared/live integration remains separately gated.
8. **Item 55 — PENDING:** real phone/operator acceptance; UI/read-only state must never be treated as worker liveness.
9. **Items 5/6/47/49/56 — BLOCKED:** explicit live integration / production / deployment approval plus rollback review.
10. **Item 48 — BLOCKED:** separate real-source authorization for third-party investigation-source capture/parse. Benign IRS fixture is not EFTA authorization.
11. **Item 51 — BLOCKED:** separate scheduler authorization; scheduler remains default OFF.
12. **Item 53 — BLOCKED:** explicit approval for genuine unattended benign-source hour.
13. **Items 58/59 — BLOCKED:** separate EFTA source authorization plus human original-page workflow before source reconciliation.
14. **Item 60 — BLOCKED/PARTIAL:** synthetic privacy contracts only; no private/victim dataset processing or release workflow authorized.
15. **Items 61/63/64 — SYNTHETIC/HOLD:** finding classification/report scaffolding exists, but no real finding publication or automatic publication is authorized.

## This run

- Verified canonical master and current research lineage before editing.
- Removed only temporary research PR base filters; ordinary `main` and `arbor-linear-runtime` CI targets remain.
- No duplicate engine, runner, schema, parser, adapter, or evidence module created.
- No merge, deployment, production DB/migration, live worker change, scheduler activation, paid API use, EFTA/private/victim-data processing, or publication.

## Next numbered item

**NEXT: item 8 exact-head verification if a safe non-deploying path is available; otherwise item 18 human fidelity review remains the next independent gate.** Live/source/privacy/publication items remain blocked pending explicit authorization.