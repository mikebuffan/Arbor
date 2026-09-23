# First PDF batch pilot — source draft, no live ingestion

This child of research #207 is a narrow connection of the EXISTING `localPdfParser` and original-byte page-provenance contract to protected, restartable local file staging. It does not add a second evidence engine.

## Intended operator flow (reviewed pinned isolated parser required for nonfixtures)

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

From repository root, after separately building and inspecting the existing pinned non-root Poppler image and setting `PDF_SANDBOX_IMAGE_REF` to its local sha256 image ID:

```bash
pnpm --filter firefly-backend exec tsx scripts/research/offline-pdf-batch-pilot.ts /private/pilot-list.json /private/pilot-output
```

The command stages local original bytes under `originals/<sha256>.pdf` and review-only text/page inventories under `records/<source-key>.json`. Same bytes+document/source URI replay without overwrite; tampering is HOLD. Output counters do not print extracted text, paths or source URLs. Operator-supplied URL is **NOT independently verified**, and local protection is **NOT the production immutable evidence store**.

**Security boundary:** this branch now invokes the existing `localPdfParser` through `isolatedPdfParser`, using the pinned image ID, non-root, no-egress, read-only, capability-free Docker invocation per Poppler call. The CLI fails closed without `PDF_SANDBOX_IMAGE_REF`; actual isolated parser execution still needs exact-head CI and operator review. A test-only direct host Poppler mode exists only in unit tests with harmless fixture/blank-IRS URLs. Do not use unreviewed real DOJ/EFTA documents until sandbox acceptance and source/privacy authorization. This utility does not fetch HTTPS, write research session DB/ARK receipts, authorize identity/privacy review, run a scheduler, enable the old investigation worker, or publish findings. No real Epstein file was processed by adding this source.
