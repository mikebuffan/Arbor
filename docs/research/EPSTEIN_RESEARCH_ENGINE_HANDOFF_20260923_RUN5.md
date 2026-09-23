# Epstein research engine — run 5 handoff (2026-09-23)

Canonical checklist: `docs/research/EPSTEIN_RESEARCH_ENGINE_MASTER_BUILD_LIST_20260921.md` (64 items). This is a documentation-only child of #199; no source, workflow, SQL, deployed resource or private data changed.

## Reconciliation
- Verified PR heads: #123 `0158b395999178785b8607b88ab1cf5155f45832` → #131 `cf000dc8a5e4408b44889e501e1282976f8b2372` → #134 `2b93806969030bbc3dc810b10db6e3778042e306` → #181 `4ffd760c4113588325352860148b5b9c8ad974cd` → docs #187 `4d48233e055e9445f0a6239e0ff846f0c329e3e9` → item-45 #189 `3b89ba396fb381cd06ceed2d38f82396e2993e77` → repair #199 `b99068a39645708ea6df0e28575e8d3511b8c4ed`.
- Last full verified research baseline: #181, Arbor Integration CI run `35806979345` SUCCESS, scoped to its synthetic disposable DB and benign PDF engineering checks, not real-source research or live deployment.
- #189 exact-head runs `35841150124`, `35841178422` failed specifically at item-45 attempt/failure/stall stage. #199 changes test isolation only: future-dates sibling work to avoid accidental active lease during retry-delay probe.
- On this run, #199 head returned zero associated PR-triggered workflow runs. Existing workflow PR base filters do not include #199's stacked #189 base. Therefore **45 PARTIAL / NOT VERIFIED**. No execution of disposable DB was initiated.
- Parallel work: #194 Grove private backend and #196 Grove phone client are distinct draft ownership lanes; no research modification of private Grove auth, transcripts, UI or ARK integration interfaces.

## Dependency-ordered next actions
1. **45 BLOCKED for verification:** obtain explicit approval for safe disposable PostgreSQL run / CI-only exact-head mechanism without preview/deploy, then inspect full exact-head job and logs; repair demonstrated failures only. Do not label green from mock tests or #189's failed head.
2. **52 WAITING on 45:** inspect existing one-tick rehearsal and SQL adapter, then add deterministic persisted synthetic full-session acceptance on isolated research branch. Real persisted database proof is distinct from mock-only unit checks.
3. **8 REQUIRED:** remove temporary stacked CI PR base filters and close CI-only bridge #198 after evidence captured, with separate review before any main integration.
4. **42 REQUIRED:** finish independent SECURITY DEFINER/search_path/EXECUTE/RLS/owner/service-role review. Read-only source inspection found explicit RLS and grants, three SECURITY DEFINER functions with `search_path = public, pg_temp`, and final EXECUTE restrictions; this is NOT privilege/role proof.
5. **18 PARTIAL/HOLD:** benign IRS form parsed/rendered in sandbox; human page/line fidelity receipt missing.
6. **29–30, 32–33, 35, 41, 54–55 PARTIAL/REQUIRED:** persistence, provenance review, privacy, service-role matrix, scoped cross-session/operator acceptance remain separate gates.
7. **5–6, 47–49, 51, 53, 56, 58–60 BLOCKED** as applicable by production/live-worker/deployment, scheduler, real-source, benign unattended-hour, privacy-sensitive or publication authorization. Conditional OCR/geometry #22–23 require demonstrated need.

## Safety receipt
No merge, deploy, production migration, private grant, live research worker, scheduler, paid API, real EFTA/source ingestion, private/victim data processing or publication. No disposable DB execution in this run. Next numbered item: **45**. No continuous/background execution is claimed.
