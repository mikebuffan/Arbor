# Arbor Permanence Verification

This branch exists only to force an exact-head CI pass over the current
durable-carrier work before any live migration, merge, or production change.

Verification target:
- structured unresolved work survives hydration
- parent objective persists across turns and threads
- stale/blank conversation state cannot erase project continuity
- long agency runs checkpoint instead of throwing away active work
- database migration for the parent-objective carrier parses cleanly
- existing backend, control-backend, Flutter, and investigation regressions stay green

A passing verification branch is evidence for the code state only. It does not
authorize a production deployment by itself.
