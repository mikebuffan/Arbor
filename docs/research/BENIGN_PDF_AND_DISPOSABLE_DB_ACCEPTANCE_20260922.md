# Benign external PDF acceptance — first review, September 22/23 2026

Authorization: user approved a harmless independently published PDF and isolated no-cost synthetic DB tests. This receipt records only actions actually performed; it does not approve original Epstein source capture, release or production changes.

## Selected public benign source

- Publisher: US Internal Revenue Service; blank 2025 Form 1040, not a filled tax return.
- Exact source URL: https://www.irs.gov/pub/irs-prior/f1040--2025.pdf
- External PDF viewer returned content type application/pdf and **two physical pages**, page indexes 0 and 1. Both original-page renderings were visually inspected in the viewer.
- Physical page 1 displays 'Form 1040 U.S. Individual Income Tax Return 2025' and ends at line 11a. Physical page 2 displays 'Form 1040 (2025) Page 2', begins with 11b and includes line 38 and signature sections. This is a useful page-boundary and physical-versus-printed-page check.
- Blank public form only; no completed taxpayer return or private person data was supplied or processed.
- The PDF was NOT successfully downloaded as original bytes into the engineering runtime: the download utility failed and direct runtime network access returned a DNS resolution error. Consequently NO sha256, immutable original-byte archive, parser output or ARK-run page comparison is claimed.
- Status: PARTIAL original-page visual review only. Item 18 external PDF acceptance remains BLOCKED until an authorized runtime can fetch bytes, record redirect/final URL and sha256, execute sandboxed ARK parser/render and compare each physical page to the source viewer. Do not substitute synthetic sandbox CI for this external acceptance.

## Test acceptance to finish

1. Capture request time, requested and final URL, redirects, response headers, original byte length and SHA-256. Verify PDF magic bytes; reject HTML error/age redirects.
2. Preserve original bytes under immutable owner/project-scoped artifact reference; log renderer/container image digest and command limits; no arbitrary shell/network in parser.
3. Independently compare original physical pages 1 and 2 with sandbox renderings; record physical page, printed folio, OCR/text availability and boundary line 11a → 11b.
4. Confirm line 38 and signature area belong to page 2; confirm line 11a belongs to page 1; never silently shift page indexes.
5. Store signed/manual reviewer attestation separate from machine-generated extraction and keep sharing HOLD.

## Database approval and environment guard

- Supabase inventory showed Firefly (original), Firefly ARK Preview (existing), and The Grove (existing). A read-only query against ARK Preview returned PostgreSQL 17.6 and execution role postgres; no test DDL, RPC, data inserts or production schema changes were made.
- ARK Preview is an existing project, not automatically a disposable isolated database. DO NOT apply PROPOSED_arbor_research_sessions.sql to it without confirming it is dedicated to these destructive tests or obtaining a separate approved disposable database. Do not create a project or paid branch without cost disclosure/confirmation. A read-only postgres-role query does not test anon/authenticated/service_role permissions or race safety.
- Remaining: approved isolated database, synthetic auth/project fixtures, reviewed proposed SQL and privilege grants, concurrent clients, observed results and cleanup receipt. This approval is limited to no-cost isolated synthetic testing, not real files or live worker.

## CI external PDF first execution and correction (September 23 UTC)

- Run 35802926607 fetched the actual IRS PDF successfully: HTTP 200, application/pdf, 220237 original bytes, final URL https://www.irs.gov/pub/irs-prior/f1040--2025.pdf, SHA-256 `3d31c226df0d189ced80e039d01cf0f8820c1019681a0f0ca6264de277b7e982`, Poppler physical page count 2. This is independently published external original-byte evidence from GitHub Actions logs, not a locally archived artifact.
- The job then failed at its first `grep -Eq '11a'` against page-1 extracted text. It did NOT reach the isolated render step. This demonstrates a brittle text-label acceptance assertion, not an HTTP/DNS failure and not a proven PDF parser defect.
- Updated the CI job at `7ab89e7381e0d0ba42826e50fa4eb95d6b140aec` to verify both extracted text files are nonempty and distinct, report their hashes, and explicitly leave original-page line-boundary manual review HOLD. The CI job still fetches original bytes, records hash, verifies PDF header/size/page count and attempts isolated page-1 render. New run 35803348627 pending when this note was written; check actual results before marking PASS.
- No external PDF original-byte artifact was uploaded to GitHub or the user library; original hash is the GitHub Actions runner log's observed digest. Original-page manual comparison remains separate.
