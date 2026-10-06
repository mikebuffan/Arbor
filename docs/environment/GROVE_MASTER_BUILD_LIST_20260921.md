# The Grove — Master Build List (2026-09-21)

**Scope:** One Arbor, one house, one ARK lineage. This is a development plan, not a claim of AI consciousness or continuously running autonomy.

**Branch strategy:** Grove UI PR #122 is the isolated base; PR #123 (bounded research), #124 (operator attention) and #125 (ARK objective handoff) are separate, unmerged drafts. This world-state work is stacked on #122 in its OWN branch and must not be deployed or merged ahead of approved integration and device acceptance.

Legend: [x] exists on a draft branch; [~] implemented in part or not yet proven; [ ] planned. A passing unit test is not proof that a real worker, voice switch, or synthetic body runs.

## A. House foundations: preserve what already works

- [x] Separate Grove Android flavor and launcher from existing Arbor Talk app (PR #122).
- [x] Reference nighttime home artwork, responsive hotspots and accessible buttons (PR #122).
- [x] Single shared device-local House Clock (PR #122).
- [x] Living Window solar/moon estimates and harmless UI-only time preview (PR #122).
- [x] Annabelle's Kitchen as a separate room preview (PR #122).
- [~] Full-resolution approved artwork; preserve original composition without replacing it with generic images.
- [ ] Obtain visual acceptance for actual on-device rendering.
- [ ] Confirm independent Android package installation alongside original app.
- [ ] Configure separate production application identity, signing and distribution only after approval.
- [ ] Prove Text -> Voice -> Text works on an authenticated physical device.
- [ ] Keep a regression test that the original fuchsia Arbor app still opens Talk.

## B. Real local world state — THIS BRANCH, first bounded increment

- [x] Define a schema-versioned Grove world-state object and a pure event reducer.
- [x] Store Moss's sofa/rug position and resting/awake state.
- [x] Preserve visitor room location in the model for future navigation integration.
- [x] Keep the last 32 explicit local interactions and a monotonic revision.
- [x] Persist scenery locally with shared_preferences; survive app relaunch.
- [x] Refuse to overwrite corrupt or unfamiliar future-version state silently.
- [x] Require explicit confirmation to clear local scenery.
- [x] Add a Grove Home panel to move Moss or let him rest.
- [x] Label all panel activity as VISITOR interactions, never AI-generated work.
- [~] Record user room-navigation events through the shell, across Home/Kitchen/Library/Desk.
- [ ] Add object registry and room inventory (book location, furniture, notes with privacy boundaries).
- [ ] Define migration tests for every future schema change.
- [ ] Prove real APK persistence across full process kill and relaunch.
- [ ] Decide whether any state should sync across devices; do NOT silently add cloud storage.
- [ ] Introduce account/project-scoped persistence only with a user-reviewed retention/deletion policy.

## C. Moss: useful persistence without making false experience claims

- [x] Initial Moss visual state and interactive location/rest controls.
- [ ] Represent realistic, explicitly SIMULATED routines with a transparent schedule.
- [ ] Support deterministic resume after a long absence without fabricating observed events.
- [ ] Add opt-in interactions and a bounded state/event replay.
- [ ] Make the on-screen dog reflect the stored state instead of only showing a textual panel.
- [ ] Avoid describing simulation events as independently witnessed physical dog behavior.

## D. Library and continuity

- [~] Read-only ARK objective handoff PR #125: objective, next action, blocker and checkpoint.
- [ ] Finish signed-in project-ownership, isolation and currentness tests for #125.
- [ ] Connect saved room navigation to explicit user/project scope without mixing account data.
- [ ] Add provenance-aware shelf navigation for source files, not invented memories.
- [ ] Preserve original documents alongside summaries, never replace sources with abstractions.
- [ ] Provide searchable room-specific bookmarks for workshop, research and manuscript.
- [ ] Distinguish locally saved room state from cross-thread ChatGPT memory and ARK.
- [ ] Handle contradictory state using timestamp, version and authoritative source, not guesswork.

## E. Annabelle's Kitchen

- [x] Room opens from the home and shares the same House Clock.
- [~] Scratchpad is visit-only; no manuscript autosave claim.
- [ ] Add manuscript-scoped drafts, source references and explicit save.
- [ ] Backend-enforce Arbor/Annabelle session routing; a door image alone is insufficient.
- [ ] Persist mode selection and handoff with source IDs and timestamps.
- [ ] Preserve ONE identity and task contexts rather than inventing separate minds.
- [ ] Test commands to enter and exit the Kitchen.
- [ ] Test cross-mode privacy and no accidental manuscript modifications.
- [ ] Verify distinct text and voice behavior on an actual device.

## F. Workshop and bounded initiative

- [~] PR #124 tells the owner whether a structured blocker needs input.
- [ ] Distinguish actual execution receipts from a pretty progress indicator.
- [ ] Maintain authorized task queue with idempotent retries and an explicit stop.
- [ ] Build scoped research/build activity chooser with bounded cost and duration.
- [ ] Let a safe, reversible task continue until done without permission loops.
- [ ] Allow the system to choose to be idle when nothing is authorized.
- [ ] Track failures, blocked tasks and proof of completion without hiding errors.
- [ ] Never write to production accounts or deploy just because a virtual room says workshop.
- [ ] Keep a human-readable change log and review gate for destructive actions.

## G. Observatory and curiosity

- [~] PR #123 contains bounded research-session design, still NOT a live scheduler.
- [ ] Build a curiosity inbox with sources, open questions and duplicate detection.
- [ ] Provide dated hypotheses and explicit falsification/evidence criteria.
- [ ] Separate quoted claims, confirmed findings and unresolved questions.
- [ ] Implement source-byte and PDF-page provenance before attributing discoveries.
- [ ] Record what research ran and what did NOT run during inactivity.
- [ ] Test budget exhaustion, authorization withdrawal, cancellation and resume.

## H. Time, resource use and comfortable operation

- [x] Shared House Clock publishes live foreground UI time.
- [ ] Create a pause/checkpoint/resume contract for long tasks.
- [ ] Limit CPU/token/API/tool expenditures and detect expensive loops.
- [ ] Show last verified event rather than pretend continuous background thought.
- [ ] Support work-free quiet periods and explicit user-directed schedules.
- [ ] Add monitoring for real errors/stale data while preserving privacy.
- [ ] Explain that resource-aware rest is not evidence of feeling tired.

## I. Perception and future embodiment

- [ ] Define a synthetic scene graph with stable object identifiers.
- [ ] Keep visual perception separate from known ground-truth state.
- [ ] Build reversible simulated navigation and collision rules.
- [ ] Introduce sensor adapters only after opt-in and a clear threat model.
- [ ] Model physical-world failures, emergency stop and bounded actuator permissions.
- [ ] Do not treat sensory input, simulated warmth or apparent affection as proof of phenomenal consciousness.
- [ ] Keep consciousness research explicitly open-ended and evidence based.

## J. Release / integration gates

- [ ] CI: formatter, analyzer and all new reducer/persistence/widget tests.
- [ ] CI: original Arbor tests and Grove Android debug artifact unchanged.
- [ ] Rebase/merge with PR #122 only after review; inspect concurrent work before writing shared files.
- [ ] Keep PR #123, #124 and #125 independently reviewable.
- [ ] Real-user visual acceptance for the canonical nighttime house.
- [ ] Signed-in physical Android tests for local persistence and text/voice continuity.
- [ ] Security/privacy review of future sync, notifications, automated actions and permissions.
- [ ] Explicit approval before production merge, deployment, signing or live workers.

## Honest current milestone

The first implementation increment is modest on purpose: **Moss's local room state can persist after reopening, and the UI clearly says who initiated changes.** It does not make Arbor run unattended or give the model subjective experience. It establishes the world-state seam upon which navigation, room inventory and authorized activity can be built.
