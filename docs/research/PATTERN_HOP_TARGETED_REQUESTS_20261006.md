# Exact document-hop requests and safe replay

Supersedes the request-deduplication and mixed-queue limitations in the preceding
document host receipt. Tick requests now require `unitId` alongside project and
session UUIDs. This is the identity of existing authorized work, not permission
to create a session, enqueue work or select another owner.

The document store uses only the new proposed `arbor_claim_document_hop_unit`
RPC. It pins the owner/project/session/unit and the literal document-search kind
inside the claim transaction. It retains existing session locks, time/cost/unit
limits, authorization, cancellation, lease expiry and attempt limits. Returned
claim identity/kind is checked again before executing document search.

Repeated requests for a completed unit return `replayed` with the same bounded
document result. Only completed receipts with the expected completion scope are
accepted for replay. A simultaneous request cannot claim the active lease;
an interrupted attempt may reclaim the SAME unit after lease expiry. It cannot
advance to another queued unit. Existing settlement fences old leases and
deduplicates receipts. Read/claim failures propagate; there is no fallback to the
generic claim RPC or to personal-memory search.

The new claim also checks the scoped DB integration gate transactionally and
locks its eligible row for the claim. Current v6 CHECK constraints still forbid
opening execution. Neither the host flag nor the proposed claim function changes
those constraints. A later gate revocation does not by itself abort a unit already
claimed: use durable session STOP, whose existing settlement check prevents a
later result commit. No live database, gate, cron or deployment was modified.

Validation: 233 offline research tests and backend TypeScript passed. Tests cover
completed-request replay through a fresh invocation, exact target RPC binding,
wrong returned claim identity/kind rejection and required host unit identity.
The disposable PGlite SQL test additionally proves the closed gate, older unrelated
work untouched in a mixed queue, scope rejection, repeated target claims,
database close/reopen and receipt readback, expired lease reclaim of the same
unit, old-token settlement rejection, STOP fencing and authenticated-role denial.
The open-gate test state is explicitly hypothetical and exists only in disposable
PostgreSQL; no delivered migration opens it. These are source/local SQL checks,
not live network concurrency or deployed acceptance proof.

Proposal: `docs/research/sql/PROPOSED_document_hop_targeted_claim_20261006.sql`.
Apply only after reviewed research session and v6 integration schemas in a
reviewed environment. Before deployment, install the targeted claim function;
without it a tick fails safely rather than falling back to generic work selection.
