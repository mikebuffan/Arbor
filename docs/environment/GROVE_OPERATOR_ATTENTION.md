# Grove operator attention — read-only handoff

## Problem this addresses
Danelle should not have to inspect raw task rows, repeat questions, or guess whether the assistant actually needs an authorization. The Grove should answer a narrow question: **“Is there a recorded request for me?”** without pretending that all other work is executing or complete.

## Implemented (isolated frontend branch)
- Conservative `AttentionLevel` model: `needsYou`, `systemBlocked`, `noRequestRecorded`, or `unknown`.
- Maps only structured ARK blocker kinds `external_authority`, `missing_preference`, `high_consequence_fork`, and `irreversible_action` to a user decision request. Free-text errors and unsupported capabilities are **not** automatically reclassified.
- Stale, malformed, unavailable, degraded, and demo state cannot ask the user to take action.
- Home and Objective screens display a clear status card and the recorded blocker reason, if applicable. The card is read-only and has no action that could authorize production changes.
- Explicit phrase **“no request recorded”** instead of “nothing needs you” or “worker is still running.”
- Tests for adapter mapping, stale/demo masking, and visibility of the banner.

## Not claimed by this branch
- No changes to ARK task selection, job execution, research sessions, notifications, or scheduled background work.
- A lack of user-decision blocker is not evidence the work is progressing, and an objective's `running` status alone does not verify a worker is currently alive.
- No prod deployment, release signing, or real signed-in phone acceptance has been performed.

## Next milestones that reduce user babysitting
1. Connect the separate draft 60-minute research engine only after sandbox lease/restart/permissions tests; do not collide with its active branch.
2. Show durable session resume and completion receipts, with provenance and exact last execution timestamp.
3. Verify signed-in device text → voice → text and preserve active objective across surfaces.
4. Introduce explicit owner-approved notification routing for **new** human decisions only; do not send repeated reminders for unresolved generic system failures.
5. Test operator workflow end-to-end: start an authorized objective, leave the phone idle, return to a factual results-and-blockers report.

**Safety:** keep the existing production investigation worker v5 untouched; repository placeholder is not a deployable replacement.

## September 21: actual event history instead of decorative activity

- Grove Home activity now uses the existing authenticated `/api/ark/status` read-model event records; each displayed entry includes the event type, UTC recorded timestamp and event ID.
- Only records for the currently displayed objective are eligible; records without event ID, event type or valid timestamp are not presented as reliable activity.
- The view explicitly says when no ARK events are recorded. Previous hard-coded “Environment branch isolated / no production mutation” and decorative runtime events were removed.
- The status feed is read-only. An event’s type/time records what the store says happened; it does not prove that a worker is running **now**, nor that an objective is complete.
- This is independent of the draft 60-minute research sessions and does not start, stop or schedule them.

Phone acceptance, time-aware snapshot age validation and cross-thread objectives still need end-to-end verification before release.
