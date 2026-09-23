# First PDF batch pilot — source draft, no live ingestion

This child of research #207 is a narrow connection of the EXISTING `localPdfParser` and original-byte page-provenance contract to protected, restartable local file staging. It does not add a second evidence engine.

## Intended operator flow (BENIGN FIXTURES ONLY until a full reviewed parser sandbox exists)

Make a **private local** JSON file of 1–25 entries:

```json
[
  {
    "localPath": "/private/benign-form.pdf",
    "sourceUri": "https://www.irs.gov/pub/irs-prior/f1040--2025.pdf",
    "documentId": "BENIGN-1040-2025"
  }
]
```

From repository root with existing dependencies and Poppler available:

```bash
pnpm --filter firefly-backend exec tsx scripts/research/offline-pdf-batch-pilot.ts /private/pilot-list.json /private/pilot-output
```

The command stages local original bytes under `originals/<sha256>.pdf` and review-only text/page inventories under `records/<source-key>.json`. Same bytes+document/source URI replay without overwrite; tampering is HOLD. Output counters do not print extracted text, paths or source URLs. Operator-supplied URL is **NOT independently verified**, and local protection is **NOT the production immutable evidence store**.

**STOP:** do not submit DOJ/EFTA or any untrusted third-party PDF to this local host Poppler path. The pre-existing `localPdfParser` is NOT itself a sandbox. First connect it to a pinned, non-root, no-network, bounded parser container and verify input/output isolation. This utility does not fetch HTTPS, write research session DB/ARK receipts, authorize identity/privacy review, run a scheduler, enable the old investigation worker, or publish findings. No real Epstein file was processed by adding this source.
