# Live correction concurrency and restart acceptance — 2026-10-06

Preparation only; no hosted write is authorized by this document.

## Cases
1. Two corrections target the same injected canonical fact nearly concurrently. Exactly one compare-and-swap wins; loser reloads authoritative state and must not restore the old value.
2. Correction commits, then response persistence fails. Restart must retrieve the corrected durable value without requiring the recent-window transcript.
3. Response persists, correction write fails. The turn must not claim correction success; retry must remain bounded/idempotent.
4. Corrected canonical row exists while a stale alias remains. Retry converges alias to superseded without incrementing the canonical correction twice.
5. A stale conversation attempts the older value after a newer explicit correction. Newer correction remains authoritative.
6. Locked canonical fact receives an explicit correction. Existing lock/correction policy must be honored; no duplicate alias becomes active.
7. Foreign user/project candidate is present. It is never corrected/superseded.
8. Restart/new conversation: prompt construction receives the durable corrected value and excludes the superseded alias as current authority.

## Evidence required
- owner/project ids;
- canonical memory id/key;
- pre/post correction_count/status/value;
- compare-and-swap conflict receipt where exercised;
- superseded alias ids;
- restart retrieval receipt independent of recent transcript;
- generated response acceptance showing current correction used;
- no foreign-scope mutation.

Source simulation is not LIVE_PROVEN. Hosted concurrency/restart must be executed against the reviewed preview schema before promotion.
