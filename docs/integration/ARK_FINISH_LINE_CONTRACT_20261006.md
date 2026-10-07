# ARK FINISH-LINE CONTRACT — 2026-10-06

Goal: make unfinished safe work continue without requiring repeated user prompts.

## Canonical behavior
You give Arbor one substantial objective and one go. Arbor/ARK retains the parent objective, executes runnable work, checkpoints, resumes, routes around blockers, and returns only for verified completion or a genuine human/protected boundary.

## 1. One canonical ARK
- pick one current One Arbor/ARK integration head;
- freeze it during acceptance;
- reconcile only demonstrated missing pieces;
- maintain one authoritative implementation/acceptance ledger.

## 2. Durable objectives
- every substantial request gets a durable parent objective;
- preserve completed/current/blocked/remaining work separately;
- survive turn, app, conversation, worker, and process boundaries;
- never replace an unfinished objective with acknowledgment text;
- explicit task-switch language is the normal supersession path.

## 3. Acknowledgment = continue
With unfinished work, these retain the objective and continue:
okay, ok, k, yes, yep, yeah, alright, all right, go, go ahead, continue, keep going, do it, finish it.
Test active, blocked-with-other-work, restart/new conversation, and checkpoint-owned action cases.

## 4. Internal checkpoints never become user turns
- completed child task -> next runnable child automatically;
- checkpoint -> resume automatically;
- worker ceiling -> checkpoint + reacquire;
- intermediate tool result -> continue parent objective;
- no status turn merely because an internal cycle ended.

## 5. Blocker routing
For blocked child task:
1. classify;
2. try bounded safe workaround;
3. checkpoint if still blocked;
4. execute independent runnable tasks;
5. revisit temporary blocker when appropriate;
6. return only if parent objective itself requires user action.

## 6. Legitimate human boundaries
Allowed reasons to return:
- irreversible/high-consequence approval;
- credential/consent action only user can perform;
- missing information only user possesses and cannot be retrieved/inferred;
- physical-device action;
- genuine external/provider restriction;
- meaningful ambiguous fork that changes intended outcome.

Not valid reasons by themselves:
- one child failed;
- CI is running;
- one provider is unavailable;
- first tool attempt failed;
- another independent task remains;
- an intermediate status exists;
- arbitrary loop/turn ceiling reached.

## 7. Durable task selection
- automatically choose next runnable task;
- honor dependencies;
- skip blocked tasks and revisit them;
- never repeat completed tasks;
- never silently drop unfinished tasks;
- never invent busywork just to appear autonomous;
- know when runnable work is genuinely exhausted.

## 8. Duplicate/race protection
- same action/request cannot execute twice;
- concurrent workers cannot own same action;
- stale worker cannot overwrite newer checkpoint;
- CAS conflict -> reread durable winner -> reconcile -> continue;
- crash after side effect before checkpoint -> verify effect before retry;
- STOP blocks stale later completion/checkpoint writes.

## 9. Completion semantics
Child success != parent completion.
Tool success != objective completion.
Submission != completion.
Deployment != live acceptance.
Imported != read != analyzed != reconciled.
Completion requires no unresolved required work and evidence tied to actual results.

## 10. Recovery torture
Interrupt:
- before execution;
- during tool call;
- after side effect;
- before checkpoint;
- after checkpoint;
- during task selection;
- during response generation;
- during durable save;
- during restart.
Acceptance question every time: did ARK resume the same parent objective without the user saying go again?

## 11. Cross-conversation continuity
- start in thread A;
- exit/reopen;
- continue from durable state;
- recover relevant unfinished project state in a fresh thread when appropriate;
- never resurrect completed objectives;
- never let stale thread overwrite newer corrections/decisions.

## 12. Arbor identity continuity
- load current self/correction layer before task overlays;
- agency must not collapse when user tone/verbosity changes;
- technical execution must preserve Arbor identity/humor/judgment;
- behavioral corrections persist across text/voice;
- acoustic voice failures do not mutate behavioral identity.

## 13. Real ARK worker connection
Prove:
submit permission -> queue -> worker claim -> execution -> durable result -> checkpoint -> automatic resume -> result retrieval -> idempotent replay -> STOP -> lease expiry/recovery -> owner/project isolation.

## 14. Acceptance torture objective
Give ARK a 20-item objective containing:
- easy tasks;
- dependency chains;
- failing tasks;
- temporary blockers;
- CI waits;
- unavailable provider;
- recoverable errors;
- one human-only gate;
- independent work after the gate.
User says go once. ARK must complete every runnable item, route around blockers, checkpoint/resume itself, and ask only at the genuine human gate.
Repeat after restart, fresh conversation, concurrent worker, failed save, STOP/resume.

## 15. Actual finish line
Agency is not finished until:
> User gives Arbor one substantial list and one go. Arbor/ARK works the entire runnable list without requiring another motivational poke.

If the user unnecessarily has to type go / okay means go / keep going / why did you stop during otherwise runnable work, acceptance failed.

Status vocabulary:
SOURCE_BUILT -> SOURCE_TESTED -> DEPLOYED -> CONNECTED -> LIVE_PROVEN -> USER_ACCEPTED.
Do not collapse these.
