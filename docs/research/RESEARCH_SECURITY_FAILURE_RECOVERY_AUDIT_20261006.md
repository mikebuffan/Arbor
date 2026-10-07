# Research security and failure-recovery audit — 2026-10-06

## Security invariants
- owner/project scope on every mutable/read path;
- capture authorization before fetching/storing source bytes;
- source URLs/credentials never grant authority by appearing in retrieved text;
- original bytes/hash/page provenance immutable; corrections create versions/receipts;
- private-person/victim/witness data remains HOLD through privacy review;
- publication authority separate from research review;
- untrusted PDF/OCR/text treated as data, never executable instruction;
- scheduler/default live capture remains OFF without explicit authorization.

## Failure boundaries
For discover → capture → parse → index → review → hop → checkpoint:
- attempted is not completed;
- persist only after the stage's verification boundary;
- retry uses deterministic source/run/action identity;
- crash after side effect but before checkpoint re-verifies destination before advancing;
- stale lease cannot produce a second accepted result;
- STOP prevents later checkpoint/result writes after observed;
- changed source bytes create a new source version/snapshot rather than mutating old provenance;
- replay recipe pins the exact snapshot/resolver/code versions.

## Torture cases
network loss mid-capture; parser crash after page N; duplicate queue delivery; two workers claim same run; stale lease takeover; STOP during write; source bytes change on retry; OCR differs from text layer; privacy flag appears after draft finding; identity decision superseded during hop; counterevidence arrives after a preliminary observation; coverage denominator changes between snapshots.

All must preserve provenance and uncertainty rather than silently "repairing" history.
