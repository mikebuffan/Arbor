# Research operator dashboard contract — 2026-10-06

The existing synthetic Evidence Review Workbench already surfaces original source, OCR, identities, contradictions, release deltas, structured records, visual exhibits, privacy holds and disabled review actions. Do not rebuild it.

For million-page operation, add/read these metrics from durable stores when live integration is authorized:
- corpus snapshot/version;
- discovered / authorized / captured / parsed / indexed / reviewed / failed source/page counts;
- queue depth and backpressure state;
- canonical duplicate/source-family counts;
- independent-origin group count (explicitly "independence not truth");
- unresolved identity candidates;
- claim support/counterevidence/context counts;
- timeline contradictions;
- coverage blind spots;
- Pattern Hop run id, lease owner/expiry, checkpoint, STOP state;
- failed-lead reroute/branch ceilings;
- last verified ingestion/research checkpoint;
- replay recipe/hash and code/algorithm versions;
- privacy/publication HOLD status.

The UI must never render graph degree, source count, independence count, contradiction count or recurrence count as a guilt/conduct score.
