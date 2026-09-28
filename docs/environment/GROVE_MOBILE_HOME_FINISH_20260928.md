# The Grove — private mobile-home finish lane

**Date:** 2026-09-28  
**Base:** canonical private Grove source candidate PR #210 / `2b0013665172045cb9b8aeb38d61ab511a56d8aa`  
**Branch:** `finish/grove-mobile-home-20260928`  
**Scope:** finish the private mobile app using existing ARK, continuity, Grove, cognitive, and LM seams. Do not create another foundation.

## Already proven before this lane

- ARK continuity / queue milestone is working and stays a separate subsystem.
- Grove #210 is the canonical private source candidate and has exact-source five-job CI.
- Private Text already supports existing-conversation discovery, explicit new-thread creation, durable complete-turn transcript semantics, deterministic request-ID retry, and leave/reopen recovery in source tests.
- Grove backend pins the Grove auth project to `fqjqpuaoifgbweiguacf`, maps only an invited Grove owner to an explicitly bridged Firefly owner/project/conversation, and denies legacy Firefly/public/admin routes on the private host.
- The Grove Supabase project exists and is healthy. Live owner/bridge/project-grant rows are still zero. Transcript + claim proposals are not live.
- The manually applied owner→Firefly bridge/project-grant schema is now reconciled by live assertion-only migration `20260928231600_reconcile_grove_private_firefly_read_grants`. It did **not** replay DDL or seed identities; it verified forced RLS, client deny-all, service-role privileges, primary keys, and cascade FKs.
- Dedicated Vercel project identity is known from GitHub/Vercel receipts, but the current connected Vercel API cannot list its deployments (403). Do not create a duplicate project.

## Completed in this finish lane

- Phone config now pins the private APK to the **existing Grove Supabase realm**, not merely “anything that is not Firefly.”
- Real Grove release builds no longer use Android debug signing. A Grove release task fails closed unless all four private signing inputs are supplied.
- Real Grove release builds also require an owner-approved Android application ID; debug/test retains an isolated fallback ID only.
- Setup copy now treats the Grove as Arbor's house rather than labeling it the visitor's house.
- Added an explicit **Guest Room** to the house geography, inventory, accessible navigation, command palette, and tests without pretending the existing house painting already contains new artwork.
- Entering the Guest Room persists no note, task, presence, location, memory, or ARK claim.

## Remaining live gates — do not invent around these

1. **Vercel project access / branch promotion**
   - Existing project: `grove-private-api` / receipt project id `prj_nw2X0SyLn4e8CXWZ83MEs4jwn1JN`.
   - Current connector gets 403 for deployment listing, so no API-side project setting or promotion is claimed.
   - Use the existing project; never create a replacement because a connector cannot see it.
2. **Private account provisioning**
   - Grove Auth currently has no provisioned private owner in the release flow.
   - No source code should guess a user UUID or silently create an account.
3. **Owner bridge + project grant**
   - Live Grove owner/bridge/project-grant tables exist but currently have zero rows.
   - Provision only after the exact Grove user identity is known.
4. **Transcript / retry migrations**
   - `PROPOSED_grove_private_turns_20260923.sql` and
     `PROPOSED_grove_private_turn_claims_20260923.sql` remain unapplied.
   - Current proposal is privacy-conservative: no client DB access, server-only reads/fenced writes, and rows cascade on **grant deletion**.
   - A `revoked_at` timestamp immediately blocks new authorized use but does not by itself erase existing rows; permanent revocation should delete the grant row if deletion is the chosen retention policy.
5. **Independent model**
   - Signed private Grove → LM transport is source-tested.
   - Real private model host, TLS/key placement, shared replay protection, and real no-OpenAI inference still require live proof.
6. **Real Android release**
   - Choose final `GROVE_ANDROID_APPLICATION_ID`.
   - Create/provide the private release keystore outside Git/chat, then expose only the four expected build environment variables to the trusted build environment.
   - Build/install Grove flavor on the actual phone and prove sign-in → project → thread → send → close → reopen → same thread.
7. **Voice**
   - Finish after private Text is real and durable. Voice must reuse the same authenticated owner/project/conversation scope, not build a second continuity system.

## Default order from here

1. Keep this branch green.
2. Review/fix any source/CI failures without weakening private boundaries.
3. Reconcile Vercel access using the existing project and current source candidate.
4. Provision the invited Grove owner + bridge + project grant.
5. Apply approved Grove-only transcript/claim migrations.
6. Bring up the independent model host and prove one real private Text turn.
7. Build signed phone release; prove leave/reopen continuity.
8. Finish house polish/Guest Room visuals and then Voice.

**Stop rule:** source work continues autonomously when it is reversible and does not create accounts, spend money, expose secrets, apply live private-data retention, or promote production. Those live owner gates remain explicit.
