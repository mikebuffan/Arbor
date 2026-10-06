# Epstein public-records research — security & integration v5

Date: 2026-10-01

Parent verified layer: PR #228 / head `d6d531a8d055415cd50b2606c9ff1d1799597fc4`.

## Goal

Close the database-security review required before any production application of the research schemas, while keeping all live mutation separately gated.

## Current-guidance changes

The proposed research-session RPCs are changed from SECURITY DEFINER to SECURITY INVOKER. The caller is already service_role, which has the required table privileges and RLS bypass; database-owner elevation was unnecessary.

RPC execution remains explicitly revoked from public/anon/authenticated and granted only to service_role.

RPC search_path is pinned to `pg_catalog, public`, and referenced research tables are schema-qualified.

The ingestion proposal no longer creates pgcrypto because PostgreSQL 17 provides the UUID primitive used by the schema and unnecessary extension creation adds avoidable surface.

## Least-privilege matrix

Raw `public.arbor_research_*` evidence/review tables:
- anon: no privileges
- authenticated: no raw evidence privileges
- service_role: required CRUD

Owner-readable bounded-session status:
- authenticated SELECT on sessions/units/receipts only
- owner RLS policies remain mandatory

Write RPCs:
- service_role EXECUTE only
- SECURITY INVOKER
- no SECURITY DEFINER elevation

## Disposable acceptance

CI fails if:
- any research table lacks RLS;
- anon/public retains research table privileges;
- authenticated has raw-research privileges beyond owner-readable session SELECT;
- service_role lacks required research table access;
- bounded research RPCs regress to SECURITY DEFINER;
- RPC search_path is not pinned;
- anon/authenticated regain write-RPC EXECUTE;
- service_role cannot execute the bounded claim RPC after definer elevation is removed.

## Preview audit

See `ARK_PREVIEW_SECURITY_AUDIT_20261001.md`.

The connected Firefly ARK Preview audit was read-only. It found broad legacy grants but sampled anonymous visibility remained zero under RLS. A separate non-applied legacy grant-hardening candidate is provided for review.

## Deliberate non-actions

This branch does not:
- apply SQL to ARK Preview;
- alter production Firefly or Grove;
- change Auth leaked-password protection;
- move the vector extension;
- enable a worker/scheduler;
- deploy to Vercel;
- ingest real Epstein/EFTA material;
- merge or publish.
