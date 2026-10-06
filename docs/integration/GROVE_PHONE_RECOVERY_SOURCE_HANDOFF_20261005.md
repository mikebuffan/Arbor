# Grove phone draft/retry/session recovery — source handoff, October 5, 2026

**Status: implemented source draft; Flutter behavior and actual device persistence remain UNVERIFIED.** This follow-up is isolated on `arbor/grove-phone-recovery-20261005`, stacked on Grove host repair PR #237, parent `1fcdd6fa5be9d7473d389fc1864caab5ffc2c593`. No production change, hosted storage write, actual private message, model inference, execution activation, archive import or memory reconciliation occurred. Existing drafts and engines remain intact.

The previous inventory and live gates remain in `GROVE_INDEPENDENT_LM_CONNECTION_HANDOFF_20261005.md`. This document replaces only its **unrepaired phone source gaps**, not its live status. The latest One Arbor candidate remains separate; do not merge the older Grove composite wholesale.

## Demonstrated failures and repair

| Trigger | Previous behavior | Proposed source behavior |
|---|---|---|
| Exit after an uncertain private send | Retry ID and original text existed only in widget memory | Explicit opt-in device draft retains the exact original ID/text before the POST; remount restores it after authorized history read |
| Server saves but phone loses reply | Fresh screen could generate a new logical turn | Matching complete history pair clears pending state without another POST; absent/truncated history preserves original retry for an explicit Send |
| Edit an uncertain send | Changing text automatically minted a new retry ID | Text stays locked; retry is unchanged or user explicitly confirms discard, acknowledging the original request is not cancelled |
| Device write returns false | Session adoption reported success and published new scope | Preference failure throws; prior successful scope remains; private panel catches adoption failure |
| Project write succeeds but conversation write does not | Two keys could combine different scopes after restart | Single versioned context envelope contains both IDs; serialized operations in the existing singleton order reads/writes |
| Clear encounters storage failure | Failure ignored | Visible private scope is hidden and failure propagates; disk deletion is not claimed |
| Old stored IDs survive clear | Old keys could be reread | Successful cleared envelope overrides legacy keys; startup reads old builds without writing a migration |
| Wrong account/project/receiver or damaged draft | No recovery policy | Keys and record validation bind auth origin, API origin, authenticated user, project and conversation; malformed/newer data blocks send until explicit erase |

## Existing implementation and privacy boundary

`DeviceStringStore` wraps the existing `SharedPreferences` implementation; its injectable boundary allows storage-failure fixtures. There is no new cloud transcript engine, database migration or dependency. Drafts store only message text plus retry metadata, with no bearer token, model reply or ARK state. A single-isolate queue also orders operations across panel remounts. An existing pending retry cannot be replaced by another panel's ordinary save; clearing after completion requires the matching request ID. Explicit erase is separate.

Device retention defaults OFF. The owner must select **Keep unfinished message on this device**; the UI says it is stored locally without encryption until cleared. Retention can also be enabled after an uncertain in-memory send. A retained empty record keeps this per-conversation choice after confirmed completion. Disabling retention erases device text; failed erase does not claim success. Sign-out hides content but does **not** erase opted-in drafts. They can reappear only for the same scope after authorized history is retrieved. Account-specific keys are isolation, not encryption or server authorization.

Unsent text uses a 300 ms save debounce plus best-effort background/disposal flush. The UI exposes saving/failure state. A pending request is saved and awaited **before** network send, followed by a fresh local session check. Sending, conversation selection, refresh and creation are guarded while storage work or an uncertain send is active. A restored draft never automatically submits, creates a conversation or resumes an ARK task.

## Verification in this pass

- Eight changed/new Dart files pass a local Tree-sitter source syntax parse. This is **not** Dart type checking, Flutter analysis, widget execution, Android build or live device proof.
- `git diff --check` passes.
- Both Vercel config scopes explicitly skip this source branch; the executable branch-isolation test passes (2 tests). The earlier source-repair branch also remains skipped; approved mobile branch policy is preserved.
- Existing offline host/release suites: **16 passed**; source gate checker passed. No live deployment is verified.
- Twenty additional Flutter fixture cases are written: six session storage/concurrency/legacy cases, six draft store scope/identity/failure/corruption cases, and eight phone opt-in/remount/lost-reply/failure/revocation/discard cases. These cases are **NOT RUN** in this environment.
- Flutter setup remains blocked by the prior automatic approval-review rejection after unexpected cloud metadata access. The SDK was not rerun or worked around. The independent local syntax parser starts no Flutter SDK, cloud metadata request, server or inference.

## Required safe-environment acceptance

1. Review the source diff and local-retention choice, then run in an independently safe Flutter environment from `apps/frontend`:

   ```sh
   flutter pub get
   flutter analyze --no-fatal-infos --no-fatal-warnings
   flutter test test/arbor_session_test.dart test/grove_pending_turn_store_test.dart test/grove_private_text_page_test.dart test/grove_private_conversations_test.dart
   flutter test
   ```

   Record exact Flutter/Dart versions, source commit, analyzer/test counts and build results. Review shared `ArborSession` Text/Voice callers: storage errors now propagate instead of silently succeeding. Existing APK CI uses synthetic configuration; no deployed identity follows from a successful build.

2. Before real-device/private-host work, follow the existing handoff's source reconciliation, owner grants, receiver contract and protected compute gates. Keep all model/execution flags off in the meantime. Actual inference requires separate authorization and budget.
3. Test retention OFF: type private fixture text, leave/reopen, confirm no new local draft write or automatic POST. Then explicitly enable retention, wait for **Draft saved on this device**, leave/reopen and confirm exact text with zero sends. Kill before the debounce completes separately; no guarantee is claimed for that window.
4. With an approved bounded test provider, interrupt after pending persistence but before POST, after POST but before reply, and after server save but before phone readback. Record request ID, POST count and saved complete-pair count. Restart; require exact-ID recovery or matching-history closure, never automatic resend or new conversation.
5. Inject device write/clear failures, stale/missing history, malformed/newer draft records, and session/grant revocation while saving/sending. Require zero send on failed pre-send save/local session invalidation; preserve retry identity; do not clear on unverified history. Cancel discard and verify unchanged bytes; confirm discard and verify text erased, without falsely claiming the server request was cancelled.
6. Switch user, project, conversation, API origin and auth realm; verify foreign draft text never appears. Rotate token within the same authorized owner scope; require authorized history before recovery. Log out and log back in to verify the stated retention policy.
7. Adopt conversation, reset thread and clear selection; restart and read the single envelope. Force write failure and confirm the UI reports failure. Inspect legacy upgrade, unknown version, concurrent operations and shared Text/Voice scope behavior.

## Limits that remain

SharedPreferences is not encrypted storage, a multi-process transaction, physical secure erase or fsync proof. OS kill, cache eviction, app uninstall, disk errors and backup/restore must be tested; code cannot promise survival across them. Only one app isolate should write a scope. Existing legacy two-key records may already be partial; this pass does not invent the missing scope. Unknown records are held, not silently reset.

Retention OFF still cannot recover an in-flight message across process death. The six-pair server history window can omit an old pending completion; that remains uncertain and must not be reminted silently. The backend's expiring claim is not exactly-once model execution. Disposing the UI does not guarantee model cancellation. This pass does not fix the receiver version mismatch, connect relevant memory/canonical corrections/objectives, provide private Voice or write ARK checkpoints. Those gates and workstream owners remain unchanged.
