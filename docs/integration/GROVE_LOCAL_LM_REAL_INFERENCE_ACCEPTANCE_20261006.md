# Local LM real-inference acceptance — 2026-10-06

Existing #261/#266 receipts prove preparation/no-AVX runtime path only.

Real acceptance requires owner-provided/approved private model artifacts and bounded local execution:
1. verify manifest hashes/architecture/context requirements before loading;
2. prove selected runtime uses supported SSE2/no-AVX path on target Windows machine;
3. start receiver on loopback/private boundary only;
4. run one fixed prompt through foundation model; record latency/memory/output receipt;
5. if a LoRA is supplied, verify base-model compatibility/hash then run same fixed prompt with adapter;
6. compare transport/schema behavior, not subjective quality claims;
7. prove timeout/cancel/restart;
8. prove no cloud fallback or unintended network egress;
9. shut down runtime and verify no orphan listener/process;
10. keep inference default-off until user acceptance.

Compiled runtime != loaded model != successful inference != accepted Arbor behavior.
