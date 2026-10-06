# Epstein research engine handoff — 2026-09-23 run 4

Canonical master: `docs/research/EPSTEIN_RESEARCH_ENGINE_MASTER_BUILD_LIST_20260921.md`.

## Verified lineage and current heads

- Historical lineage remains #123 → #131 → #134 → later stacked research drafts → #175 → #180 → #181 → #187 → #189.
- Last fully verified implementation baseline remains #181 head `4ffd760c4113588325352860148b5b9c8ad974cd`, Arbor Integration CI `35806979345` SUCCESS.
- #187 is documentation-only head `4d48233e055e9445f0a6239e0ff846f0c329e3e9`.
- #189 item-45 head `3b89ba396fb381cd06ceed2d38f82396e2993e77` received two exact-head Integration CI runs, `35841150124` and `35841178422`; both FAILED only in the new `Exercise attempt cap, failure receipts and stalled lease recovery` stage. Established disposable DB stages before it passed; other jobs including Flutter, control backend and external blank IRS PDF acceptance passed.
- Current repair draft is #199, branch `fix/ark-research-item45-deterministic-retry-20260923`, child of #189.

## Dependency-ordered status

1. Items 1–4, 7, 9–17, 19–21, 24–28, 31, 34, 36–40, 43–44, 46, 50, 57, 61–64: preserve existing verified status from the master; no duplicate implementation added.
2. Item 18: PARTIAL/HOLD. Benign external blank IRS engineering acceptance is green; human rendered-page/line-order fidelity receipt remains required.
3. Items 22–23: NOT STARTED/conditional; only implement if manual fidelity/highlighting requirements justify OCR or geometry.
4. Items 29–30, 32–33, 35, 41: PARTIAL; production durability/human review/service-role matrix remain gated.
5. Item 42: REQUIRED before any production application: security review of `search_path`, SECURITY DEFINER and EXECUTE privileges.
6. Item 45: PARTIAL, repair implemented on #199 but NOT VERIFIED. Source inspection identified a test-isolation defect: the retry-delay probe could lease an unrelated immediately eligible sibling unit; the session-wide live-lease fence then made the intended retry return null. #199 future-dates sibling units from insertion, asserts true idle during retry delay, and makes later units eligible explicitly in order. This changes disposable acceptance only; no RPC implementation was duplicated or changed.
7. Item 52: WAITING ON 45. Deterministic persisted simulated full session remains the next safe implementation after item 45 exact-head CI is green.
8. Item 8: after item 52, reconcile/remove temporary CI-only bridge/base triggers before any integration review.
9. Items 5–6, 47, 49, 56: BLOCKED — separate live integration/deployment/production approval.
10. Item 48 and item 58: BLOCKED — separate real-source authorization; benign IRS acceptance does not authorize EFTA ingestion.
11. Item 51: BLOCKED — separate scheduler authorization.
12. Item 53: BLOCKED — explicit benign unattended-run approval.
13. Items 54–55: pending same-user isolation/cross-session and real operator acceptance after safe persistence work.
14. Items 59–60: BLOCKED/PARTIAL — no real-source reconciliation or privacy-sensitive processing/publication without the specified human and authorization gates.

## Test evidence and diagnosis

At #189 exact head `3b89ba3...`, both Integration CI runs reached item 45 only after fixture, proposed SQL, claim/settlement/RLS/STOP, boundary, independent-connection race, lock-wait and STOP-race stages succeeded. The item-45 script inserted `stalled-lease` and `later-work` as immediately eligible. Its `worker-too-soon` call only checked that the claim was not `attempt-cap`; it could therefore claim a sibling. The claim RPC intentionally permits only one active reservation per session, so the following forced retry of `attempt-cap` could be fenced by that accidental sibling lease. #199 removes that ambiguity by future-dating sibling units until their own phase.

## Next numbered action

**45 — verify #199 exact-head disposable PostgreSQL acceptance.** Do not promote item 45 until the corrected head has green exact-head CI. If green, update the master item 45 to verified disposable-DB scope and proceed directly to **52 — deterministic persisted simulated-session acceptance**. If it fails, inspect the exact failing assertion and repair only the demonstrated defect.

## Real blockers / safety boundary

No merge, production database write, live investigation worker, scheduler, production deployment, paid API, real EFTA/investigation source processing, private/victim data processing, or publication was authorized or performed by this repair. Mocks alone are not completion evidence.