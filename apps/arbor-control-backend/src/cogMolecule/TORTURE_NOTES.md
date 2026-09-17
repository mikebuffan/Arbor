# Cog Molecule Torture Notes

## 2026-09-17 — adversarial evidence pass 1

### Workload
Synthetic diagnostic covering supported evidence, late evidence, contradictory sources, provenance verification, unsupported claims requiring SEEK, and association-vs-culpability separation. This is a constructed diagnostic, not evidence of general model superiority.

### Failure found
The first recurrent run scored 5/6 (83.3%). The only recurrent failure was `late-evidence`. The one-pass linear baseline failed `late-evidence`, `contradiction`, `provenance`, and `association`.

### Root cause
The late-evidence worker re-observed the same evidence on later circulations. Packet state accumulated duplicate observations, so the serialized state changed every round and never satisfied the convergence gate. The runtime exhausted its compute boundary despite having resolved the substantive uncertainty.

### Mechanism repair
Normalization now removes exact duplicate observations before convergence comparison. It deliberately does **not** collapse conflicting observations merely because they share an evidence ID; conflicting values/provenance remain separately live. Packet normalization also canonicalizes set-like ordering (packet provenance/unresolved strings, evidence provenance, hypothesis support/contradictions, challenge provenance, and collection ordering) so semantically identical state does not fail convergence merely because equivalent facts were reordered.

### Regression attacks
- repeated identical late evidence must converge rather than grow forever;
- two conflicting observations with the same evidence ID must both survive normalization;
- equivalent evidence/provenance arriving in alternating orders must still converge.

### Verified result after repair
Control-backend CI passed 34/34 test files and 110/110 tests; TypeScript build passed. The six-case adversarial diagnostic reported recurrent failures `[]`, recurrent accuracy 1.0, false-release rate 0, mean compute 2.3333, Brier score 0.07. The linear control remained at accuracy 0.3333, false-release rate 0, mean compute 1, Brier score 0.215. These numbers describe this synthetic six-case diagnostic only.

### What still sucks / next pressure
The recurrent path buys accuracy here with more compute. The workload is tiny and hand-constructed. `meanRepairs` is still 0, so the benchmark is not yet exercising/measuring explicit repair accounting well. Real corpus retrieval, noisy provenance, repeated-but-not-identical evidence, stale/updated sources, and larger mixed workloads remain unproven. Production Arbor remains unswitched.
