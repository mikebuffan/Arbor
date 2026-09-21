# Arbor builds: ordered work lanes (September 21, 2026)

**Purpose:** return Danelle's time. Epstein evidence research is the mission; a source-first engine is required to process the files without constant human prompts. Grove is the interface, continuity carries unfinished work, and other rooms are separate applications. A successful build must not require the owner to sit in a thread issuing repeated "go" messages.

| Lane | Actual repository state | Next acceptance gate |
| --- | --- | --- |
| Epstein research engine | Draft PR #123: bounded sessions, proposed SQL, original-byte PDF capture/provenance contracts and tests | Disposable Postgres privilege/concurrency/deadline verification; deployed worker v5 reconciliation; actual PDF extraction; authorized scheduler; unattended hour with cited result |
| Grove environment | Draft PR #122: standalone debug flavor, House Clock, Living Window, kitchen doorway | Install and sign in on device; visual acceptance; release packaging, no production deploy without explicit approval |
| Grove operator interface | Draft PR #124: truthful decision status, real ARK objective events in Home; CI passed as of this work | Verify on phone and integrate with standalone house; don't confuse "no request recorded" with worker heartbeats |
| Cross-session objective continuity | This draft branch: private owner/project-scoped read-only `/api/ark/handoff`, deterministic active objective, recorded checkpoint, next action, task summary and latest ARK event | CI, same-user different-project isolation tests, integrate across Text/Voice/Grove; test interruption-to-resume in an actual signed-in runtime |
| Annabelle kitchen | Kitchen doorway and temporary scratchpad in draft #122 | Genuine writing session routing, manuscript/canon retrieval, consented storage, voice continuity |
| Body / Atlas | Earlier design, not claimed integrated | Define scoped data and provenance model; avoid confusing hypotheses with medical findings |
| Experiment workshop | Proposed application atop research/continuity | Isolation, bounded costs, evidence checks, repeatable tests and an owner-controlled approval gate |

## Safe order
1. Complete source-first Epstein research engine and genuine unattended acceptance.
2. Assemble isolated Grove branches into the standalone app only after conflicting files and code are reviewed.
3. Prove one active objective across Text → Voice → Text and a new session, without raw repeated explanations; never represent a read-only handoff as autonomous work.
4. Complete Annabelle kitchen and Atlas as separate workspaces; reuse the verified memory, provenance, and approval contracts.
5. Add workshop experiments and capabilities incrementally, measuring successful output rather than commit volume.

## Boundaries
- No changes here to production worker v5, Supabase schemas/data, ARK gates, public research evidence, billing, or Vercel cron.
- Read-only handoff reports **persisted status, not worker liveness**. Completion evidence recorded is not verified completion.
- Research PR #123 and Grove PRs #122/#124 may be worked on in separate threads. Do not overwrite their heads or merge without review.
- No ChatGPT conversation can continue executing while awaiting a later user message unless a separately deployed/scheduled process exists. A proposed 60-minute research loop is not proof it currently runs unattended.
