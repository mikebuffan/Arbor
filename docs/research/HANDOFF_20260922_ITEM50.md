# Research engine handoff — item 50

## Verified parent
- Parent: draft #157, `feat/ark-evidence-completion-verification-20260922`, head at branch creation `0b5f64a722cbf319ea8633a41cf76942481af06e`.
- Item 46 implementation verification: `db29abbadcba0ced2acfadabcc3a9d0a3db126c3`, Arbor Integration CI `35694800621` green.
- #123/#131/#134 and newer research lineage were rechecked before implementation. Grove/public app PRs remain separate.

## Item 50 implemented
`apps/backend/lib/research/leadDedupe.ts` adds a pure lead-dedupe contract. It merges only leads with the same caller-supplied explicit canonical key. It does not infer identity from names, URLs, text similarity or source count. Merge retains source refs, reasons, counterevidence refs, checkpoint refs and every merged lead ID. Duplicate lead IDs and empty identity/reference fields fail closed.

`leadDedupe.test.ts` adds five focused cases: provenance/counterevidence preservation, no fuzzy merge, repeated-ref collapse, duplicate audit-ID rejection, and empty-key/reference rejection.

## Verification state
CI pending. Do not mark item 50 verified until exact-head Actions complete successfully. This pure module does not prove durable persistence, source independence, worker integration or real investigation behavior.

## Next / blockers
Item 18 remains the next numbered gate and is BLOCKED pending an independently published benign PDF run in the verified disposable sandbox plus manual rendered-page/line-order/page-count/hash review. Items 40–45 require explicit disposable DB/cost approval. Live worker/scheduler/deploy and real Epstein/EFTA processing remain separately gated.

No merge/deploy, production DB, live worker, scheduler, paid API, external PDF, private/victim data or publication occurred.
