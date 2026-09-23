# The Grove — private Android release-candidate handoff
**Date:** 2026-09-21. **Scope:** The Grove private Flutter app only. Draft code, not production approval or device acceptance.

## Canon and separation
- Approved source: `THE_GROVE_MASTER_BUILD_SHEET.md`, nighttime cropped reference SHA-256 `9b93b9a75106477efcca40ef178416263353bd4fcadde73be6e299d739728333` (709×409). The committed `apps/frontend/assets/grove_reference.webp` is a compressed presentation asset. Keep staircase left, Moss on couch, glowing blue Arbor near rug, central starry purple-blue mountain/lake window, and desk right. Do **not** substitute other larger Grove renderings or an unapproved daytime room.
- Standalone `grove` Android flavor `com.example.arbor.grove` opens the Grove Home; the existing `arbor` flavor `com.example.arbor` opens Talk. Do not fold Grove into public Arbor App PR #140 or the existing diary design.
- Reuse `apps/frontend` Flutter, existing Firefly API and ARK read-only adapters. No second backend, production/schema/auth/worker/scheduler/secret write, or research-engine duplication.

## Actual isolated branch lineage / ownership
`#122` original Grove house → `#129` integrated sundial/#126 + Moss/#128 + attention/#124 → `#130` inventory → `#132` scoped saved-memory shelf → `#133` scoped chat-attachment metadata shelf → `#137` synchronous shelf invalidation → `#138` selected-project saved ARK handoff (selectively imports source from #125 exactly once) → `#145` portrait-width fix → `#148` runtime-scope fix (THIS BRANCH).

