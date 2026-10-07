# One Arbor Successor Accepted-Lane Composition — 2026-10-06

## Purpose

Compose only independently accepted, low-conflict source lanes onto the exact green pre-Vercel One Arbor anchor. This is a source/integration candidate, not a deployment manifest.

## Base

- PR #286
- branch: `integration/one-arbor-pre-vercel-20261006`
- exact base SHA: `65be4dc3ac59997d6bb0ee800648293b45932b6e`
- base tree: `4c2d26a54a43cd9af7a814b53efd508a1cfc2fcc`
- status: canonical exact-head acceptance green before this composition

## Included lanes

### Identity Assurance
- source PR #287
- exact source SHA: `9ffd6d4a3d68850eb87cd1e65c5bca928dcd3834`
- verification child PR #292
- verification SHA: `dd3bd0c656ff7800dc92f6f57e81820011a8fb9d`
- dedicated workflow: Identity assurance source acceptance
- result: SUCCESS
- boundary preserved: no live auth, biometrics, deployment, migration, or prompt-derived authority

### Capability Hypothesis layer
- source PR #288
- exact source SHA: `5e82ead12855971b1438a972c83dd4540783e0e7`
- verification child PR #293
- verification SHA: `be82a3ffe17a7d7223702afaa45a67ce6168f09a`
- dedicated workflow: Capability hypothesis source acceptance
- result: SUCCESS
- boundary preserved: source-only Vault extension proposal; no hosted migration or live capability promotion

### FAFO audio evidence
- source PR #289
- exact source SHA: `b71289870a66dd1a986a6a1081318d92c2a940d4`
- dedicated provenance acceptance: SUCCESS before composition
- boundary preserved: transcript remains derived evidence; no duplicate evidence engine; no speaker identity inference

### Cognitive-access language
- source PR #290
- exact source SHA: `09d182901b71028770bfe3ee935ccc7295988bfc`
- verification child PR #295
- verification SHA: `7504725b15b768a0c3d1e8b97ff25898cb62002e`
- dedicated workflow: Cognitive access source acceptance
- result: SUCCESS
- boundary preserved: raw text remains controlling source; no real-user profiling, authentication, transcript rewriting, or live route integration

## Composition method

No blind merge was used.

The successor tree was created directly from the exact green #286 base tree and the exact blob SHAs for the 20 files changed by the four accepted lanes.

Intermediate composition:
- tree: `590500cfd0749ef3e6e920b4a2942cbe54402788`
- commit: `634be7278cbf2d993a94d3534fc74b5fe18f930f`

Verification against #286:
- ahead by: 1
- behind by: 0
- changed files: exactly 20
- all 20 changes are additions
- no canonical #286 shared file was modified or deleted

## Intentionally excluded for now

- PR #291 ARK offline STOP/resume: head moved after the coordination snapshot and had no attached current-head workflow at the time of composition. Re-verify before reconciliation.
- PR #294 contextual reference / short-turn resolution: mergeable and source-complete, but no dedicated current-head workflow was attached at the time of composition. Do not silently treat source checks as whole-system acceptance.
- PR #277 Grove / independent LM / phone: lane-specific work remains source-strong but stale-base; port only exact deltas onto the successor after reconciliation.
- PR #279 ARK / agency / archive: source-strong but stale-base; port only exact non-duplicative deltas after reconciliation.

## Protected gates not crossed

- no merge to main
- no production deployment
- no Vercel deployment
- no hosted migration or grants
- no worker activation
- no fresh live ARK task submission
- no live biometric/passkey enforcement
- no physical phone install
- no independent-model live inference
- no corpus ingestion or publication
- no Annabelle prose mutation

## Next acceptance

Run exact-head acceptance on this successor. Only after it is green should moving/high-overlap ARK/Grove lanes be reconciled.
