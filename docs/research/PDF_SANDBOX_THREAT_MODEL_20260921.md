# Untrusted public-PDF sandbox threat model

Status: design gate only. This document does **not** authorize deployment, network fetching, production processing, OCR, scheduler activation, or processing Epstein/EFTA material.

## Scope

The existing `localPdfParser.ts` is a local/CI parser proof using Poppler. Treat every externally obtained PDF as attacker-controlled bytes even when hosted by a government or other reputable publisher. A trustworthy URL is provenance, not a guarantee that the file is safe to parse.

## Assets to protect

- Firefly/Arbor credentials, tokens, environment variables and service-role secrets.
- Production databases, worker state, user/project data and conversation data.
- Host filesystem, source checkout, SSH/Git credentials and package-manager credentials.
- Evidence integrity: exact original bytes, SHA-256, source URI, physical page numbering and review state.
- Availability and cost ceilings.

## Threats

1. Parser memory-safety or logic vulnerabilities triggered by malformed PDF objects, fonts, images, streams or metadata.
2. Decompression bombs, pathological object graphs, giant page dimensions, huge text/image output, CPU loops and process storms.
3. Filesystem reads/writes or path traversal through parser behavior or helper tools.
4. Network callbacks/exfiltration from a compromised parser process.
5. Child-process escape or access to inherited credentials/environment.
6. Evidence substitution between capture, parse and persistence; renamed URLs or mutable upstream documents.
7. Misclassification of blank, image-only, encrypted, inaccessible or failed pages as evidence that a fact is absent.
8. Parser stderr/logging leaking document content or identifiers.
9. OCR hallucination or low-confidence text later being treated as source text.
10. Cross-job contamination from reused writable directories, caches or parser state.

## Required execution boundary before real third-party PDFs

A production-capable parser executor MUST run outside the application/Edge Function process in a disposable, non-privileged sandbox with:

- no production secrets and an explicit environment allowlist;
- no service-role/JWT/session cookies, Git credentials, SSH agent or cloud metadata credentials;
- network namespace with **no egress** during parsing;
- read-only root filesystem and no repository mount;
- a fresh per-job writable temp volume only, destroyed after the job;
- non-root UID/GID, no privilege escalation, no host PID/IPC namespace, no Docker socket;
- Linux capabilities dropped; seccomp/AppArmor (or equivalent) deny-by-default profile where available;
- hard CPU, wall-clock, memory, process/PID, file-size and temporary-disk quotas;
- pinned parser/runtime image by immutable digest, with Poppler version recorded in each extraction receipt;
- subprocess argument arrays only (no shell interpolation);
- bounded stdout/stderr and sanitized errors; document text never copied to operational logs;
- explicit maximum original-byte and physical-page budgets before parsing;
- kill-and-HOLD behavior on timeout, resource exhaustion, crash, malformed output or unsupported encryption;
- original bytes hashed **before** sandbox handoff and hash rechecked on the exact bytes received by the parser;
- output schema validation before evidence persistence.

The capture/fetch component, if later added, must be separate from the parser sandbox. It may fetch only an owner-authorized HTTPS source under bounded redirect/size/content rules, capture the final source URI and exact original bytes, then close network access before parser execution. The parser itself does not fetch URLs.

## Evidence rules

- Preserve the full original-file SHA-256 and physical PDF page number on every derived page record.
- Printed folios/source stamps are observations requiring visual verification; never infer them from filenames or URL paths.
- `text_layer` means only that Poppler returned bounded selectable text. It is not proof the extraction is visually faithful.
- `image_only`, encrypted, blank/unclassified, timeout and parser failure remain HOLD states and cannot support an absence claim.
- OCR, if later implemented, is a distinct processor with source-image reference, confidence and mandatory human verification.
- Exact-text offsets are offsets in the extracted string, not PDF byte offsets or image coordinates.

## Acceptance gates

Before wiring the parser to worker v5 or a scheduler:

1. Pin a reproducible sandbox image/runtime and record Poppler version/digest.
2. Run a benign independently published public PDF through the sandbox; manually compare rendered physical page images, extracted line order, page count and hash.
3. Exercise malformed/truncated PDFs, oversized page count, text-output bomb, timeout and encrypted-file cases; all must fail closed without host/network access.
4. Demonstrate no network egress and no credential/environment exposure from inside the parser job.
5. Demonstrate resource ceilings terminate abusive input and leave a failure receipt/HOLD rather than a partial verified record.
6. Re-run the existing synthetic PDF → page → quote → comparison tests inside the pinned runtime.
7. Separately complete disposable-DB authorization/concurrency tests before evidence writes are connected.
8. Review worker-v5 diff and rollback receipt before any live integration.

## Current gap

The current Node module already uses `execFile` without a shell, bounded input/page/text sizes, subprocess timeouts, mode-0600 temporary input and cleanup. Those are useful local controls but **not** a sufficient sandbox for attacker-controlled third-party PDFs. Until the boundary above is implemented and acceptance-tested, real public PDFs should remain a deliberate isolated acceptance exercise, not unattended worker input.
