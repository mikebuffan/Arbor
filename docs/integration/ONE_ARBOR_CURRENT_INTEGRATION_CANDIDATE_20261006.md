# One Arbor current integration candidate — 2026-10-06

Base: PR #260 ARK/Grove spine (96bfb7e4). This lane supersedes the Buffalo-based reconciliation topology for source review only; it does not merge main or activate protected/live systems.

## Selectively reconciled
- #265 archive preflight, chronological reader, bounded/resumable transport, exact SQL transport and current safety regressions.
- #265/#263 agency hardening: continuation contract, delegated same-action checkpoint resume, CAS startup recovery, capability-bound idempotency completion, evidence-required completion verifier.
- #267 current-truth ledger; its older ARK read-tool test was not allowed to overwrite the newer reconciled test.
- #262 durable Pattern Hop STOP/run lease, tests and proposed hosted schema. Proposal remains unapplied.
- #261 local Windows LM preflight/evaluation/smoke/manifest tools and source acceptance.
- #266 no-AVX/SSE2 runtime receipt. This proves the build/runtime path, not real foundation+LoRA inference.
- Annabelle #263 engine files are intentionally excluded from this lane while that work is active separately.

## Evidence already available
- #260 integrated ARK-spine CI passed backend regression/build/TypeScript and Flutter analyzer/regression/synthetic APK.
- #262 Pattern Hop run-control CI passed.
- #261 local Windows LM prep CI passed.
- #266 SSE2 runtime CI passed.
- Archive preparation previously established 59,909 normalized messages / 662 batches and exact verified batch 0.

## Still requires exact-candidate proof
This new combined lane has changed source relative to every prior CI receipt. Prior sibling CI is evidence for the imported components, not proof that this exact combined SHA builds. Exact-head CI/build remains required before deployment.

## Live/protected gates
Vercel exact-head deployment; ARK submission/live task acceptance; archive batches 1-661; full chronological read/developmental reconciliation; hosted Pattern Hop migration/STOP acceptance; Grove hosted grants/migrations; real private foundation+LoRA inference; signed physical-phone acceptance; production/main merge.

Completion vocabulary remains separate: SOURCE_BUILT, SOURCE_TESTED, DEPLOYED, CONNECTED, LIVE_PROVEN, USER_ACCEPTED, GATED.
