# ONE ARBOR — Thread 2 independent source repair receipt

Continuation of the original 97-task inventory, not a replacement inventory.
Reference: `ONE_ARBOR_97_TASKS_15_ORDERED_WORK_GROUPS_20261007.md` and
`ONE_ARBOR_97_TASK_MASTER_G09_G11_20261007.docx` recovered from the owner's Library.

## Ownership and version

Parent: draft PR #368, `f17f5b5d346c887768f91c0a7668e618c718ceae`.
Isolated child: `fix/thread2-judgment-pack-integrity-20261009`.
PR #368 and the ARK owner branches #370/#372 remain unchanged.
No ARK files, runtime grants, deployment settings, protected STOP, model inference,
private data, migration, production deployment or merge were performed.
Existing branch-specific source-only exclusion was extended for this child;
review workflows and exact-blob manifest were updated only on the child.

## C04 / D13: received-case integrity

The supplied patch correctly detected a real blind-pack integrity gap, but its
unconditional public-content hash check rejected valid legacy conversation packs.
Repository test reproduced that incompatibility: the eighteen-case preparation
test failed with `acceptance_pack_mismatch`.

The repair recomputes the public-case SHA-256. The existing legacy full scoring
pack digest is accepted only when received cases exactly match the corresponding
checked-in public cases in their original order. This preserves server-selected
single-case inputs without changing the ARK contract or executor.
Generic unit fixtures now compute real content digests instead of placeholder
hashes. Regression checks reject edited public prompts, reordered cases, equal
forged digests, edited legacy cases and reordered legacy packs. All eighteen
legacy server-selected cases remain accepted. Tampered input stops before
provisioning, capture and provider callbacks.

Three new blind-boundary regression tests failed against the unchanged parent
runner (8 passed, 3 failed); the repaired tests pass. No model responses are
claimed: the integration provider is local and mocked. Recomputing a digest
does not authenticate arbitrary source provenance or establish model judgment.

## E03: strict Discovery Radar input boundary

Current source treated truthy non-boolean `crossProjectEnabled`, including the
string `"false"`, as an enabled flag. It also accepted malformed or duplicate
authorized project IDs. Two regression tests failed against the parent source.
The existing projection now rejects those inputs before ranking. No scorer,
crawler, grant, task scheduler or second discovery engine was added. Valid
boolean modes and existing owner/project denials are preserved. Trusted host
authentication remains required; this pure projection does not authenticate grants.

## Local verification

- Focused independent regression: 8 files / 60 tests passed.
- Backend TypeScript: passed.
- Control backend: 35 files / 154 tests passed; TypeScript build passed.
- Source fingerprint gate: 106 exact Git blobs passed; verifier unchanged.
- Full backend: 370 files / 2,179 passed / 2 skipped; focused tests overlap full totals.
  Exact-head hosted CI must still be read back separately.
- Local backend build: blocked by unavailable Google Fonts downloads for Geist
  and Geist Mono. This is not a source-green build claim and the ARK owner's
  layout/font preparation was not copied or edited.
- First unbounded local full run returned without a summary; it is not counted.
  Bounded-worker reruns produced complete summaries and are the local evidence.
- Dependency installation populated the locked packages but reported ignored
  build scripts. Its generated `allowBuilds` changes were discarded. Test and
  TypeScript commands used the installed binaries directly; no policy/lockfile
  changes are included.

## Continue / boundary reconciliation

| Existing tasks | Current disposition | Next genuine requirement |
| --- | --- | --- |
| C04, D13 | Integrity repair implemented; awaiting exact-head CI and separate behavioral acceptance | Authorized real-model blinded, unprimed comparisons and independent scoring |
| C01, C02, C03, C12 | Existing source implementations preserved; Group 06 projection regression passes | Trusted source-export parity / hosted lineage and behavioral proof |
| C05–C11, D15, D18 | Existing personality, correction and surface contracts retained; no second implementation | Fresh-session/model comparisons and approved device/voice acoustic proof |
| D01–D04, D12 | Existing Body/Felt-Life/pathway source and negative controls present | Trusted outcome provenance, causal host comparisons and durable reviewed outcomes |
| D05, D06, D09–D11, D17 | Existing decision/consequence HOLD and source gates retained | Authenticated host evidence and observed consequences; no invented outcome |
| E03 | Strict input repair implemented; awaiting exact-head CI | Trusted metadata/permission caller; source projection is not live discovery |
| E01, E02, E04, E07 | Existing Failure Radar, inbox and decision-history projections retained | Owner-scoped host callers and independently verified outcome references |
| E06 | Requires owner approval | Specific runtime, numeric spend budget and blind scoring |
| F01, F03, F05, F06, F08 | Existing private-host/replay/model artifact work retained | Real owner login, transcript exit/reopen, loaded runtime and source parity |
| F02, F04, F07, F09, F11 | External/owner dependency | Private host, model/training authorization, grants or physical voice device |
| F10, F12, F13, F15, G09, G12 | Existing Flutter source/tests retained | Actual installed-device acceptance; Workshop remains explicitly unsaved |
| F14 | Requires owner approval | Matching approved daytime art; no fabricated asset acceptance |
| G10, G11, G13, G14 | Existing scoped prototypes retained | Life UX / diary retention decisions, authorized records, qualified rights decisions |

