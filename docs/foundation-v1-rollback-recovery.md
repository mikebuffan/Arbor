# Foundation v1 rollback and recovery

This procedure restores a known-good Foundation candidate without reconstructing Arbor conversationally.

## Immutable recovery inputs
- tested Git commit SHA
- database migration list/schema snapshot
- canonical corpus/version identifier
- derived index/ledger version
- runtime configuration fingerprint
- exact test/CI results

## Recovery order
1. Stop promotion of new derived self-model/corpus records; raw sources remain immutable.
2. Select the last tested Foundation checkpoint by exact commit/state/corpus/config identifiers.
3. Restore application code from that commit on an isolated branch; do not rewrite protected main.
4. Verify database schema is compatible with the selected commit. Never reset or overwrite production data merely to match code.
5. Hydrate project-level canonical runtime state first. A blank/new conversation overlay must not erase a meaningful project checkpoint.
6. Restore active parent objective and unresolved work if status is active/checkpointed/blocked.
7. Rebuild derived indexes from immutable raw sources when needed; do not synthesize missing raw evidence.
8. Run continuity, provenance, negative-unknown, correction, agency, sparse-cue and recovery tests.
9. Run exact-head build/integration checks.
10. Promote/deploy only after explicit authorization.

## Failure recovery rules
- missing source: record unavailable and continue with other evidence
- conflicting source: preserve both and downgrade certainty
- stale conversation state: fall back to meaningful project state
- blank conversation state: never erase project state
- interrupted objective: resume parent objective and unresolved work
- recoverable tool failure: alternate reversible route; do not hand workflow back
- malformed verifier output: incomplete, never completion
- hot local framing: cannot silently rewrite canonical longitudinal state
- uncertain provenance: "I don't know"

## Rollback boundary
No automated procedure in Foundation v1 may merge protected/main, deploy production, reset production database state, expose private corpus, or promote archaeology findings into canonical identity without the corresponding explicit authorization/review path.
