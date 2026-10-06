# Write-free historical archive preflight

The legacy import command initializes a database client and ensures a project before its dry-run branch. Some dry-run paths also write a checkpoint or invoke extraction. It therefore cannot establish a write-free source inventory.

This change adds an independent preflight command that reuses the existing conversation parser. It does not initialize database clients, invoke models, import archive rows, or write checkpoints. Whole-file JSON validation precedes counts. Invalid conversation IDs, active branches, parent links, cycles and conflicting source-message identities prevent a ready result. Empty export placeholders and exact duplicate identities are reported separately. Input order is deterministic.

Run from `apps/backend`:

```sh
node --import tsx scripts/import_chatgpt/preflight-cli.mts <export.json> [...]
```

Counts describe the existing parser's normalized active-branch messages. Structured parts can be serialized by that parser; the report counts messages containing them. Media bytes, alternative branches, and a full human-like reading of conversations remain outside this check. A ready result means structurally ready for further import review, not imported or behaviorally accepted.

Validation: 708 backend tests across 128 files passed; TypeScript and the production Webpack build passed. The actual two authorized source exports passed with no duplicate or conflicting identities. Private source contents and individual memory values are not included in this public source receipt.

Still open: bind the legacy import resume checkpoint to source hashes and owner/project, establish the explicit owner/project mapping, select reviewed eligible memories, and verify a bounded idempotent import plus recall before broad ingestion. Existing retrieval engines and legacy importer are preserved.
