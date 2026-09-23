# Grove consolidation audit — 2026-09-21

**Integration branch:** `feat/grove-integrated-20260921` (isolated, unmerged). Based on sundial PR #126 commit `5316f89d32a6467efdfd0748beb73ef7be34598e`, itself based on original Grove house PR #122.

## Reused instead of rebuilt

- **PR #122** owns the approved nighttime artwork, separate Grove Android flavor, House Clock, accessible house hotspots, Kitchen preview, and read-only ARK environment boundary.
- **PR #126** owns the shared sundial-to-window preview, solar display and existing sundial tests. Kept verbatim as integration base.
- **PR #128** owns the versioned local Moss/world reducer, local store, interaction panel, tests, master roadmap and house design canon. All eight changed files copied as exact source Git blobs; no reimplementation.
- **PR #124** owns the operator attention mapping, ARK events presentation and tests. Its ten non-overlapping files copied as exact Git blobs. Its shared `arbor_environment_shell.dart` and `environment_runtime_host.dart` changes were ported deliberately into the existing house version, without replacing house or sundial features.
- **PR #125** owns a separate, still read-only backend ARK handoff endpoint. Not merged into this UI integration without auth/currentness review.
- **PR #123** owns bounded research execution and evidence contracts, NOT live; left untouched.

## Explicitly reconciled seams

- Grove Home displays the approved room, local Moss state and shared live/sundial window.
- Operator attention display appears on Home/Objective and uses persisted structured ARK blocker semantics; stale and demo source behavior stays safe.
- Real ARK activity events are passed from the adapter through the host to the house; Moss taps are clearly local visitor events and **not** ARK work evidence.
- Existing Android standalone Grove entrypoint remains in the base, no second launcher or clock added.
- Shared shell, host and workflow were hand-integrated; neither older branch was overwritten.

## Avoiding duplicate merges

This integrated PR becomes the review target for **UI consolidation**. Do not independently merge PR #126, #128 or #124 into main after approving this consolidated change: that duplicates code and risks the shared shell. Preserve old PRs as source evidence and mark superseded only after combined CI and code review.

PR #127 is a temporary CI-only main-targeted PR and **must never be merged as a Grove feature**. The integration workflow temporarily allows the Grove foundation target to run CI; remove that special trigger before production merge.

## No false completion claims

Passing unit tests on isolated features or on the integration branch is not actual signed-in phone acceptance. The Grove is not deployed from this branch. A House Clock isn't evidence of thinking between sessions, an ARK status card isn't a worker heartbeat, a persisted Moss position isn't an independent robot, and none of these UI components guarantees subjective experience.

## Required final gates

1. Confirm full integration CI against the final head SHA: Flutter analyzer, widget/unit tests, backend tests, original Arbor and separate Grove debug APK.
2. Confirm no regressions in standalone Grove vs existing Arbor Talk app, room navigation, sundial preview -> Return to Now, stale blocker labels and ARK event provenance.
3. Check local Moss state after process kill/relaunch on a real Android device; reset must be opt-in; damaged/future schema never overwritten silently.
4. Integrate #125 backend separately after owner/project isolation and session-resume tests; do not confuse read-only handoff with automatic resume.
5. Production merge/deploy, signed release, cloud state sync, research scheduler and elevated permissions require explicit approval.
