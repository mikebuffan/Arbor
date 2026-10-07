# ONE ARBOR — Group 13 phone, Grove house, rooms and Workshop source gate

Review snapshot: 2026-10-07. Task IDs **F10 F11 F12 F13 F14 F15 G09 G12 only**.
This is source-review evidence and a future on-device acceptance plan — **not** a production or device acceptance claim.

## Source and ownership

- Canonical deployed Preview source is PR #322 `f4021985b475651284c97aecbc3bdf03123478cc`. PR #340 `595375d525cf561172449726ed0c086ab4ece7db` and successors are unmerged source candidates.
- G09 owner PR [#341](https://github.com/mikebuffan/Arbor/pull/341) at `500b1ad6cf2127a7f98ed65be515a310faf6c1ee` completed Flutter source CI [37696878118](https://github.com/mikebuffan/Arbor/actions/runs/37696878118). It already composes existing Projects, Work Queue, Activity, System Health; this lane **does not duplicate the workspace**.
- G11 separate diary PR [#342](https://github.com/mikebuffan/Arbor/pull/342) is a child of #341 and owns `arbor_environment_shell.dart`. This Group 13 branch forks exact #341 head, avoids changing the shared shell or diary, and makes a separate source-only PR targeting #341. Merge with diary only after explicit file/branch review.
- Group 12 owns private Grove host and model. Group 7 owns acoustic/voice correction behavior. This lane never touches their callers, flags, or host permissions. Group 4 owns memory shelf (including PR #352); no shared shelf writes.
- Branch adds exactly one existing room-inventory UI feature, its tests, this ledger, a targeted Flutter CI workflow, and a Vercel build-ignore entry. No new Grove world engine, storage, API, DB, deployment, account grant, worker, or device action.

## Eight-task source map

| Task | Existing source/verified bounded change | Remaining gate |
| --- | --- | --- |
| **F10 Android/offline** | `apps/frontend` Flutter app and #330 historical Android/synthetic APK CI evidence; room and house preview need no server to render. `grove_world_store.dart` is device-local; `GroveTalkPage` private Text is build-flag gated. | Real Android install → launch → airplane mode → recover → return, app lifecycle/storage/permissions and owned host positive/negative outcomes NOT RUN. |
| **F11 Grove Voice** | `grove_talk_page.dart` keeps private-host mode fail-closed: never falls through to legacy Firefly Voice. Original Firefly-flavor `VoicePage` exists separately, not proof Grove private Voice exists. | Owner-approved device microphone/speech/playback, interruptions, permission revoke and General American acoustic evaluation. **GATED**, no private Voice activation. |
| **F12 Studio Home** | `grove_house_room.dart` uses approved 709:409 nighttime art and navigable hotspots/accessible doors for Arbor, shelves, kitchen, Moss, living window, desk and stairs. | Physical device tap map, orientation/size/accessibility screenshots; not yet tested. |
| **F13 Observatory/Window** | `grove_observatory_view.dart`, `grove_living_window_panel.dart`, `grove_house_clock.dart` and `grove_astronomy.dart` implement local visual clock/phase and explicit simulated time. No GPS or server mutation. | Device sunlight/local date, timezone, pause/resume, accessibility and image review; data remains approximate. |
| **F14 Day art/Moss** | Night art `assets/grove_reference.webp` is existing authority; local Moss scene badges and `grove_world_state.dart` visitor-only events/locations exist. | Matching owner-approved **daytime art** asset has not been supplied/accepted. No fake recolor, invented activity or asset generation in this lane; device test gated. |
| **F15 Environment additions** | `GroveRoomInventoryPanel` lists Observatory, Library, Workshop, Kitchen, Guest Room, Sofa, Rug with known decorative fixtures. New workshop preview remains pure local UI. | More rooms/art may require individual content approval; actual device acceptance open. |
| **G09 Professional workspace** | Reuse PR #341 `ProfessionalWorkspaceView`, not changed here. It holds queue/activity when snapshot stale/demo or unverified. Historical exact-head workflow green. | Real owner-authenticated Grove installation/host status read and screen behavior still open. |
| **G12 Workshop** | Existing `grove_room_inventory.dart` immutable `moved` method now used by the existing Workshop zone to stage **only already-known shared scenery furnishings** in a temporary UI preview; reset and project/inventory replacement clear it. | This is a **bounded unsaved scene-layout preview**, not a full functional production Workshop, document editing, persistent project studio, or app/device acceptance. |

## Source defect and bounded repair

The Workshop inventory zone was merely a zone selector; no actionable workshop behavior existed. It now offers local explicit visitor-controlled placement preview of existing furnishings into the Workshop, while preserving the known object catalog and all source ownership semantics. Nothing is saved or connected to ARK. `GroveRoomInventory.moved` already implements immutable object movement, so no second room engine was needed.

The view:
- labels `WORKSHOP · UNSAVED SCENERY PREVIEW` and explains that it records no work;
- stages only `GroveInventoryKind.furnishing` with `GroveInventoryVisibility.sharedScenery`;
- never stages Moss places, source records, device-local entries, or a project-scoped object;
- resets on explicit Reset, widget recreation, inventory replacement, or projectId changes;
- maintains existing `inZone(projectId: ...)` visibility rules for source references and does not authenticate any user itself.

## New negative controls — source only

`apps/frontend/test/grove_workshop_preview_test.dart`:
1. Existing workstation stages from another room into Workshop; clearly displays UNSAVED, with no work/ARK claim.
2. Reset and widget recreation return preview to the original immutable inventory.
3. Private source entries and Moss positions cannot appear as stageable objects.
4. Changing source/project while the same widget stays mounted clears previous staged state.
5. Browsing Library reveals only the selected project scope; unselected project sources stay hidden.

Existing `grove_room_inventory_test.dart`, `grove_room_inventory_panel_test.dart`, `professional_workspace_test.dart`, `environment_navigation_test.dart` and `environment_live_ark_test.dart` are included in the targeted new Flutter workflow. Exact-head analyzer/test result is **PENDING until an actual GitHub Actions receipt is observed**.

## Physical acceptance checklist — not done by CI

Use one explicitly owner-approved installed APK build and record device OS/build and SHA before each stage. Do not ask users to paste auth tokens or publish private chat/screens:
- F10: cold app launch, airplane-mode render, navigable Home/Projects/Workshop, background→foreground, kill/restart; negative: no fabricated offline ARK success or lost stored local scenery.
- F11: private Grove Voice only after Group 7 + 12 host/permission approval; mic deny/revoke, interruption, TTS playback, Voice→Text correction retention, perceived US accent judged by a human. Record **NOT RUN** absent approved device/host.
- F12/F13/F14: verify art shape, hotspots, clock phase/daylight mismatch warning, Living Window preview not setting device time, daylight asset approval, Moss status only reflects actual local visitor actions.
- F15/G09/G12: seven zones visible; stage/reset fixture without writes; owner-scoped demo/stale queue remains hidden; professional workspace read-only; project switches clear local drafts; check small screen, keyboard and accessibility semantics.
- Real host outcome needs owner/project authenticated readback and source/deployment SHA, not just successful widget mocks. If not available, record **NOT RUN** and keep release off.

## Verification and release boundaries

The newest PR head and GitHub CI must be checked after the final code/docs commit. A successful Flutter analyze/widget test is **source-green only**, never installed-device green. Source PR #341 stays unchanged, diary and Group 4 memory shelves untouched. Vercel branch-specific skip entry protects the new branch from accidental builds; observe actual build logs before claiming effective protection on every project.

No main merge, production/Preview promotion, new canary, grant changes, private memory capture, model inference or training, real-world route action, auto-monitoring, September 28 research-task mutation, invented daylight art, or unapproved installed-app actions.
