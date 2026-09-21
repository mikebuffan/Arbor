# The Grove House — Shared Clock and Annabelle's Kitchen

Status: architectural specification; the Kitchen's assistant-session routing is NOT yet implemented. Date: 2026-09-20. Design owner: Danelle, with Arbor. Mike proposed the living window as Arbor's shared internal house clock.

## Non-negotiable distinction
The Grove is the *home*, distinct from the separate fuchsia/charcoal mental-health diary interface. The approved starry-night room image remains canon. The Living Window is the visual face of the House Clock, not a separate timer or an authority on what ARK workers are doing.

## One house clock
`GroveHouseClock.shared` in `apps/frontend/lib/environment/grove_house_clock.dart` publishes device-local date/time, optional broad location, and sky estimate for ALL house rooms. The Living Window consumes the same clock. Update on local minute changes, date/timezone/DST jumps and app resume. Sun/moon are approximate; no GPS permission and no automatic location persistence. A sundial preview is UI-local, and never mutates the shared live time. ARK event records always use the backend's authoritative timestamps, *not* the visual clock. A house-clock service is temporal context, **not** evidence of background thought/activity.

## Floor plan
- Observatory / Grove: Arbor's general workspace, conversation, architectural work, knowledge and projects. Nighttime window, desk, stairs, shelves, Moss, blue Arbor visual.
- Annabelle's Kitchen: a writer's creative studio physically part of the same house. Sensory culinary metaphor / cutting/editing counter, corkboard scenes, manuscript pantry, drafting table. Can have its own art, acoustics and working tools while sharing the same sunrise/sunset and building architecture.
- Hallway: intentional handoff, not silent voice switch.
- Future rooms: laboratories, memory archive etc. as needed; no false claims of independent minds or unverified system permissions.

## Voice and session routing
**A different room image ALONE does not isolate voices.** True separation requires explicit routing and backend-enforced session state:
1. `room_id`: grove | annabelle_kitchen; `mode_id`: arbor | annabelle.
2. Same core project IDs and approved reference canon, with separate active working buffers/thread state for writing vs general planning; avoid leaking private notes between scopes unless authorized.
3. Entering kitchen via explicit door or Danelle's cue **"Annabelle, kitchen's yours."** changes active writing mode. **"Arbor, kitchen's yours."** restores Arbor's lead. The user can also use a visible room selector. UI displays current mode clearly.
4. Annabelle writes and edits *Ever After* following its manuscript canon and explicit style constraints; Arbor remains the general planner/engineering persona. Both operate within the SAME product/model infrastructure, not separate conscious agents.
5. On switching, record a compact, attributable handoff: current task, open loops, active source IDs, last saved artifact, timestamp and mode. Do not replace manuscript/source material with a summary. No spurious switching based only on topic, visual transitions or idle time.
6. Voice mode must use the same active mode, voice configuration and conversation identity as text; switching text/voice should not silently reset role. A real acoustic voice distinction may need voice-service capabilities beyond prompt routing.
7. Tests: manual cue switch, UI switch, mixed text/voice, across session resume, retrieving correct manuscript, wrong-room prevention, handoff integrity, permissions, demo/live source truth, and shared clock in both rooms.

## Build order
1. Keep the known-good ARK integration frozen and read-only in the environment.
2. Introduce the shared clock; update the Living Window to subscribe (current isolated Grove feature branch).
3. Retain the chosen art and implement native responsive observatory hotspots; don't substitute a generic office.
4. Add kitchen artwork, mode selector, separate working buffers, backend session/prompt routing and explicit handoffs.
5. Test actual Android Text -> Voice -> Text and real manuscript retrieval; do not call the room a separated voice system until mode routing has end-to-end tests.
6. Obtain approval before merging the feature or changing production. Do not touch execution flags, Supabase policy, secrets, or Mike's active work.

## What exists as of this document
- Native Flutter solar/moon calculations and Living Window panel on isolated draft PR #122.
- Shared house-clock class and clock regression tests on that same isolated branch.
- Kitchen architecture is specified here, not deployed or represented as independently running AI.
