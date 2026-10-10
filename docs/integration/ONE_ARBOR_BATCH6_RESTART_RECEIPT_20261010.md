# Execution batch 6: continuity and restart

Parent: PR #389 at `45571e94a5508ee5992837caac5dd9cbd0d99e00`. Draft source child only; no main merge or deployment. This is execution batch 6, not the historical subject group 6.

## Repairs

- `mergeCorrections` previously counted a retry of the latest saved observation as new feedback. Matching family, kind, normalized value, source and instant now retain the maximum count. Later observations still increment. This is bounded latest-observation deduplication, not a historical event ledger.
- `beginRuntimeSession` previously used null-coalescing for meaningful turns, agency and behavior proof, resurrecting saved context even when the caller explicitly cleared it. Explicit null now clears; omitted inputs continue restoring prior context, matching `updateRuntimeSession`.
- Regressions first failed on both defects. Tests include serialized fresh-connection replay and explicit-clear persistence. These use synthetic storage, not a new OS-process or installed-device proof.

## All nine tasks reviewed

| ID | Source outcome | Remaining acceptance |
| --- | --- | --- |
| B10 startup hydration | Explicit clear repaired; omitted-state hydration and scoped fresh-connection tests pass. | Hosted fresh-session and installed close/reopen. |
| B11 correction recovery | Existing chat staging, retry, failure redaction, authorization and permanent readback paths traced and tested. | Deployed failure/recovery; runtime snapshot and completed-turn replay are not a single transaction. |
| C06 personality drift | Correction projection and acoustic/behavior separation tests pass. | Real-model drift recovery across surfaces. |
| C07 reorientation | Scoped read-only Known/Unknown/Next helper tests pass. No established non-test application caller found. | Caller integration and authenticated recovery. |
| C08 correction retention | Latest saved observation retry count repaired; serialized Text/Voice correction retention passes. | Historical-event deduplication is not proved; installed-device and later model retention. |
| D14 Time Core | Existing actual prompt caller and trusted instant/IANA zone/DST/offset tests pass. | Hosted timezone/date acceptance. |
| D16 contextual reference | Reference/negation/shorthand tests pass. No established non-test application caller found. | Caller integration and later-turn application acceptance. |
| F10 Android/offline | Actual scoped opt-in draft/history storage, generation invalidation, persistence failure and uncertain-send guards inspected. | No Flutter/Dart runtime here; installed offline/reconnect/background/force-close/reopen. |
| C10 Text–Voice–Text | Shared runtime/startup and surface projection source tests pass. | Installed thread/microphone/playback round trip and model behavior. |

## Validation

- 291 backend source tests passed, 1 skipped across 30 suites: runtime, continuity, language, behavior and actual mocked chat correction durability.
- Backend TypeScript no-emit passed.
- Local tests deny external networking and used only a fake provider key. Initial import setup without that placeholder failed; rerun with the CI placeholder passed. No provider call or live database write was performed.
- 190 composed-source pins passed. All six deployment fence tests passed. Remote full CI is recorded in the PR/assessment after it completes.

Result: source repairs complete and reviewable; batch remains partial at the listed integration, hosted/model and installed-device boundaries. No unsafe caller was invented to erase an integration gap. PR #388 remains separate.
