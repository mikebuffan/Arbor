# Execution batch 10: conversational and voice recovery

Parent draft PR #393 at `aebdae359e2978306757b20f456f301650aa8cd9`, tree `76d376d70a5be4e32de33b02083152437fe630e0`. Preserve independent PR #388. First inspection used GitHub while local environment was unavailable; resumed source execution when it returned. User requested small useful fixes to save later time. Source-only, no deployment or activation.

## Actual small repair

Both existing speech chunkers could cut a valid UTF-16 surrogate pair at their hard limit. Concatenating raw JavaScript strings masked the issue: encoding each request separately replaced each half, corrupting canonical speech text. Two regressions failed before repair. Move a cut back one code unit when it bisects a valid pair; preserve every character and existing size ceilings. The actual backend synthesis request-loop mock also verifies separately encoded provider inputs reconstruct the original text.

Validate exported custom limits as safe integers of at least two code units, preventing zero/negative/nonintegral/nonfinite limits from causing non-progress or invalid chunks. Default limits and punctuation preference remain. Minimum valid chunks preserve consecutive emoji. This preserves code points, not arbitrary grapheme clusters; no repair of malformed input Unicode is claimed.

## Six task outcomes

| ID | Executed/inspected | Remaining acceptance |
| --- | --- | --- |
| C05 context-sensitive humor | Existing humor policy and cross-surface tests pass: low energy alone does not suppress familiarity, jokes are optional, clarity precedes humor. Policy helper has no established production caller; existing behavior/calibration rules are separate. | Actual model timing and humor; no new policy wiring. |
| C09 voice/accent corrections | Acoustic routing, projection and source identity/cadence tests pass. Unicode transport repaired in actual backend and control speech paths. | Heard General American delivery and user acceptance; source instructions are not acoustic proof. |
| C11 exemplar blind tests | Existing public synthetic case pack, private rubric exclusion, capture runner and source calibration provenance retained. Mock provider outputs remain unscored. | Live blind conversational comparison and separately authorized private exemplar use. |
| D15 shorthand interpretation | Existing list/prompt/go, whichever-you-want, checkpoint return, negated stop/switch and protected blocker tests pass. | Hosted retention/reopen behavior across surfaces. |
| D18 retired downshift scripts | Existing Body System/cross-surface checks preserve bounded pacing while excluding automatic breathing/grounding/therapy scripts. No deletion of pacing behavior. | Actual generated conversational recovery. |
| F11 Grove Voice | Generic VoicePage/controller/chat/canonical-turn voice synthesis/playback path traced. Private standalone Grove mounts separately gated private Text and does not mount the legacy public VoicePage. | Private Grove voice remains a later gate; real microphone, interruption/playback and installed device acceptance. No new caller or enablement. |

## Verification

- Local backend: 171 distinct passing cases across 17 suites; focused added synthesis-loop rerun overlaps the earlier 170-case run. No real speech/model call; provider mocked, test fetch denied.
- Control source: 165 passed across 37 suites. An earlier unrestricted local run also discovered stale generated dist tests (322 total); use the source-only 165 count, not duplicate compiled checks as additional evidence.
- Backend TypeScript and control build pass. No Flutter/Dart SDK available; no attempted installation.
- Source pins and six deployment fences pass before publication. Exact-head remote CI recorded separately in PR/assessment after completion.

Result: useful speech transport and bounded chunk-limit repairs; Group 10 remains PARTIAL for live voice/model/device/private Grove acceptance. No new engine, route/caller, ingestion, paid speech/inference, live settings/grant/schema changes, deployment or main merge.
