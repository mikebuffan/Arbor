# Grove / Arbor LM generation idempotency contract — 2026-10-06

## Current guarantee

The current Grove transcript path provides **exactly-once durable logical completion per request ID**, not exactly-once model invocation.

Current proven sequence:

1. Grove receives a stable client retry `requestId`.
2. Transcript storage checks for a completed row.
3. If none exists, a database claim/lease is acquired.
4. Grove reauthorizes scope.
5. Grove reads bounded history.
6. Grove reauthorizes immediately before model disclosure.
7. Grove invokes the independent LM receiver.
8. Grove reauthorizes again.
9. The reply is committed with the DB-issued lease token.
10. A stale worker that lost its lease cannot create a second durable completion.
11. A retry of a completed request replays the canonical saved reply without another model call.

This is strong storage idempotency.

## Remaining duplicate-generation window

A lease can expire **after step 7 begins but before step 9 commits**.

A replacement worker may then:

- acquire a new transcript lease;
- see no completed transcript row;
- invoke the LM again.

The old worker is fenced from persistence, so only one reply becomes durable. But the model may have been invoked twice.

Therefore the truthful current guarantee is:

> **At-most-one durable completed transcript effect per request ID, with possible duplicate model computation during an unknown-outcome lease/restart window.**

Do not call this exactly-once generation.

## Existing LM receiver replay protection is not sufficient

The recovered r3 receiver uses:

- HMAC over exact request bytes;
- timestamp freshness;
- per-request random nonce;
- an in-process nonce replay cache;
- a generation lock.

That prevents reusing the same signed HTTP request inside one receiver process.

It does **not** provide generation idempotency because:

- Grove retries use a new HMAC nonce;
- the nonce cache is process-local;
- a receiver restart loses the cache;
- replicas do not share the cache;
- no durable generation result is keyed by Grove `requestId`.

## Proposed r4 generation contract

Do not retrofit this into the accepted r3 path silently. A future reviewed receiver contract should add a host-derived `generation_request_id` that is:

- the same UUID as the durable Grove transcript `requestId`;
- inside the signed request body;
- bound to owner + project + conversation;
- never browser-selected independently of the authenticated transcript request;
- persisted by the receiver before model invocation.

Receiver durable state needs a uniqueness key equivalent to:

`(owner_id, project_id, conversation_id, generation_request_id)`

and must retain:

- request-body fingerprint;
- status: `claimed | completed | indeterminate`;
- creation/update timestamps;
- response payload or response fingerprint when completed;
- runtime/model/adapter identity used for the generation.

## Receiver behavior

### First request

Atomically create `claimed` for the bound key.

If an existing record has a different signed-body fingerprint: reject as conflict.

If it is already `completed`: return the stored canonical response without model invocation.

If it is `claimed` by an active generation: return in-progress / retry-later without model invocation.

### Successful generation

Persist the canonical response as `completed` **before** returning HTTP success.

A lost HTTP acknowledgement then becomes a safe replay: the next identical request returns the stored response.

### Receiver crash during generation

This is the hard case.

If the receiver cannot prove whether the underlying model invocation completed, it must not start another generation and call the result “exactly once.”

It should mark/recover the generation as `indeterminate` and require one of:

1. a model backend that itself supports durable idempotent generation by the same key; or
2. explicit policy accepting **at-most-one committed response with possible duplicate computation**.

A local llama.cpp process does not automatically make model invocation exactly-once.

## Required torture matrix

| Case | Expected behavior |
|---|---|
| duplicate request before generation starts | one claim; no second invocation |
| duplicate while generation active | in-progress; no second invocation |
| response persisted, HTTP reply lost | replay stored response; no new invocation |
| Grove process restarts before receiver call | same generation ID; one invocation |
| Grove process restarts after receiver completion | replay completed receiver result |
| receiver restarts after durable completion | replay persisted result |
| receiver restarts after durable claim but before model call | recover claim; invoke once if state proves call never began |
| receiver dies while model call is in progress | indeterminate unless backend has its own idempotency proof |
| transcript lease expires while receiver is active | second Grove worker reuses same generation ID; receiver blocks duplicate |
| same request ID with changed prompt/body | hard conflict |
| revoked owner/project/conversation grant | no disclosure even if receiver has a completed reply; Grove reauthorization still controls return |
| model reply committed but Grove transcript write fails | receiver replay lets Grove recover same reply without regeneration |

## Acceptance vocabulary

Until the future receiver passes the matrix:

- **transcript logical idempotency:** proven;
- **duplicate durable reply suppression:** proven;
- **receiver same-HTTP-request replay rejection:** historically proven only in-process;
- **cross-restart generation-result replay:** not implemented;
- **exactly-once model invocation:** not proven.

The safest next implementation is a persistent generation-result ledger at the receiver boundary, keyed by the existing Grove retry UUID, without weakening Grove's authorization or transcript fencing.