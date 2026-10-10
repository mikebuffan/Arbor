# Grove-only source receipt — private conversation refresh scope

Date: October 9, 2026 PDT (GitHub commits October 10 UTC)
Owner: isolated Grove Flutter frontend lane
Draft PR: https://github.com/mikebuffan/Arbor/pull/410
Base: reviewed #408 `e3955aac7af8fdabf872aed1055f00efdd616ebf`

## Finding
The existing private Text `_discover()` verified a fresh authorized conversation list but only replaced `_choices` and `_loading`. When the current thread disappeared from that list, `_selected` and `_history` could retain previously rendered private transcript and Send controls. If exactly one different conversation became available, that previous history could remain visible while the replacement history request was pending.

## Isolated repair
- `apps/frontend/lib/pages/grove_private_text_page.dart`: on a verified fresh list that no longer selects the previous conversation, clear the old transcript, unsaved reply, selected conversation, pending-send UI fields, input text and draft status BEFORE opening the replacement.
- Preserve existing pending-turn save-before-refresh, generation cancellation and owner/project checking.
- `apps/frontend/test/grove_private_text_page_test.dart`: two new regression cases:
  1. an empty refreshed authorized list removes the old transcript and Send;
  2. a different authorized thread immediately removes old content while its own history is pending, without sending anything.
- `ops/grove/source-only-ignore.mjs`: allowlist ONLY this isolated branch as a source-only Vercel skip. Do not enable a test Preview exception.

## Verification status
- Fresh readback of exact branch files confirms source change, test declarations and deployment skip entry.
- Vercel project lookup observed one branch-triggered deployment record: terminal `CANCELED`, not a successful deployment.
- **Flutter widget tests: NOT RUN in this environment** (Flutter/Dart SDK absent).
- **CI on this Grove branch: NOT RUN**; no unverified success or on-device claim.
- No main merge, host auth/configuration, live database, LM, ARK, memory or background-worker changes.

## Next step
Use an authorized Flutter runner to analyze `lib/pages/grove_private_text_page.dart` and run `test/grove_private_text_page_test.dart`, plus the existing Grove auth/private scope regression suite. Then review any actual failures before bringing this isolated UI patch into the integrated candidate. Keep the original 97 task ledger unchanged.