The research chain (#123/#131/#134/#135/#136 and successors) and public app #140 are independent. Do **not** independently merge superseded source PRs #124/#126/#128/#125 or merge stacked PRs into main out of order. No merge/deploy/signing has been performed here.

## Implemented code and honest boundaries
| Area | Draft implementation | What is *not* proven |
| --- | --- | --- |
| Android entrypoint | Distinct app label, tree launcher, install ID/flavor, original Talk flavor preserved | Actual simultaneous install, permission prompts, release signing |
| Home and navigation | Night scene asset, normalized labeled hotspots and fallback buttons to Talk, Desk/Projects, Shelves, Window, Kitchen, Stair navigator, Moss | On-device visual approval; large-print and landscape checks; full-res approved exact art |
| Living Window | Shared device-local House Clock, manual approximate cities or clearly artistic no-location mode, estimated sunrise/sunset and moon altitude/phase; 15-second foreground time refresh and app-resume refresh | Validated actual observed astronomical geometry over all seasons/latitudes and long-background Android resume; room daylight remains tinted preview |
| Sundial | Separate shared `GroveWindowTimeSelection` with day/time controls and Return to Now; does not set device clock or ARK timestamps | Physical DST/timezone/accessibility scenarios |
| Moss | Versioned, bounded local visitor events + device-local sofa/rug/rest state, explicit-reset behavior; controls in world panel | Physical kill/relaunch and matching painted figure to stored state |
| Desk | Existing Projects, Objective, work queue and read-only ARK snapshot + manually loaded persisted handoff | Live production handoff route and authenticated device/project acceptance; stored “running” is NOT a worker heartbeat |
| Shelves | Scoped read-only Firefly memory and chat-attachment metadata; clear on auth/session context change | Complete source-file browsing, original PDF retrieval, provenance bridge to research engine; memory is a stored claim not document evidence |
| Talk / Kitchen | Existing Arbor text/voice shell reached via room; Kitchen is a scratchpad/room preview | Actual Grove Arbor LM inference, Annabelle backend session routing or manuscript autosave, Text→Voice→Text physical continuity |
| Room inventory | Stable scenery IDs and scoped source-entry contract | Persistent world inventory and user/navigation action logging throughout every room |
| Offline/failure | No-location artistic fallback; ARK unavailable/demo labels; corruption/future schema local-state lock; shelf and handoff unavailable states | Complete airplane-mode/reconnect physical acceptance; no claim live ARK works offline |

## Fix #145 — Android portrait cards
Added `grove_responsive_wrap.dart`, replacing fixed 340–560px panel widths with min(availableWidth, preferredWidth) on Objective, Home status, Memory screens while keeping desktop layout. `grove_responsive_wrap_test.dart` exercises a 320px viewport, 1200px desktop and Objective inspector on a 320px viewport. No artwork replacement or session rewrite.

## Fix #148 — runtime status project-scope invalidation
`environment_runtime_host.dart` now clears previous ARK status synchronously on ArborSession context and Supabase auth events, rejects late subscription callbacks by generation, clears on adapter change, and rechecks user/project/conversation after network I/O. Complements #137's existing shelf invalidation; still does not mutate ARK. `grove_runtime_scope_test.dart` covers switching projects, stale previous adapter data and fresh replacement status.

## Verified GitHub CI receipts
- Base #138 combined code run `35662005850` passed at `62bf31a216f1ea8b457790df9c1d8eaf8745a4bb`; actual #138 head `8eff7230cb3fbc769c9e7c04af19ecfaa09428c0` differs only in documented post-CI workflow/checklist changes.
- Portrait branch #145 **all three jobs passed** (backend test/build, control backend test/build, Flutter analyze/unit/widget tests and *both* Android debug APK builds/uploads), run [`35673920381`](https://github.com/mikebuffan/Arbor/actions/runs/35673920381) at code SHA `13d4dd2b25b319defb66f0886c26b5cbd2c73cb5`. Temporary CI trigger was removed afterward in workflow-only commit `c9cca268ee931310aa608216c5b7b19a6d210abd`.
- Runtime-scope branch #148 **all three jobs passed**, run [`35674345524`](https://github.com/mikebuffan/Arbor/actions/runs/35674345524) at code+handoff SHA `a6689fa5a395e00179ebb0639cf7979461c9e07d`. Flutter analyze/tests and original Arbor + distinct Grove Android debug APK builds/uploads passed. An earlier #148 attempt `35674228979` was **cancelled during APK build** when a later documentation commit triggered a replacement run; do not count the canceled attempt as a pass.
- The #148 Grove APK ZIP is artifact `10672247461`, `the-grove-android-debug`, and the original Arbor APK ZIP is `10672247408`, `arbor-android-debug` (short retention, debug only). The approved Grove ZIP's APK was independently extracted and archive CRC verified. Neither artifact proves device install/auth/backend acceptance.
- **Temporary stacked Grove PR target lines are removed** from `.github/workflows/arbor-ci.yml` in this handoff branch after passing CI. Post-CI commits change workflow/docs only, not the tested Flutter/backend source.

## Actual private Android acceptance gates — not yet done
1. Retrieve CI-built *Grove* debug APK artifact, verify app ID `com.example.arbor.grove` and original Arbor `com.example.arbor` side by side; never call debug APK a signed release.
2. Launch in portrait/landscape at small text and enlarged accessibility font. Verify keyboard visible in Talk, no card overflow, every scene hotspot and corresponding accessible door, screen reader announcements, contrast and reduced motion.
3. Compare room visually against approved nighttime reference. Do not approve an alternative image merely because it is higher-res.
4. Clock now, manual location, time-only artistic mode, sunrise/noon/dusk/midnight, moon-horizon honesty, preview day/slider, Return to Now, DST boundary, resume after device sleep, timezone change. ARK timestamps unaffected.
5. Moss move/rest state survives full force-stop/reopen and failed/corrupt local state doesn't silently overwrite; reset requires user confirmation.
6. Sign in as the intended user and select project/conversation. Test Talk Text→Voice→Text, actual preserved thread identity after app kill/relaunch, accurate read-only objective/blocker/checkpoint/empty/offline states and memory + attachments metadata. **A draft frontend endpoint does not prove a deployed backend route.**
7. Switch project, account and sign out both before and *during* read-only ARK/shelf fetch; previous account/project data must disappear immediately, never reappear from a late request.
8. Mike/owner review: exact final SHA, privacy and authentication scope, API route exposure and RLS, preview deployment and rollback, model-specific inference route and data retention, distinct release signing. Obtain explicit owner signoff before merge, deploy or APK release distribution.

## First usable private-release criterion
Approved visual, full-height responsive working Grove home, linked real Talk, read-only selected-project state on authorized backend, no scope leakage or false autonomous-work claims, genuinely distinct Android package, real device basic offline/reconnect and Moss persistence, valid sun/moon and sundial preview, passing combined CI and owner-approved installed-device smoke test. A document, HTML proof, debug artifact, passing CI, or mock scene by itself is **not a usable private release**.

## Separate future integrations
- **Arbor LM:** verified independent inference contract, stable user/thread IDs, model-version receipt, cancellation/error states, authorized bounded calls, privacy and opt-in; never silently replace current Talk provider. Use integration seam after the LM engineering lane supplies actual tested endpoint.
- **Arbor Layer:** identity/behavior/agency and correction contract lives above model; explicit session-mode handoff and provenance, validated first in Text/Voice device tests.
- **Research doorway:** link to separately authorized project-scoped research engine/evidence index with original source and page/version citations; do not embed research executor, claim unseen files, or duplicate Epstein pipelines.
- **Exact high-resolution approved art:** if source exists, upgrade same composition after checksum/visual review, not via generic regeneration.

**Owner-facing truth:** the code in these stacked draft PRs is real. Its CI and Android installation must be distinguished from a shipped, signed, authenticated Grove that has passed actual physical acceptance.
