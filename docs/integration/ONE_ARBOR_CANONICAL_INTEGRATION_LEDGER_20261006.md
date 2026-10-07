# One Arbor Canonical Integration Completion Ledger

Date: 2026-10-06
Canonical branch: `integration/one-arbor-canonical-20261006`
Protected baseline parent: `integration/one-arbor-pattern-hop-research-20261006`
Policy: source reconciliation and non-production acceptance only. No merge to main, production deployment, hosted migration/grant, live worker/scheduler activation, inference activation, archive import, or physical-device installation is authorized by this ledger.

## Canonical source chain

| Lane | Source | Exact reviewed head | Canonical disposition |
|---|---|---|---|
| Buffalo | PR #249 | `65f7ae96a4162b6ef5f069713d685c01c4517b19` | ancestry preserved through current One Arbor line |
| Grove + bounded ARK spine | PR #260 | `96bfb7e4593e3a3e44f58522ca059fb87013387f` | all 31 changed blobs verified preserved exactly before canonical reconciliation |
| local Windows LM prep | PR #261 | `7fb702a76156184cd317edd34b42a69796ed1eb8` | source/docs preserved; branch-specific historical workflow intentionally not copied |
| Pattern Hop durable STOP/run lease | PR #262 | `1cab47e1b8dc948507bc100e9b15785d3cbf5212` | source/docs preserved; current Pattern Hop research file is newer; historical workflow not copied |
| Annabelle + agency audit | PR #263 | `8a356022aac7b35ee75ed1444e6269246a888bc9` | Annabelle/Felt-Life suite and missing non-destructive helpers selectively reconciled; newer current chat/agent code retained |
| archive/export reconciliation | PR #265 | `b43f125bb3e3f1a0cb035321afe47f4ab467aa8c` | archive implementation preserved; newer current overlapping source retained; historical contract/runbook restored |
| current One Arbor spine | PR #268 | `3c599ffd655409d8f72116ec857b76dfa646bd50` | canonical ancestry |
| Evidence Engine audit | PR #270 | `2b3839e00a900c67a88025e01855c0963ea3c3f1` | executable pieces already present through research reconciliation; missing audit contracts restored |
| public alpha + torture finish | PR #273 | `3046356656a9806e3e4d3bd5c6d430a6af9e609e` | selectively reconciled; local PDF parser overlap resolved in favor of newer #276 implementation |
| ARK finish-line contract | PR #274 | `e2583f9e14bd70dc6b06b613599fe61c5165869b` | contract restored |
| Pattern Hop domain lenses | PR #275 | `b27d60d1855564e9eace7794ec8caf3601e5c164` | executable lenses already reconciled through #276; handoff restored |
| Pattern Hop → One Arbor | PR #276 | `e4086643e9beb56ce21d92a9bcd71f540daae1d7` | exact canonical starting head |

Canonical selective reconciliation commit before acceptance-workflow/ledger commits:
`8de213a540a1a6c60d20081d36555ad18ca79193`

## Conflict decisions

- No broad merge of #263 was performed. Its divergent `chat/route.ts` and `agency/openaiAgent.ts` were not allowed to overwrite the newer One Arbor implementations that already carry checkpoint/continuation and delegated retry semantics.
- The Annabelle engine suite, Felt-Life expansion, engine catalog, identity containment, reconciliation contract and missing agency acceptance helpers from #263 were recovered because they were absent from the current candidate.
- #273's `localPdfParser.ts` was not copied because #276 had already advanced the same injection seam; the newer #276 implementation was retained.
- Historical branch-specific CI files from #261/#262/#265/#270/#275 were not copied into canonical source. Their useful acceptance coverage is represented in the canonical exact-head workflow instead.
- Where #265 archive/agency files differed from current One Arbor, the current files were retained because the archive implementation was already present and the differences were newer continuation/archive revisions, not missing archive functionality.
- Older #232–#235 Annabelle/memory/correction work was inspected as ancestry. Existing current implementations were retained rather than replacing newer files with older branch blobs.

## Evidence matrix

### Source-proven

- Grove/ARK bounded spine: source-preserved.
- Archive/export reader and resumable transport: source-preserved.
- Durable corrections/memory/restart primitives: source-preserved.
- Annabelle engine suite + Felt-Life Atlas expansion: source-reconciled.
- Pattern Hop durable run control + domain/evidence lenses: source-reconciled.
- Evidence Engine source-independence, claim/evidence/counterevidence, rerouting, travel/payment/witness/coverage/source-preference logic: source-reconciled.
- Local Windows LM preparation/runtime manifest tooling: source-preserved.
- Isolated public Arbor alpha source: source-reconciled.
- ARK finish-line execution contract: source-reconciled.

### Test-proven component evidence

Historical component receipts retained as evidence, but they do not substitute for canonical exact-head acceptance:

- PR #260 run `37515852100`: ARK/Grove integrated backend + phone success.
- PR #261 run `37538562940`: local Windows LM prep, static-CRT no-AVX build, dependency audit and executable launch success.
- PR #262 run `37525432303`: Pattern Hop control backend/build/TypeScript + disposable native PostgreSQL success.
- PR #273 run `37546529292`: continuity torture backend + phone success.
- PR #273 run `37546529290`: isolated public alpha backend/build/TypeScript + public Android synthetic build success.

Canonical exact-head acceptance is performed by:
`.github/workflows/one-arbor-canonical-ci.yml`

It covers full backend regression, focused Annabelle/Felt-Life, Pattern Hop/Evidence Engine, continuation/archive/Grove/ARK, TypeScript, production build, full Flutter regression, Grove synthetic APK, public-alpha synthetic APK, native PostgreSQL correction/concurrency/recovery checks, Pattern Hop SQL run-control acceptance, and an exact no-AVX Windows llama.cpp build/launch/dependency audit.

Canonical exact-head result: **PENDING** until the canonical draft PR completes its checks.

### Deployment-proven

- No new deployment is claimed by this canonical reconciliation.
- No production or Preview runtime acceptance is inferred from source/CI success.
- Existing historical deployment evidence remains historical and must not be promoted to canonical live proof without an exact deployed-head check.

### Device-proven

- PR #261 established a read-only physical Windows target preflight and source/runtime compatibility preparation.
- CI synthetic Android builds are test evidence, not physical-device installation evidence.
- Canonical physical phone install/use and real local-model inference remain unproven here.

### Protected gates remaining

- merge to `main`;
- production or protected Preview deployment;
- hosted Supabase migration/grant application;
- live Grove private write grants;
- live Pattern Hop run-control schema activation;
- live ARK worker/scheduler activation;
- real local/private LM model inference activation;
- real public-alpha credentials/account provisioning;
- physical Android installation/device acceptance;
- archive import beyond already authorized historical work;
- any consequential live-state mutation requiring owner approval.

## Acceptance rule

A lane is not marked deployment-proven or device-proven merely because source or CI is green. The canonical candidate is complete for bench/source integration only when its own exact-head workflow is green and all remaining items are genuinely protected/live gates.
