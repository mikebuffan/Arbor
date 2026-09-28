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

## ARK-FIRST prerequisite (September 23)

The existing ARK runtime is real **source** (`lib/ark/runner.ts`, `supabaseStore.ts`, `defaultWorker.ts`). ARK Preview already has claim/checkpoint/complete/fail/heartbeat RPCs, but its observed synthetic `canary.read` task is QUEUED with zero attempts; this is not a background worker receipt. `defaultWorker.ts` currently registers only `arbor.agency-tool`. There is NO production `research.session.tick` registration or research-session schema applied to ARK Preview.

Research added `registerArkResearchSessionExecutor.ts`, deliberately **not registered** in defaultWorker: a one-unit adapter from ARK's existing `ArkExecutorRegistry` to the existing DB-scoped `runTrustedArkResearchTick`. It requires a trusted server resolver with exact owner/project/objective/session, approved source access and authorization version, plus the existing research store/executor. Successful research settlement produces only an ARK checkpoint with evidence **references**, not a completed verified finding. Wrong scope, missing/stopped session and false authority fail or block. Tests are source-only until exact-head CI is observed.

**Shortest deployment-order acceptance (no new queue):**
1. Prove the existing ARK Preview canary claim→executor→durable checkpoint/finish in its correct project with an explicitly reviewed read-only canary registration and live worker invocation, including task attempt_count/lease/stop checks. Do not connect Grove or text LM as execution authority.
2. Approve a dedicated research project/database policy and proposed research RPC migration, source/privacy policy, and real owner/project grants; do not silently use the smoke-test project or Firefly.
3. Inject a real server-side resolver and reviewed PDF batch executor into the research adapter, then explicitly register `research.session.tick` on the existing ARK worker behind a default-OFF research flag. No arbitrary task payload may approve sources or become a path/URL fetch.
4. Run one synthetic end-to-end ARK claim→bounded PDF parse→durable original-byte/page evidence→research settlement→ARK checkpoint, STOP/restart/revocation; then owner-authorized 1–3 original public DOJ files.
5. After factual/provenance/privacy acceptance, enable bounded recurring runner invocations with cost/runtime limits, liveness telemetry and stop/rollback. A queued task or a ChatGPT reply is never a worker heartbeat.

This document and draft do not install a scheduler, deploy ARK, apply SQL, authorize external file ingestion or activate model inference. The independent LM, Grove Voice and public app are NOT prerequisites for the first research batch.
