# The Grove — current engineering resume (September 22, 2026)

This is a **Grove-only** recovery note after a ChatGPT conversation reached its limit. It reconciles Grove's own **stacked GitHub source**, not claims of interference with another active chat. This documentation-only branch starts at exact Grove #179 head `38b9fd401e367df8c7cef240f4e07bf264e04d1a`. Preserve each PR's existing reviewer and release boundaries.

## Current Grove source and receipts

- Grove stack: private deployment-only #156 → truthful window/Talk #161 → authorized project discovery #165 → signed but **unwired** LM transport #166 → truthful Projects #167 → invited house without ARK grant #174 → current conversation-ownership seam **#179**.
- Current Grove #179 adds `authorizePrivateGroveConversation`: verified Grove token, active owner invitation, revocable Grove→Firefly identity mapping, active project grant, Firefly project ownership **and** conversation ownership before future Layer/LM calls. GitHub Actions **35800510842** reports six pinned jobs passed at `38b9fd401e367df8c7cef240f4e07bf264e04d1a`. Tests are synthetic; no user-facing private chat endpoint exists.
- ARK/Layer **#160** on a *separate draft branch*, head `fc58351e9ae8416c3d28d3c398d4126387310bf0`, adds selected-file/current-conversation matching. Actions **35762754152** passed. Do **not** assume this security correction is already on Grove #179 or blindly merge unrelated owner branches.
- #166 has `apps/backend/lib/grove/privateLmHostTransport.ts` for a signed server-only call to independent Arbor LM v0.3.5. It is deliberately unused. The actual private receiver, anti-replay across instances, rates, privacy approval and genuine model inference are not acceptance-tested as a live Grove stack.
- Grove's private backend middleware currently permits only GET `/api/grove/ark/status` and GET `/api/grove/ark/projects`; private Talk honestly displays “Private conversation isn’t connected yet.” Do **not** silently repoint to Firefly/public chat.
- Separate Grove Supabase project and manual private owner-access/bridge DDL were previously reported provisioned; three access/bridge/grant tables were empty in the latest Grove receipt. Recheck actual owner/grant/migration state before changing anything; never replay manual DDL blindly.

## Connected Vercel check (September 22 PDT)

Connected account/team “Mike's projects” lists just **firefly** (project `prj_JArYlugmdFovY10CxZ0LEJmcrsKC`). No separate private Grove API project appeared in this team's listing at this check. This cannot exclude projects under another account. Do **not** deploy Grove into Firefly. #156 private deployment branch `deploy/grove-private-api-20260921` at `8999a570cf20b8496f984f62a298a58ef67d7217` passed backend build CI without an OpenAI key, but this is **not** a running private Grove host; it must retain no Firefly heartbeat cron. Do not purchase/upgrade hosting or put service keys in Flutter, public git or chat.

## Verified room source, without pretend-completion

- `grove_house_room.dart`: approved nighttime art, clickable room doors, clock, sun-phase labels and sundial preview. Matching **daytime painting is still missing**; the actual house image stays nighttime.
- `grove_world_panel.dart`: saved device-local Moss/rest state and interaction history are real UI code; Moss in the room artwork **does not move visually** with the stored state.
- `annabelle_kitchen_view.dart`: separate room and shared clock, **visit-only** scratchpad/copy; no manuscript persistence or model-side writing-mode switch.
- Observatory is not a proven complete interactive room; physical Android owner sign-in and Text→Voice→Text are not verified.

## Post-recovery Grove work (isolated draft stack)

- **#184**, branch `feat/grove-moss-visual-state-20260922`, exact initial test-source head `7051e604bba87e0726a9aa392dd88a4129bbce7f`: The house displays an explicitly **device-local** sofa/rug and resting/awake Moss marker without changing the approved painting. Tapping the Moss door opens the existing real saved-state controls. Failed reads/writes no longer leave the scene chip showing a possibly stale state. New Flutter widget tests were committed; no physical device or final visual acceptance yet.
- **#185**, branch `feat/grove-observatory-room-20260922`, head `ce4db85be3be25cdfef7645c01981a3de01276e1`: navigable Observatory view from the staircase/rail/command palette, with illustrative sky card driven by the shared House Clock, existing approximate moon/solar model and reversible Living Window sundial. **This is not** the final illustrated Observatory walkway and does not execute research. New Flutter widget tests committed.
- **#186** is a temporary **CI-ONLY, DO NOT MERGE** draft from #185 to the existing Grove verification target. GitHub Actions run **35803031084** was in progress on initial observation; check final jobs and exact source before marking verified. The early observed control-backend tests/build passed; Flutter analyzer/tests/APK and backend build were still in flight. #186 must not be used as a canonical implementation PR.
- No Grove/private API deployment, owner account grants, real standalone LM inference, or production changes were made by these UI drafts. The earlier static-night-window and private Text/Voice limitations remain.

## Live read-only security receipt (September 22 PDT / September 23 UTC)

The connected Supabase project **The Grove** remained `ACTIVE_HEALTHY`. The dedicated source-verification queries in `supabase/grove/verification/` were executed against that project, **read-only**: the owner gate and both bridge tables each returned `expected_access_contract = true`, with forced RLS, no anon access, no authenticated writes and no client SELECT on the two admin-only bridge tables. The separate migration-ledger audit returned only `20260922035539_grove_private_owner_access`; `20260922042500_grove_private_firefly_read_grants` is still manually applied but **unrecorded**. All three tables still showed zero rows. These receipts neither provision an owner nor authorize automated schema mutations. Preserve the admin-only/no-policy model for the two bridge tables.

## Grove-only finish line, dependency order

1. Review #179 plus #160 exact source and tests. Design the smallest reviewed composition path; keep parent PRs draft and preserve owner boundaries.
2. Add owner-verified **private Text** endpoint in a new isolated Grove-only draft *only when* it can bind the exact current conversation and selected file to the verified grant and ARK/Layer scope. Server derives identity; request JSON is never authority. Keep feature disabled until host/privacy/retention approved.
3. Add negative tests: wrong issuer/host, revoked invite/bridge/grant, foreign project/conversation/file, missing or stale scoped state, malformed/overlong history, unavailable receiver and fabricated execution receipts. Inspect actual CI against exact head, not just test intentions.
4. Obtain separate protected Vercel Grove API project/branch/root only with owner approval and acceptable billing. Configure secrets in its protected environment, no old Firefly routes/cron, verify denial paths before owner invitation.
5. Confirm owner identity and grants against live provider and migrate ledger reconciliation; confirm test data isolation, retention and deletion before persisting private messages.
6. Independently host and verify private Arbor LM; after live text acceptance, implement/review private Voice without sharing Firefly/public credentials.
7. Finish visual day/night artwork only from approved assets; bind Moss visual state to persisted world state; make Kitchen save/mode boundary and Observatory real; run physical Android installation, relaunch and owner acceptance tests.

**Operational rule:** Source, CI, deployed host, real authorized login and actual model response are *different proof levels*. A draft checkbox or a pretty room never counts as a running service, ongoing worker or accepted release.
