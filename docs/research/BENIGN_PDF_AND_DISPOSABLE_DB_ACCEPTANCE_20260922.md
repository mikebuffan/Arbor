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
