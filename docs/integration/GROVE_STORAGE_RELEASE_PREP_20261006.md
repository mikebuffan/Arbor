# Grove storage release preparation — 2026-10-06

Historical #257 receipt. The reconciled candidate and current provider-limit guards
are documented in `GROVE_ORDERED_RELEASE_REVIEW_20261006.md`.

The combined connection draft omitted Grove's existing storage proposals and
disposable acceptance fixture. This child restores them unchanged from
`f324fbf7f1e61843dac5d74ade7d29d3e880441a`, on top of receiver-aligned head
`eb297312d92c4d4f1532bf604275dfce65c90c52`. These are proposals, not permission
to apply migrations or activate a deployment.

## Restored source

- The two original Grove owner/bridge/project-grant migrations under
  `supabase/grove/migrations/`.
- The two private transcript and fenced turn-claim proposals under
  `docs/migrations/PROPOSED_grove_private_*_20260923.sql`.
- The exact disposable fixture under `ops/grove/disposable-db/`.

The old standalone release-check scripts were not carried into this combined
repository: they assume a different repository layout and require removal of
the original app's cron configuration. Original cron configuration is preserved.
All three Vercel configurations skip this preparation branch; the dedicated
Grove configuration still has no crons.

## Verification and limits

The restored SQL and both acceptance blocks pass on an in-memory PostgreSQL
18.3 engine (PGlite 0.5.8), with only psql `\\ir` directives expanded and
`\\set ON_ERROR_STOP on` omitted. The separate draft-only workflow runs the
original psql fixture on an isolated PostgreSQL 17.6 container. It uses synthetic
identities, no host ports, no container network and no hosted database credentials.
Metadata deny rules run before checkout and container bootstrap.

The fixture checks RLS and role privileges, cross-owner foreign keys, reply
validation, canonical completed replies, lease expiry and stale completion,
request-content conflicts, and permission revocation. Its lease cases execute
sequentially; neither real concurrent load nor distributed exactly-once model
inference is established. Receiver replay/locking remains process-local.

Android signing files are already ignored by `apps/frontend/android/.gitignore`.
No keystore, signing credentials, receiver source, adapter or model weights are
included. Backend/Android source verification is inherited from the parent
drafts; this child changes no application code or dependency manifests.

## Read-only live findings

At the 2026-10-06 inspection, The Grove database had three owner/bridge/grant
tables with RLS enabled, zero auth users, zero active owner invitations, zero
active bridges and zero active project grants. Transcript and turn-claim tables
and functions were absent. No live rows or schema were changed.

The dedicated private Vercel project exists, but the recent inspected attempts
were canceled or failed. Build-log retrieval returned 404, so the build failure's
root cause is not established. Receiver credentials and model configuration
were not read or confirmed. A working production connection is not claimed.

## Remaining release gates

1. Establish the intended Grove owner account and independently verify its
   Firefly owner/project mapping before any owner invitation, bridge or grant.
2. Review and separately authorize the Grove-only storage proposals. Never
   apply the synthetic fixture or Grove schema to Firefly or ARK Preview.
3. Configure and separately authorize the private host/receiver/model release;
   verify its environment without publishing secrets and complete a controlled
   authenticated round trip after authorization.
4. Produce the owner-approved package ID and signed Android artifact, then
   verify installation and a scoped turn on the actual phone.

This preparation does not deploy, merge, apply live SQL, invite an owner,
grant access, execute paid inference or activate a model.
