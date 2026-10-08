# One Arbor B12 candidate lifecycle isolation — source-only

Reviewed parent: PR #370 exact `7d86e4e24dddde66a1d6561a5731ca44e986b52a`. Isolated branch: `review/one-arbor-b12-candidate-lifecycle-20261008`.

Scope: Existing `promoteEligibleMemoryCandidates` and `reinforceMemoryCandidate` only. Candidate prompt-read exclusion landed in PR #368/#369, but these separate write paths could still promote/reinforce explicitly excluded candidate JSON. This bounded change fails closed on `excluded_from_memory===true`, invalid record shapes, and foreign owner/project/status readbacks; narrows status updates to `proposed`. New tests use synthetic candidates only.

Limits: No cross-store forgetting, cascade deletion, provider/device erasure, production verification or fully atomic candidate-state transition. A candidate toggled to excluded after the initial read still requires an atomic server/database mutation contract to close that race. Revisit only with an owner-approved retention and lifecycle design; do not pretend this solves all B12.

This branch is included in the exact Vercel source-only skip list in its FIRST published commit. No deployed Preview, secrets, user records, worker grants, STOP action, merge or paid inference is authorized.
