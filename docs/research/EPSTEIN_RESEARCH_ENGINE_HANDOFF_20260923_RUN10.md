# Epstein public-records research engine — Run 10 handoff

Date: 2026-09-23
Branch: `chore/research-ci-trigger-cleanup-handoff-20260923`
Base exact head: `d74a107af8eeda30cb1b477bb9fee4122722679a` (draft PR #201)
Cleanup branch current reviewed head before this handoff refresh: `7179920ad35a0bc1a518631549e4af5d1f3da860` (draft PR #207)

## Verified lineage and current evidence

Re-opened the canonical 64-item master list and re-checked #123 → #131 → #134 → #201 → #207. No newer research implementation superseding #201/#207 was found; newer Grove work is a separate lane.

Preserved exact-head evidence: disposable PostgreSQL items 42/45/52 passed on `8330d6be2dcc4b4f1e6502a66d2874ce9a6f4eb4`, Actions run `35871998690`; research-side ARK handoff tests passed on exact #201 head `d74a107af8eeda30cb1b477bb9fee4122722679a`, Arbor Integration CI run `35873618991`. This is synthetic/disposable CI evidence only, not live worker/deployment acceptance.

Item 8 now has a separate read-only verification receipt: Integration CI run `35904677599`, job `Pinned research item-8 workflow cleanup (offline; no research data)` SUCCESS. That job read exact Git object `7179920ad35a0bc1a518631549e4af5d1f3da860`, compared it to verified #201 `d74a107af8eeda30cb1b477bb9fee4122722679a`, proved the only changed paths were `.github/workflows/arbor-ci.yml` and this handoff, and verified the pinned workflow retains only `main` / `arbor-linear-runtime` pull-request targets plus main push. It did not fetch PDFs, read EFTA/victim data, apply migrations, run the research worker/scheduler, merge, deploy, or publish. This verifies item 8 cleanup for its exact source scope; it is not a research release receipt.

## Dependency-ordered remaining checklist

1. **Item 8 — VERIFIED FOR SOURCE/CLEANUP SCOPE:** temporary stacked research `pull_request` base targets are removed; ordinary `main` and `arbor-linear-runtime` targets remain. Receipt: run `35904677599` against pinned exact object `7179920...`. Preserve this; do not recreate CI bridges.
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

- Re-opened the canonical master from the current research lineage rather than relying on default branch, where it is absent.
- Reconciled current PR heads and confirmed #207 remains the newest research-specific branch; later PRs are Grove/integration work and do not supersede the research engine.
- Promoted item 8 from verification HOLD to verified source/cleanup scope only, based on the independent pinned-object CI receipt above.
- Refreshed this saved handoff without creating a duplicate engine or implementation.
- No merge, deployment, production DB/migration, live worker change, scheduler activation, paid API use, EFTA/private/victim-data processing, or publication.

## Next numbered item

**NEXT: item 18 human rendered-page/line-order fidelity review.** This is a human/manual gate and cannot be honestly completed by source CI alone. If that review shows OCR is necessary, proceed to conditional item 22; otherwise skip OCR. Independent safe engineering beyond this point is largely exhausted until explicit authorization for live integration, real-source capture, scheduler/unattended execution, privacy-sensitive processing, or publication.