# The Grove + ARK: ordered integration and release-candidate checklist

Reviewed 2026-09-21. This checklist is an integration handoff, not a claim that
draft features are in production or that one chat works while it is closed.

## Dependency graph (do not separately merge superseded branches)

Grove original app #122 → consolidated Grove #129 → inventory #130 →
live-memory shelf #132 → attachment-metadata shelf #133 → scope repair #137 →
THIS integration PR. Also import the three actual handoff source/test files
from separate read-only backend PR #125 **once**, reviewed by blob identity.
#126/#128/#124 were consolidated in #129; do not merge them again.
Research chain #123→#131→#134→#135→#136 is a separate lane.
No Qwen/LLM weights, external inference, or production worker changes here.

## Local coding and CI: [x] items are code commitments, NOT device acceptance

- [x] Inventory current open Grove and ARK work before modifying branches.
- [x] Work on an isolated branch stacked on #137; do not change main.
- [x] Copy the exact read-only ARK backend handoff projection, route and tests
      from #125; add projectId to the response for client scope verification.
- [x] Keep existing ARK status/Environment adapter intact. The new panel is
      additional saved-state inspection, NOT a replacement for live status.
- [x] Add a strict selected-project client parser; refuse invented live
      execution and unstructured owner-decision claims.
- [x] Add a manually invoked Objective-room inspector for saved goal, state,
      next action, checkpoint, blocker and evidence-recorded distinction.
- [x] Revalidate sign-in/project/conversation after network I/O; invalidate
      any visible handoff on auth or local project/thread changes.
- [x] Unit and widget regressions for denied project, invalid handoff,
      unexpected live-work claim, stale response, owner decision, no objective,
      failed fetch and saved checkpoint.
- [x] Combined Flutter analyze/test, backend/control build and distinct Arbor
      and Grove Android debug builds PASSED at tested SHA
      62bf31a216f1ea8b457790df9c1d8eaf8745a4bb, workflow
      https://github.com/mikebuffan/Arbor/actions/runs/35662005850.
      First run found an incomplete-state null unwrap in the inspector;
      corrected it and verified this rerun.
- [x] Removed temporary stacked-PR CI trigger after successful run.
- [x] Reviewed final code lineage and PR file list before handoff.
      Branch head will differ from tested SHA only in CI workflow cleanup
      and this explanatory checklist; test receipt covers the code.

## Explicit physical-device / release gates: not performable from GitHub alone

- [ ] Produce/retrieve approved APKs; verify distinct app package identifiers.
- [ ] Signed-in real Android device: original Talk and separate Grove install.
- [ ] Text → Voice → Text in both apps; keyboard, rotation, accessibility.
- [ ] Close/relaunch Grove: local Moss state, actual project/thread recovery.
- [ ] Correct owner/project/conversation: memory, attachments, ARK handoff.
- [ ] Switch project/user/sign out while data visible or load is in flight:
      prove previous user/project data vanishes before new fetch completes.
- [ ] Verify ARK unavailable/empty/checkpointed/blocked/completed UI against
      known source-backed rows, and never imply unattended execution.
- [ ] Owner/Mike review exact SHA, production API route availability, Supabase
      RLS, deployment preview, privacy/security and rollback plan.
- [ ] Integrate stacked branches once in approved order; no duplicate source
      branch merge and no release without explicit owner signoff.

## Truth boundary

Code and green CI are different from a completed end-to-end production system.
Saved ARK "running" status is NOT a heartbeat, a background worker guarantee,
a resumed task or evidence of a conscious agent. The Grove attachment shelf
lists uploaded Firefly chat attachments, not all files or verified PDF text.
