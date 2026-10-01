# Epstein public-records research — ingestion & verification v1

Date: 2026-10-01

**One ARK lineage. No second engine.** This layer extends the existing research engine and remains source-first, public-record-only, privacy-HOLD, and non-publishing by default.

## What this branch implements

### Intake / corpus integrity
- Deterministic document typology.
- Deterministic structural extraction for email, phone, tail number, document/passport pattern, routing code, money, dates, coordinates.
- Exact page SHA-256 plus normalized-text SHA-256 and bounded token signatures.
- Near-duplicate similarity as a candidate signal only.
- Missing integer/Bates sequence detection.
- Deterministic page batching/idempotency keys.
- Immutable source-coordinate mention model.

### Release / redaction / missingness
- Release snapshot comparison for added, removed, changed and reordered pages.
- Newly referenced attachment detection.
- Redaction geometry similarity normalized by page dimensions.
- Redaction geometry never resolves hidden identity.
- Expected-record/missingness receipts remain research leads only.

### Entity resolution
- Candidate-first entity records.
- Alias normalization and Levenshtein similarity.
- Fuzzy scores never merge identities.
- Resolved / candidate / ambiguous / rejected gate.
- Append-only correction chain so a bad resolution can be reversed without rewriting original mentions.

### Relational architecture / cogs
- Typed evidence-backed edges.
- Most-connected metrics: degree, edge-type diversity, source-family diversity, evidence diversity, temporal span.
- No “most important” inference from graph centrality.
- Proximity edges remain explicitly proximity edges.
- Source-origin families collapse byte-identical mirrors and explicit derivative reporting so repeated reporting cannot masquerade as independent corroboration.
- Every next-hop directive requires trigger evidence and a stopping condition.

### Timeline / pattern analysis
- Exact, approximate, before, after and range observations.
- Event-time vs report-time separation.
- Same-entity incompatible-location conflict detection.
- Recurring key/pattern detection.
- Transcript response-pattern shift detection based only on observable linguistic form.
- No deception, guilt, fear or motive inference.

### Finding integrity / replay
- Evidence status is separate from identity status and extraction confidence.
- Versioned finding candidates.
- Downstream evidence replay when evidence is corrected, superseded, reclassified duplicate, retracted or identity-changed.
- Adversarial review checks source independence, counterevidence search, alternatives, chronology and identity uncertainty.
- Findings remain HOLD for human review.
- Publication preflight requires privacy resolution, original-page review and explicit release authorization.

### Roundabout / interrupt flow
- Bounded directives with max depth, max hops and stopping condition.
- Research interrupts preserve a parent checkpoint and queue as a branch rather than halting ingestion.
- Per-pass orchestration emits at most three next directives.
- Per-pass output remains HOLD and cannot start workers or publish.

### Durable persistence proposal
docs/research/sql/PROPOSED_epstein_ingestion_verification_v1.sql

The proposed schema adds:
- documents
- pages
- redaction boxes
- mentions
- entity candidates
- identity decisions
- source-origin records
- graph edges
- timeline observations
- anomalies
- bounded interrupts
- versioned findings
- finding dependencies
- evidence-change receipts
- expected-record leads

RLS is enabled in the proposal, but **no live policies, service-role grants, migration application, scheduler, ingestion or publication authorization is created**. Existing item-42 privilege review remains mandatory before production application.

## Synthetic acceptance added

Backend Vitest:
- ingestion fingerprints / extraction / batching
- no-silent-merge identity gate
- release delta and redaction geometry
- graph centrality and source-origin collapse
- temporal contradictions / recurring patterns / transcript shifts
- finding replay / adversarial holds / privacy gate
- composed research pass

Disposable PostgreSQL:
- proposed schema application
- mention idempotency
- identity decision constraints
- missingness cannot be promoted to a factual state
- sequential finding version constraints
- finding dependency persistence
- evidence-change persistence

## Implementation mapping to the 42-item 2026-10-01 build list

1 canonical ingestion schema — implemented in proposed SQL and TS contracts
2 page fingerprinting — implemented
3 near-duplicate detector — implemented as bounded token similarity candidate signal
4 release/version lineage — represented; durable release lineage still requires integration with source-version persistence
5 Release Delta Engine — implemented pure comparison layer
6 redaction geometry mapper — implemented
7 missing-sequence detector — implemented
8 Expected-Record / Missingness Engine — implemented lead contract
9 document typology — implemented
10 deterministic structural extraction — implemented for machine-safe formats; names/orgs remain candidate resolver work
11 Evidence Mention Ledger — implemented TS + proposed SQL
12 entity candidate creation — implemented
13 alias/variant resolver — implemented candidate ranking
14 identity gate — implemented
15 reverse identity correction — implemented append-only supersession chain
16 global relational edge builder — implemented edge contract
17 cogs analysis — implemented metrics
18 evidence-origin fingerprint — implemented source-origin families
19 timeline extraction upgrade — data contract implemented; natural-language date extraction remains upstream
20 temporal constraint solver — implemented conservative conflict checks
21 Pattern Hop hooks — next-hop/interrupt contracts implemented; live worker wiring remains integration-gated
22 recurring-pattern detector — implemented
23 response-pattern shift detector — implemented
24 expectation-vs-observation — implemented as missingness lead contract
25 contradiction trigger — temporal/delta anomalies produce evidence-backed anomaly inputs; live persistence wiring remains integration-gated
26 Research Interrupt Queue — implemented pure queue contract + proposed persistence
27 three-directive Roundabout generator — per-pass cap and bounded directive contract implemented
28 evidence status vs model confidence — separated in types/contracts
29 Claim↔Evidence↔Counterevidence integration — dependency contract implemented; existing graph remains canonical
30 adversarial finding check — implemented
31 downstream evidence replay — implemented
32 finding versioning — implemented
33 private-person/victim protection gate — existing privacy modules preserved; publication preflight integrated
34 Investigation Cockpit — implemented summary contract
35 explain-next-hop — implemented
36 checkpoint everything — interrupt parent checkpoint contract implemented; existing ARK session checkpoint remains canonical
37 idempotency — deterministic batch keys + DB unique constraints implemented
38 batch-size control — implemented
39 provenance torture tests — synthetic paths cover mention → page/source refs and source-family collapse; full original-page proof remains existing HOLD
40 hallucination torture tests — key non-inference constraints implemented/tested
41 synthetic acceptance corpus — represented across deterministic synthetic unit/integration tests
42 pass/fail acceptance — CI wiring added for backend tests and disposable PostgreSQL schema acceptance

## Deliberate gates that remain

These are not unfinished coding masquerading as “done.” They are authorization/verification boundaries:

1. Exact-head CI for the item-45 repair and this branch.
2. Existing item-42 database privilege/security review before production application.
3. Live worker/deployment wiring.
4. Scheduler authorization.
5. Real-source Epstein/EFTA ingestion authorization.
6. Human original-page fidelity/privacy review.
7. Any publication/release action.

No production DB, live worker, scheduler, paid API, real investigation source, private/victim data, merge or publication is authorized by this branch.
