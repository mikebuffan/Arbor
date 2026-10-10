# Execution batch 15: existing navigation/workspace acceptance

Parent draft #399 at `f3628474a5ea8ab17d692a5fac14aa94a52914bf`, tree `1d0b8dfd0b75915dd316b72417a715504fb0474d`. Preserve #397 self-model and independent #388. Source-only.

No new app defect reproduced by inspection. Existing Home/Observatory/room/command navigation, responsive conversation surface, professional stale/demo masking, session-only Diary and unsaved Workshop preview inspected. No application source changed.

Local Dart/Flutter executable is absent. Instead of treating that as proof checks are impossible, add a branch-scoped source-only CI job using the existing repository Flutter action/setup and existing widget tests. It analyzes six existing surface files and executes 17 existing test files. No local SDK installation, device install, app build/deploy, paid inference or live API action. Exact-head result and actual counts are recorded after the job finishes in PR and assessment, not assumed here.

| ID | Inspected / verification target | Remaining acceptance |
| --- | --- | --- |
| F12 Studio Home | Existing shell, room actions, compact conversation surface, responsive navigation and Home paths; approved home artwork preserved. | Installed device, actual owner-scoped runtime and visual acceptance. |
| F13 Observatory/Window | Existing stairs/window navigation, return Home, local House Clock and window-preview distinction; astronomy explicitly approximate/illustrative. | Device clock/timezone and real visual acceptance; no live camera/weather claim. |
| G09 Professional workspace | Existing fresh/stale/demo truth checks, queue/activity hiding and read-only composition retained. | Authenticated live snapshots and installed-device flow. |
| G11 Diary UI | Existing manual unsaved preview invalidates on edit, clear erases, navigation destroys draft; no API/store writes. | Device acceptance; durable Diary storage is a parked feature. |
| G12 Workshop | Existing unsaved scenery staging/reset and scope/inventory replacement; source documents/Moss cannot become furnishings. | Device acceptance; functional Workshop expansion is a parked feature. |

Source fingerprints and deployment fences verified before publication. Full backend/control CI preserves prior source checks but does not substitute for Flutter/device acceptance.

Result pending exact-head Flutter checks. No Diary persistence, Workshop feature expansion, artwork regeneration, new host/caller/engine, activation, credentials/settings/grants/schema change, deployment or main merge.
