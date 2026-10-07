# One Arbor Low-Conflict Staging Candidate — 2026-10-06

Status: NON-FINAL SOURCE STAGING

Base:
- PR #286
- 65be4dc3ac59997d6bb0ee800648293b45932b6e
- canonical exact-head acceptance: green
- continuity torture: green

Included exact source heads:

- Identity Assurance #287:
  9ffd6d4a3d68850eb87cd1e65c5bca928dcd3834
  Verification child #292: green

- Capability Hypothesis #288:
  5e82ead12855971b1438a972c83dd4540783e0e7
  Verification child #293: green

- FAFO audio provenance + Evidence Engine seam #297:
  53e5a13c62d303a4f1cae08c07a89dd1eb369ced
  Dedicated seam acceptance: green

- Cognitive Access #290:
  09d182901b71028770bfe3ee935ccc7295988bfc
  Verification child #295: green

- Contextual Reference #294:
  da0657eaf5b41ebb50cdf6ec82ea6e81402ea052
  Verification child #301: green

- Operational Receipt #298:
  f97d67358c62e8c9ad3834cbc7324dd1832b8302
  Dedicated acceptance: green

- Humor Pragmatics #300:
  c8c5fe4f0b18c7e6b002085a647072fe39dac687
  Dedicated acceptance: green

- Simplification / ownership audit #299:
  849ff2cab2eb1bdad68b203c96be52c58a32f34e
  Documentation only

Deliberately excluded:

- #291 ARK offline STOP/resume because its head is still moving
- #279 ARK/agency/archive because its shared base is stale relative to #286
- #277 Grove/LM/phone because its shared base is stale relative to #286
- hosted migrations
- live auth/biometrics
- production deployment
- main merge
- inference activation
- physical phone activation
- corpus ingestion

Composition method:

This staging branch starts from exact #286 and copies only the changed
source/test/documentation files from the exact heads above.

Feature-specific temporary CI workflow files are intentionally NOT copied.
Instead this branch owns one combined staging acceptance workflow.

This is not a declaration that the whole One Arbor project is final.
Its purpose is to prove the low-conflict additions coexist cleanly before the
moving runtime/ARK/Grove deltas are reconciled.

Acceptance requirements:

1. All focused included-lane tests pass together.
2. Standalone TypeScript passes.
3. Full backend regression passes.
4. Production backend build passes.
5. No hosted migration is introduced by this staging branch.
6. Accessibility/reference modules retain no identity or durable-write authority.
7. Audio transcripts do not become independent corroboration.
8. Operational receipts remain projections, not a new durable store.
9. Humor remains optional and context-gated.
10. Identity behavioral evidence remains recognition-only.
