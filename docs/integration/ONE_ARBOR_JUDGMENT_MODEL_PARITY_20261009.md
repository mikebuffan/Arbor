# One Arbor independent judgment: model parity guard
Scope: C04 / D13 independent judgment source only. Review child of #373 at `c05d962ff8c6717bb08b805c06766dcfca98b5ec`, not deployed.

The existing comparison runner verified model consistency within each A/B arm but did not compare actual provider model IDs across arms or cases. A provider fallback or model swap could therefore be represented as an otherwise successful single-model A/B capture.

Fix: keep the first verified provider model ID across the complete acceptance run. Reject later mismatched model IDs using existing `acceptance_provider_model_changed` failure; preserve the mismatched response in the private audit log and report partial/invalid rather than a completed comparison. The requested alias may differ from one consistent resolved model. No scoring or inference change.

Two synthetic tests verify changed model A→B fails without a pair and stable resolved-model alias succeeds with a pair. Existing behavior fixtures and private rubrics remain unchanged.

Exact-head independent Actions CI, source fingerprints, TypeScript, full backend and control regression are required before source acceptance. No actual independence/model evaluation, no paid model usage, private data, deployment or permission changes.
