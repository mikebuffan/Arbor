# Combined Pattern Hop source candidate

Combines the tested historical-memory/queue/run-control candidate from PR #240
with the existing isolated research stack through targeted requests in PR #245.
The historical branch had no tracked `lib/research` or `docs/research` directory.
These existing engines are added intact, with their document host route, offline
test setup, test-discovery configuration and disposable SQL script. No package,
lockfile, Grove, LM, chat, personal-memory engine or existing learning code was
replaced by the research stack. This is selective source composition, not a merge
of the two entire historical branches or an implementation of a second engine.

Source anchors:
- Historical/controls remote: `7f4d5d5b8b3450ea5392a107217f2638b1533fe7`.
- Research/targeted requests remote: `157c02d15d415dc1b438a69843ca7aeee195625a`.
- Combined source uses the identical research and documentation subtree objects.

## Verification

381 selected offline tests passed, with external fetch forbidden, covering research,
Pattern Hop/retrieval rerouting, MCP hop/STOP, learning and cognitive bridge.
The first invocation could not initialize two provider clients without a key;
rerunning with a placeholder key passed, with no external calls allowed.
Backend TypeScript and whitespace checks passed. This is not full-backend or
real-provider validation.

Both disposable PostgreSQL rehearsals passed on this combined checkout:
- Historical controls: exclusive claim, scope denial, atomic rollback, provenance,
  dedupe, stale-token fencing, terminal STOP and role denial.
- Documents: closed integration gate, exact-kind/unit claim, mixed-queue isolation,
  replay/deduped settlement, database close/reopen, expiry/reclaim of same unit,
  stale settlement rejection, STOP and role denial.

No live schema, grants, schedules or execution flags were changed. Proposed SQL
stays under documentation and is not an automatically applied migration. Current
research v6/v7 constraints deliberately keep execution and scheduling off.

## Deployment observation

Read-only Vercel inspection found the stable sandbox READY at
`fea53e279c66ea61e80de9891b3e20db97048829`. A separate latest preview deployment
`dpl_EEvFiA2RPdcpcZpMcXhnijgg3RGh` failed at intermediate commit
`446404000792487d928c6e47bb7ba4c4ba34dc03`: `arborTools.ts` referenced `handoff`
before the matching runner return type was published. The complete combined
candidate passes TypeScript. Publish the whole tree as one commit to avoid
deployment builds of partial file-by-file updates. A successful future preview
build is separate from live engine/task acceptance.

## Immediate activation order

1. Review this combined candidate and its inherited historical integration spine.
2. Verify an isolated preview build at the exact published commit.
3. Review/install required historical controls and research proposals in sandbox;
   preserve owner RLS, transactional lease fences and separate activation gates.
4. Resolve the reviewed execution-gate migration; the current CHECK stays closed.
5. Verify exact installed client/project grants and worker/task discovery.
6. Run one authorized bounded task, read its results, interrupt/resume, repeat the
   same unit, test another owner/project denial and STOP after claim.
7. Only then connect repeated sessions/scheduling and prove heartbeat/limits.

Live corpus availability, original-page review, source independence, identity
decisions, observed consequences and reviewed learning remain unverified here.
Cross-thread/Grove/LM integration remains coordinated with its own workstream.

## Follow-through receipt

- Source preview candidate: `6b658a53460b5db00b06c524fc62e7bd5717b119`, PR #247.
- Local optimized Next.js app build passed, including TypeScript, page-data
  collection, static generation and registration of `/api/research/document-hops`.
  Used CI placeholder credentials and system TLS certificates; no live credentials
  or authenticated source data were used. This is not a Vercel build receipt.
- Started the built app locally and issued real HTTP GET, POST tick and POST STOP
  requests without authentication. All returned 401 `auth_required` with
  `Cache-Control: no-store`. No source search or privileged DB access occurred.
  Stopped the local verification server afterward.
- The attempted isolated Vercel preview failed before building: HTTP 402,
  `api-deployments-free-per-day`, 100 daily deployments used, zero remaining.
  Reported reset: October 6, 2026 at 7:56:01 PM America/Los_Angeles
  (`1791341761242` milliseconds). No preview URL or READY receipt was created.
  No automatic retry, account upgrade, stable alias change or migration followed.
- Atomic publication succeeded and fetched remote tree matched the tested local
  tree. A documentation-only follow-through commit does not alter runtime code.

The existing 44-item list is reconciled in
`PATTERN_HOP_44_ITEM_PROGRESS_20261006.md`. Finish source composition does not
mean every listed engine has a live trusted caller or verified useful behavior.
