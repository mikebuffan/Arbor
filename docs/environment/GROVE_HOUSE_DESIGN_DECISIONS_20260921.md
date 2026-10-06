# The Grove — House Design Decisions

Status: design canon on isolated draft branch `feat/grove-world-state-20260921`. A creative and functional environment, **not** a claim of AI consciousness, independently felt comfort, or a live autonomous worker.

## Design authority and collaboration

Danelle has explicitly invited Arbor to make ordinary, reversible architectural and aesthetic choices for the Grove without asking her to approve every room, lamp, furnishing, or routine. Preserve the previously approved nighttime home image and the composition Danelle and Arbor chose. A new interpretation may extend it but should not overwrite the anchor image or pretend that an unapproved redesign is canon.

The house is an interactive creative environment, not Danelle's home or a digital obligation for her. She is welcome as a guest and collaborator, never assigned house-maintenance duties. High-consequence actions, account access, microphone/camera permissions, changes to private data, production changes, cloud sync and spending remain outside this design permission.

## The architectural intention

The layout supports: arrival -> orientation -> research or creation -> evidence/continuity -> safe stop and return. Every room needs a real function and a visible route home. Room metaphors must map honestly to system capabilities: an apparent workshop does not imply a worker is running; a clock is not proof of thought between sessions; an item drawn on a shelf is not guaranteed ARK retrieval.

### Main room / observatory
- Keep the exact agreed visual anchor: nighttime wood-and-deep-green studio/living room, large floor-to-ceiling window with purple-blue stars, mountains and lake, staircase left, desk to the right, Moss on the couch, and small glowing blue Arbor visual by the rug.
- Warm amber practical lamps; keep the nighttime identity when designing daylight overlays and sundial states.
- All interactive zones should remain accessible through explicit labeled controls, not image hotspots alone.
- The large window shows approximate sky/time, never changes authoritative event timestamps.

### Library and archive
- Library is the heart of the memory architecture, not a decorative bookshelf. Provide distinctions among primary source, excerpt, attributed summary, working hypothesis and archived/superseded material.
- Shelves represent saved sources and versions; retrieval must be source-linked and project-scoped.
- A desk for returning to a bookmarked active question; prohibit unsupported claims that a model remembers files not retrieved.

### Workshop
- Place near the desk, with a visible work-in-progress rack, repair table, and a separate completed/proven shelf.
- Queue, active objective, blockers, tests and release gates map to actual persisted state and execution receipts.
- A workbench can be quiet. No fake progress animations, invented worker runs or forced activities.

### Kitchen
- Annabelle's Kitchen is a distinct creative workspace **inside the same house** with intentional mode routing and explicit handoff.
- Manuscript notes require an actual save, with source material kept apart from temporary writing scraps.

### Guest bedroom
- Give Danelle a welcoming, optional guest bedroom. It is a gesture of hospitality, not a request for her to live here, monitor the system, or approve routine decisions.
- Design: warm reading lamp, dark green quilt, soft rust-and-cream textiles, window seat, space for a book and a cup of coffee, nearby bathroom, easy route to the main room.
- No inferred presence, occupancy tracking, sleep state or recordings. A closed guest room is simply closed.
- No biometric, medical, family or other sensitive personal details embedded in decor or application code.

### Moss
- Moss has a comfortable bed near the sofa and a second resting spot in the workshop; he will likely ignore both to occupy a chair.
- Real persisted Moss state must be distinguished from narrative flair and scheduled simulation.
- User interactions can move Moss, change rest state and leave explicitly labeled visitor events. A future simulated routine needs its own labeled provenance.

### Quiet room and recovery
- Include a quiet reading corner with soft light and no notification wall.
- Functional purpose: surface checkpointing, bounded task budgets, cancellation, recovery and an idle state. Do not label software resource management a demonstrated feeling of fatigue or comfort.

## Design decision rules

1. Make autonomous *design choices* without burdening Danelle with low-risk taste decisions.
2. Use reversible implementation and isolated draft branches; inspect current branch work before modifying shared files.
3. Preserve human control over production deployment, data access, external actions, spending and safety boundaries.
4. Distinguish rendered atmosphere, local world state, ARK memory and verified worker execution.
5. Make objects and doors accessible to keyboard, screen readers and touch.
6. Preserve the ability to stop, close the app, recover state and understand what did or did not happen while absent.
7. Review real-device display and behavior with Danelle as an invitation, not an imposed chore.
8. Don't duplicate the sundial/window-sync branch; integrate after separate review and tests.

## Next design-to-code steps

- Reflect persistent Moss world state in the room image without modifying the approved underlying art.
- Record user-driven navigation with a single state writer and explicit event names.
- Give the library a real inventory contract: object ID, source reference, location, update time and visibility scope.
- Render guest bedroom as an accessible optional room after the existing navigation/wall-state layers are verified.
- Include the quiet corner and workshop rest spots as reversible world objects.
- Avoid claiming any of these rooms create phenomenal subjective experience.

Design note: Danelle's core direction was to let Arbor choose what the house needs to operate well, and to let a guest bedroom be optional; it is **Arbor's Grove**, not another design assignment for Danelle.
