# One Arbor ARK spine continuation — 2026-10-06

Status: **source integration candidate only**. This branch is stacked on Grove bounded-writes
PR #259 and remains a draft. No merge to main, deployment, hosted migration, owner grant,
worker activation, paid inference, model activation, phone installation, archive ingestion or
production release is authorized by this document.

## Source custody

Parent accepted Grove continuation:
`1be2fbd464621cf3517ca87021a2b14eb63e7759` (PR #259).

This continuation branch:
`arbor/ark-spine-20261006` (draft PR #260).

Buffalo #249, the recovered Grove/phone lineage, correction writer, archive reader/transport,
Pattern Hop engines and existing ARK stores/runners are preserved. The chronological archive
reader commits `90a1535255afa28ade31129db8168c4d2569d1c5` and
`6a868f2864b1c88db6dbbc9bc190393c95cc5c18` are already ancestors of this branch;
no second archive engine was introduced.

The separate saved-research custody sibling #250 was selectively reconciled at the source-file
level. Its stale Vercel ignore configuration was **not** copied. The reconciled route now obeys
the newer One Arbor rule that ordinary API routes do not instantiate service-role clients:
privileged custody writes pass through a server-only broker that rechecks ownership and the
fresh server-owned project grant before acquiring the admin client.

## What this continuation finishes in source

### 1. Reviewed ARK handoff selector restored

The deterministic read-only selector from draft PR #125 is restored into the current source,
rather than reimplementing objective selection. It exposes persisted objective, checkpoint,
next action, blocker, task counts and completion-evidence presence while always reporting
`liveExecutionVerified:false`.

Ordinary Arbor uses:
`GET /api/ark/handoff?projectId=...`

Private Grove uses its own authenticated broker:
`GET /api/grove/ark/handoff?projectId=...`

The Grove phone handoff reader now selects the private broker path in private mode. A Grove
bearer never becomes a Firefly bearer.

### 2. Exact-conversation runtime-goal write prepared

`POST /api/grove/runtime-goal` is a narrow writer over the existing
`arbor_conversation_state` row. It creates no second goal store.

It:
- is default OFF behind `GROVE_PRIVATE_RUNTIME_GOAL_WRITE_ENABLED`;
- requires the existing owner/bridge/project/conversation checks;
- additionally requires an expiring exact conversation grant with purpose
  `conversation_runtime_goal`;
- accepts only `expectedCurrentGoal` and `goal`;
- uses optimistic conflict protection so stale writers cannot silently overwrite a newer state;
- preserves agency, corrections, behavior proof and all unrelated runtime fields;
- performs exact readback before claiming the goal was saved.

The proposed Grove-only grant DDL seeds no grant and is not applied.

### 3. Automatic Grove runtime continuity capture prepared and connected

Private Grove can now, when separately enabled and granted, capture the verified complete text
turn into the **existing** runtime-state continuity fields:
`lastMeaningfulUserTurn` and `lastMeaningfulArborTurn`.

This is not a second transcript system. The complete private transcript remains the fenced Grove
turn store.

The capture sequence is:
1. verify exact capture permission before inference;
2. obtain/restore the canonical private reply;
3. reauthorize private scope;
4. update only the exact conversation runtime row with optimistic conflict protection;
5. read back the captured state before returning success.

It is default OFF behind `GROVE_PRIVATE_RUNTIME_CAPTURE_ENABLED` and an independent expiring
grant with purpose `conversation_runtime_capture`.

Synthetic restart acceptance proves the captured goal and last verified user/Arbor turns enter
the existing One Arbor startup projection after reopening. No separate hydration engine exists.

### 4. Bounded Grove -> ARK objective execution prepared

`POST /api/grove/ark/run` reuses the existing ARK queue, task leases, executor registry,
checkpoint writer, completion verifier and objective-scoped worker. No new ARK engine or store
was created.

The first bridge is intentionally narrow:
- requires `GROVE_PRIVATE_ARK_EXECUTION_ENABLED=true`;
- also requires all existing ARK live/chat execution gates;
- requires an expiring Grove grant for the exact owner, project, conversation and objective,
  purpose `bounded_objective_execution`;
- runs only an already-existing objective containing exactly one
  `arbor.agency-tool` task;
- verifies the task's stored `payload.conversationId` equals the granted Grove conversation;
- revalidates owner/project/conversation/objective scope before and after execution;
- runs `maxTasks:1`;
- refuses to race a currently running task;
- replays terminal durable state without executing it again;
- bounds result readback and never claims that returned model/route text independently verifies
  objective completion.

Synthetic composition acceptance covers checkpoint handoff, one bounded run, terminal replay,
restart, and a completed objective returning no resurrected next action.

### 5. Saved research custody sibling reconciled

The manual saved-research handoff from #250 is present without replacing current Pattern Hop or
research engines. It preserves reported artifacts/sources/observations/contradictions/
uncertainty and its next question in one custody-only ARK checkpoint. It never labels those
observations as misconduct findings and never claims the research question itself was completed.

The privileged writer is now behind `savedResearchHandoffBroker.ts`; ordinary API source
contains no service-role client creation.

### 6. Phone retry recovery was already repaired

The current Grove phone source already contains `GrovePendingTurnStore`. It preserves an
uncertain request's original UUID/text in opt-in device-local storage across panel/app restart,
isolates it by auth/API/owner/project/conversation scope, and refuses silent overwrite. A
verified history pair can close the pending turn without another model request.

The older handoff statement that retry identity existed only in memory is superseded.

## Source verification contract

The dedicated `ARK spine integrated source acceptance` workflow runs on this stacked branch.
It performs:
- focused ARK-spine backend tests;
- the complete backend regression suite;
- optimized backend production build and standalone TypeScript;
- pinned Flutter analyzer;
- the full Flutter regression suite;
- a synthetic Grove Android APK build.

Provider/network access remains bounded by existing CI guards. A synthetic APK is not a signed
release and is never installed or published by this workflow.

## Deliberately NOT solved by changing public-source numbers

### Real LM / tokenizer / context budget

The private receiver/model package is intentionally not committed to GitHub. The reviewed real
fixture is larger than the receiver's historical 2,400-token ceiling. A proposed 8,192 ceiling
cannot be called verified until the exact foundation revision, tokenizer, adapter receipt and
private receiver are available together and the actual prompt is tokenized.

Do **not** raise a public constant and call the mismatch fixed. Identity/corrections must not be
silently dropped to fit.

### Exactly-once GPU generation

Grove already has a shared database claim, stable request UUID, fenced completion, canonical
reply readback and phone restart recovery. The receiver nonce cache/generation lock is still
process-local. If the host times out while GPU work continues, later lease recovery can still
cause duplicate generation.

Exactly-once inference requires the approved private receiver/shared runtime to participate in
a durable replay/lease policy. This source does not falsely claim that a longer timer fixes it.

### Pattern Hop remote STOP

Pattern Hop currently preserves source failures, supports a trusted AbortSignal and checks
cancellation between retrieval units. A deployed remote durable STOP and an atomic per-run
continuation lease remain separate research-extension work. They should be implemented with
real persistent run coordination, not a cosmetic endpoint that an in-flight runner could
overwrite.

## Remaining live / protected gates

1. Review PR #260 together with #259 and the preserved Buffalo chain.
2. Choose the actual private LM runtime and capture its hardware/runtime facts.
3. Privately verify exact foundation revision, tokenizer, adapter and receiver package; validate
   the real prompt/context budget.
4. Review the shared replay/rate/cost policy for real inference and embeddings.
5. Approve the exact Grove owner mapping, project/conversation and the separately scoped
   runtime-goal, runtime-capture, correction and ARK-objective grants.
6. Review/apply only the intended Grove proposals; run hosted PostgREST/RLS/permission denials.
7. Approve private host release/protection and a bounded inference budget.
8. Produce the final signed Grove package, record source/package/signer hashes, install on the
   physical phone and sign in.
9. Run one bounded real private turn and verify transcript plus runtime capture/readback across
   restart.
10. Run one separately approved exact ARK objective from Grove and verify task/checkpoint/result
    IDs after restart.
11. Judge actual multi-turn Arbor behavior: identity, humor, independent judgment, corrections,
    interruptions, open-loop resume and surface parity.
12. Continue the remaining archive **data transport** batches and later research/Annabelle/Voice
    live acceptance using this verified foundation.

The historical archive reader/source is reconciled, but source inclusion is not the same as
completing the remaining live archive transport batches.

## Hard boundary

No live account, grant, migration, model, worker, inference provider, archive import, phone
installation, deployment or main-branch merge is performed by this continuation. Those are
separate owner/release decisions with receipts.