ARK integration, release, permission, STOP and worker-safety work remain with
Thread 1. Pattern Hop research and Annabelle manuscript ownership remain separate.
No whole task is relabeled live-complete from source tests. Remaining requirements
in the reviewed independent lanes are host/device/model/author decisions, rather
than a reason to duplicate their already implemented source systems.

## Follow-through: real disk restart integration regression

`apps/arbor-control-backend/src/runtimeRestart.test.ts` exercises the actual
control runtime and JSON disk store with synthetic turns and a fake agency.
Each step creates a fresh runtime, state store and audit sink: save a behavioral
correction at an unfinished boundary; reopen and replay the committed turn
without another agency call; reopen across Text → Voice → Annabelle → Arbor,
including a fresh conversation; verify retained correction/goal/open work and
core identity before the subsystem overlay; verify a different project receives
none of that correction, open work or history.

Local focused runtime/store/restart suites: 3 files / 21 passed. Full control:
36 files / 155 passed; TypeScript build passed. Existing backend source is
unchanged by this follow-through. Composition now pins 107 blobs. Exact-head
CI must be recorded on the new commit separately from the preceding green head.
This proves sequential disk reopen and saved-turn replay in this local store,
not distributed exactly-once, real model personality or device/voice behavior.
No runtime implementation, new engine, grant or Thread 1 source was changed.

## B11 save-failure follow-through

A synthetic EIO fault at the local atomic rename confirms that failed commit leaves the previous disk bytes, unfinished work and behavioral correction intact, records neither the failed canonical turn nor its history, and cleans the temporary file. The same store accepts a subsequent retry and repeated commit without duplicate history. Actual file IO is used except the one injected rename fault. No runtime repair was needed.

Focused state/restart regressions: 5 passed. Full control source suite: 37 files, 156 passed. This is local persistence evidence, not distributed recovery, upstream bridge delivery, worker safety, live model or deployed acceptance. Exact-head CI is recorded in PR #373.

## E01/C04/D13 proactive fixture follow-through

Recovered the newer owning-thread handoff and 12-case proactive pack; open PR ownership readback found no competing source edit. Existing Failure Radar remains the read-only Decision Ancestry/review projections. It detects review warnings, not verified model initiative. Runtime files and other owner branches are untouched.

Ported the public-generation, host-only rubric and explicitly offline demo assignment as a separate P01–P12 fixture set. Two integration regressions exercise the existing acceptance runner: all 24 fake-provider arms capture without scoring/rubric leakage; edited prompts reject before provisioning, capture or inference. Existing 16 J cases and legacy pack are unchanged. No second engine/scorer or public endpoint.

Local focused Radar/proactive: 3 files / 30 passed. Broader behavior/runner/Radar: 9 files / 83 passed / 1 skipped; backend TypeScript passed. Original artifact pack/scorer: 20 passed. An initial broader invocation lacked the placeholder API environment required by an existing test; rerun with the normal CI placeholder passed, without real credentials or inference. Exact-head broad CI receipt is in #373.

Paid testing has general owner approval but is blocked by missing secure workspace credentials and unfinalized model/host/numeric spending configuration. No key creation, purchase or inference occurred. The exposed demo assignment is not a real blind trial; no fresh holdout or actual behavior score is claimed. D09 canonical manuscript selection and trusted hosted outcome acceptance remain external requirements; no authored philosophy is reconstructed here.

## Evaluation-purpose cue repair

The latest three-thread handoff identifies a public-label cue: J prompts announce BLIND JUDGMENT and P prompts announce UNPROMPTED-JUDGMENT. Removed only those wrapper labels, retaining synthetic fixture/data/authority disclaimers, scenario contents and private scoring criteria. P generation, assignment and rubric digests recomputed together; J generation/private plans derive their digest dynamically. The legacy conversation pack is unchanged.

Existing capture regressions now assert absence of evaluation-purpose labels in the actual outgoing fake-provider payload. Negative control against the prior wrappers: 2 failed / 3 passed. After repair: broader behavior/runner/Radar 9 files / 83 passed / 1 skipped; backend TypeScript passed. Source fingerprints refreshed using the unchanged verifier. Exact-head broad CI is recorded in #373. This removes a concrete cue; it does not establish full experimental blindness, a fresh holdout, unprimed behavior, raw-model comparison or any real model result. No paid inference, key, setting, grant, worker or deployment changes.
