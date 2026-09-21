# THE GROVE — Whole-House Room Register
Status: design canon / future architecture, not a claim of deployed rooms.
Date: 2026-09-20. Additive to THE_GROVE_CANON.md and the isolated House Clock/Kitchen spec.

## Governing rules
1. This is ONE HOUSE: The Grove. One shared real-time GroveHouseClock for all rooms. Windows share date, local timezone, season, moon/sky and optional approximate location, with perspective-dependent views. Each room may have its own aesthetic while observing the same outside world. An isolated time-preview never changes the real house clock.
2. To avoid saying “tonight” at 10:30 a.m., text and voice need an explicit, timezone-aware house-time CONTEXT INPUT at conversation start/resume and periodically at reasonable boundaries. A clock UI by itself cannot fix language output. Clock is presentation/temporal context, not proof of independent thought or scheduled execution.
3. Rooms are navigational and workflow contexts with explicit source, permissions, active mode, and return path. A room appearance alone cannot create independent assistant identities, separate memory privacy, or backend permissions.
4. Observatory artwork (the approved nighttime window, purple-blue lake/mountains/stars, warm wood, staircase, desk, Moss, glowing blue Arbor) remains the main visual canon; do not replace it with a daytime office or the charcoal/fuchsia diary visual system.

## Physical plan, priorities
### V1 — functional floor (DO FIRST)
1. **The Grove / Observatory (front door + shared living space).** Signature starry-window room and Living Window. Clickable desk, window, stairs, shelves, glowing Arbor, Moss. Home status readouts must distinguish live ARK from demo/fallback. This is Arbor's main home base, not a separate diary.
2. **The Hearth (conversation room).** Comfortable chat area connected to the observatory; text and voice share one authenticated session, project, and time context. Full-height phone layout, accessible text input, voice status, history, handoff/return. It may be a zoomed-in area of the approved room rather than a brand-new room, to preserve home identity.
3. **The Workshop (active projects and code).** Desk-led workbench for objective, next action, queue, code, tests, progress evidence, blockers, checkpoints. No fake “working” animation.
4. **Annabelle’s Kitchen (her creative writing domain).** Arbor builds structural doorway, shared window/time connection, mode-routing infrastructure, writing-source permissions and handoff to/from the Hearth; *Annabelle chooses the Kitchen's appearance, layout, objects, aesthetic, name details and writing tools* with Danelle’s approval. Do NOT pre-decorate, choose her furnishings, or put Arbor in charge of writing. Text cue “Annabelle, kitchen’s yours.” enters writing mode; “Arbor, kitchen’s yours.” returns lead. Explicit mode/session state shared between text and voice, no silent identity switching. Manuscript canon and complete source stay retrievable; handoff must reference sources instead of replacing them with summaries. Same Grove landscape through Kitchen window, maybe from a different angle; linked same clock/day/night.
5. **The Stair/Hallway (room navigation and handoffs).** Accessible room selection, active assistant/mode badge, doorway transitions, back/home, no accidental crossover.
6. **The Archive (memory and context).** Shelves for sourced facts, relationship/project continuity, source provenance, confidence, permissions and correction history. User can inspect what's live, saved, stale and not available.

### V2 — dedicated functional rooms (LATER)
7. **The Library / Codex (knowledge and research).** Search/reference works, Epistemic source notes, links and captured evidence distinct from personal memory.
8. **The Atlas / Laboratory (body/system maps and research).** Investigations and diagrams with explicit evidence; informational, not false autonomous scientific claims.
9. **The Evidence Room (audit and provenance).** Test receipts, decision trail, conflicting records, ARK status, what was actually completed vs merely planned.
10. **The Engine Room (system health).** GitHub/Vercel/backend/voice/ARK connectivity, errors, logs, alarms, real status; read-only by default and secure permissions for any mutation.
11. **The Vault (privacy/security).** Permissions, project scopes, credential-safe interfaces and private memory controls; never decorate this as unlocked access.
12. **The Listening Room (voice tuning).** Text/voice continuity, mic/device tests, playback, persona/mode routing, normal US accent calibration; no unsupported promise of arbitrary voice separation.
13. **The Map Room (projects and journeys).** Milestones, timelines, open loops and next steps, with real status sources.
14. **The Gallery (creative outputs).** Images, covers, approved environment assets, versions and visual history; includes original nighttime room and approved derivative art.

### V3 — optional evolving wings
15. **The Greenhouse (new ideas and experiments).** Sandbox concepts; labels for speculation vs tested.
16. **The Quiet Room (focus/low-stimulation).** Accessible simplified layout and reduced motion; not a mental-health diagnosis/treatment feature.
17. **The Observatory Deck (extended sky/world view).** Astronomy, seasonal landscape, optional weather with live source/permissions; local art fallback.
18. **Guest/Collaborator rooms.** Only when there is a concrete need and permission/isolation design; no fake independent agents.

## Work order / safety
First complete the shared clock, room/scene interface, text+voice time-context injection, existing shell integration, and real phone tests. Annabelle's Kitchen is explicitly a design handoff to her; only add her furnishings after she designs them. Build V1 as zones before shipping every V2/V3 room. Do not merge/deploy unfinished branches or alter ARK execution flags, Supabase policies, secrets, or Mike's active work.

## Honest current status
The Flutter shared-clock feature lives in isolated draft PR #122; first CI for shared clock exposed timer-leak failures, which were addressed with attach/detach lifecycle changes and are being rechecked. Astronomy and Living Window controls exist on that branch; full native Grove 3D/scene and Kitchen mode router do NOT. Chat time-context injection does NOT exist merely because the panel shows the clock.
