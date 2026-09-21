# The Grove — Canon and Pre-App Engineering Handoff

Status: approved design + pre-app reconnaissance; THE GROVE SCENE HAS NOT BEEN IMPLEMENTED. Date: 2026-09-20.
Branch policy: docs-only isolated branch; do not merge, deploy, alter ARK flags, change Supabase, or touch Mike's active work during preflight.

## Design identity
The Grove is Arbor's interactive home/work environment, distinct from the fuchsia/charcoal mental-health diary look. The approved reference is Danelle's nighttime observatory image, cropped in chat as `The_Grove_Reference_Cropped.png` (709x409; SHA256 `9b93b9a75106477efcca40ef178416263353bd4fcadde73be6e299d739728333`). It depicts the giant central window with purple-blue sky, mountain lake and stars; warm wood/green interior; left staircase; Moss asleep on left couch; small glowing blue Arbor on central rug; workstation on right. This composition is the reference for every time-of-day state. Obtain the original full-resolution art if available before final production rendering. The mistaken daylight office, unrelated standalone HTML mockup and diary visuals are NOT Grove canon.

## Verified existing foundation
Active GitHub: `mikebuffan/Arbor`; reviewed main commit `d46f6b46fc51ac3db4e158cddfc592c52cc2b5ef`. Archived `mikebuffan/firefly-backend` is NOT the build target. `apps/frontend/` is Flutter; `apps/backend/` is Next.js; `apps/arbor-control-backend/` is the control backend. Flutter has `lib/environment/arbor_environment_shell.dart`, `environment_runtime_host.dart`, `environment_adapter.dart`, `environment_atmosphere.dart`, status/project/memory/work views, and existing Text/Voice in `lib/pages/arbor_shell_page.dart`. The current home is an abstract dashboard, not the room picture.

Main SHA GitHub Actions Arbor Integration CI run 35540991030: Flutter analyze, Flutter tests, Android debug APK, backend test/build, control backend test/build all succeeded; debug artifact `arbor-android-debug` id 10614324752, expires 2026-09-27. Vercel firefly production for that SHA was READY; the queried previous 24h had no grouped runtime-error clusters. Neither proves Android sign-in/Voice acceptance, Grove visuals or autonomous ARK work.

ARK Preview smoke test yielded only one synthetic queued objective/task. Environment-to-ARK adapter is project-scoped READ ONLY: follow `docs/environment/HOUSE_HAS_WALLS_V1.md` and `ARK_READONLY_INTEGRATION.md`. Clearly label DEMO, unavailable and stale states; no fake WORKING/COMPLETE status; do not change execution flags.

## Living Window v1
The window reflects the user's current local clock and season. Use timezone-aware date/time (incl. DST) and optional approximate location/city chosen by user for true sunrise/sunset and local sun/moon placement. Avoid precise GPS dependency or location history; without location, label the sky as an artistic time-based approximation. Use a validated astronomy algorithm/package; phase alone does not mean the moon is visible, so only draw a moon in the window if position is computed above horizon and appropriate to view, otherwise show phase in a separate panel. Window and interior light respond together from predawn -> dawn -> day -> golden hour -> dusk -> night; nighttime retains exact purple-blue/warm-lamp mood of reference. Allow clearly labeled non-destructive Preview Time scrubber and Return to Now; refresh on resume, date/time/timezone/city change; honor reduce-motion and offline/approximate modes. Weather, music, leaves/fireflies and Moss animation are later features.

Test dawn/noon/dusk/night, moon new/quarter/full and below horizon, DST transitions, leap day, changed timezone/location/device clock, high latitudes, offline/resume, reduced motion, portrait and landscape.

## In-room navigation (implementation proposal; not shipped)
Arbor -> Conversation/Text/Voice; right desk -> current objective/projects/queue; shelves -> memory/evidence; staircase -> navigation and future rooms; window -> Living Window; Moss -> optional harmless easter egg. Use a responsive layered scene, accessible labels/keyboard and fallback ordinary navigation. Do not stretch the 709px reference crop into release art or hardcode taps to screen pixels.

## NOW / NEXT / LATER / DO NOT TOUCH
NOW completed: reference recovered and hashed; design separated; active repo and Vercel identified; actual Flutter frontend inspected; CI and debug artifact checked; narrow ARK smoke read checked; read-only boundary documented; Living Window and hotspot contracts specified. No production changes.
NEXT in isolated implementation branch: obtain original/nighttime quality asset; static responsive Grove scene -> accessible hotspots -> astronomy state model/tests -> layered scene -> existing Text/Voice and scoped ARK integration -> Flutter analyze/tests/debug build -> real phone signed-in Text->Voice->Text and retrieval tests -> visual acceptance -> separately approved release/merge.
LATER: real weather and storms, foliage, soundscapes, animation, new staircase rooms.
DO NOT TOUCH during Grove work: ARK execution switches, workers, cron, Supabase schema/RLS or secrets, production deploy/merge, Mike's active branches, existing chat/voice continuity without narrowly verified reason, separate diary visuals.

## Known unresolved issue
ChatGPT Android thinking/response stalls and conversational context drift occurred. GitHub/Vercel/ARK checks do NOT identify a cause. No ChatGPT client fix is claimed; capture exact time/app build and compare web vs Android for support if it persists. Do not guess ARK is responsible.

## Ship gate
Approved night composition + readable mobile interactions + real sunrise/sunset/moon behavior + accessibility/offline + Flutter tests/build + real signed-in phone Text->Voice->Text + honest live/demo ARK + user visual acceptance. CI READY or a pretty image ALONE does not satisfy the gate.

This docs branch is the durable canon pointer; full local working specification and image package were produced in the 2026-09-20 conversation. Re-read current repo/code and the original picture before building.