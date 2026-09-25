# Grove × ARK × Arbor Layer — bounded acceptance matrix

**Date:** 2026-09-22 PDT. **Owner:** cross-lane integration, test specification only.
**Source heads inspected:** Grove #156 `8999a570cf20b8496f984f62a298a58ef67d7217`, ARK/Layer #147 `ce70f72287e172e7650604e47872c6facdfd3107`.
**Proof stage:** source inspection and synthetic test inventory; no live owner sign-in, production API acceptance, full Layer/LM binding or Android acceptance.

## Existing synthetic tests, do not rewrite

- `apps/backend/lib/grove/__tests__/privateReadBroker.test.ts` already covers private realm config, JWT issuer/audience/expiry, missing bearer, Supabase Auth denial, cross-provider token rejection, missing owner invitation, revoked bridge, ungranted project, mismatched grant, Firefly project ownership, wrong API origin, status route no-store and sanitized error responses.
- `apps/backend/lib/grove/__tests__/privateHostIsolation.test.ts` already covers private host route isolation, original Firefly chat/heartbeat suppression, no permissive browser CORS preflight in Grove mode, and unchanged original Firefly mode.
- Grove #156 exact head passed [credential-free CI](https://github.com/mikebuffan/Arbor/actions/runs/35696240828). Tests are mock-backed and source-level. Do not claim live hosted auth behavior.

## Missing integration seam, not a defect in the existing narrow status route

The current `GET /api/grove/ark/status?projectId=<uuid>` validates **Grove** session/owner and a server-side explicit Grove→Firefly user/project grant, then reads Firefly ARK snapshot after owner assertion. It does not accept conversation/attachment/mode, build `ArkLayerReadContext`, call the private LM, or authorize execution. Keep status read-only. Add a **separate scoped host endpoint** in the Grove-owned source branch only after owner and API contract review.

For a future Layer/LM read endpoint: extract Grove JWT server-side; look up owner/mapping and exact Firefly project grant; derive mapped Firefly user ID server-side; validate conversation and selected attachment ownership in `readArkLayerContext`; bind mode and current conversation; issue per-request bounded signed context to the private LM behind a private host; return no model/project data when any guard fails. Never accept user-asserted mapped identity, client-authored LM signature or raw client-supplied trusted context. `liveExecutionVerified` remains false absent independently verified work receipt.

## Ready-to-run synthetic matrix (not all implemented)

| ID | Situation | Expected result | Evidence currently available | Responsible lane |
| --- | --- | --- | --- | --- |
| G01 | No bearer or malformed Grove JWT | 401 / no provider ARK read | Grove broker unit tests | Grove |
| G02 | Firefly/public/ARK Preview JWT used at Grove | 401 before grants | Grove broker unit tests (cross-provider representative) | Grove |
| G03 | Invited Grove user without owner grant or revoked owner | 403, no Firefly client creation | Missing invite unit test; *revoked owner* live+unit receipt still needed | Grove |
| G04 | Revoked mapping or ungranted project | 403/404, no Firefly data | Grove broker unit tests | Grove |
| G05 | Correctly granted project actually belongs to different Firefly user | Deny before ARK snapshot | Grove broker unit tests | Grove |
| G06 | Cross-origin or original chat/heartbeat/public home | 404 / no Firefly functionality | Broker/host isolation unit tests | Grove |
| G07 | No `OPENAI_API_KEY` on private status host | Backend builds; actual status does not require model credential | Grove #156 exact-head CI | Grove |
| A01 | Mapped Firefly user chooses P/C that belongs to B/Q | Deny before runtime/attachment content | #147 read-context scope tests; **Grove-host-to-Layer link unimplemented** | Grove + ARK/Layer |
| A02 | A/P/C → B/Q account/project switch during in-flight read | Shelves blank immediately; old response discarded | Source-level Grove UI tests need exact inventory + physical acceptance | Grove |
| A03 | Selected attachment does not belong to validated P/C | Deny, do not send attachment bytes or filename to LM | #147 scope checks; host transport unimplemented | ARK/Layer + LM |
| A04 | ARK or LM unavailable / expired token mid-turn | Explicit unavailable; never fake fallback, owner/task success or secret leak | Grove no-demo fallback synthetic test; E2E open | Grove + LM |
| A05 | Retry/duplicate message/request after timeout | No duplicate model/ARK action; truthful completed-turn receipt | Whole-system E2E open | ARK/Layer + LM |
| A06 | LM receives bounded host context | Only bound P/C state and corrections, `liveExecutionVerified:false` without separate worker proof | LM fake-model receiver handoff only; real v0.3 inference open | LM + ARK/Layer |
| P01 | Public app JWT/data reaches private Grove, or reverse | Reject; no shared user storage or private-context leak | Product-separation architecture, live two-account check open | Grove + Public App |

## Hosting/owner-only pass after Vercel accepts build

1. Verify deployed commit matches the reviewed Grove head and production hostname exactly. Production env keys stay hidden; no screenshots of credentials.
2. Without a token: status route with syntactically valid random project UUID returns 401; ordinary home, chat and heartbeat paths return 404.
3. Use invited owner session and provision one revocable grant only after real account/project IDs are independently validated.
4. Verify the owner receives only that project, and revocation blocks fresh reads; capture timestamped evidence without copying personal data into this repo.
5. Physical Samsung: sign-in/out, switch, house layout, window/Return to Now, Moss persistence, Text→Voice→Text, restart; do not mark accepted until observed.

**Stop conditions:** if unexpected endpoint responds successfully without its intended auth scope, stop; if provider credentials are exposed, revoke/rotate; if a requested test needs real owner IDs or billing/release authorization, ask Danelle at that exact step. No automatic production migration replay (second Grove DDL was applied via SQL Editor outside ledger).
