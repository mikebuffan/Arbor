# Epstein public-records research — source, privacy & operator controls v7

Date: 2026-10-01

Parent integration rehearsal: PR #230 / branch `feat/epstein-preview-integration-v6-20261001`.

## Bounded public-source capture authorization

The capture authorization contract validates:
- HTTPS-only URLs;
- no URL credentials;
- exact expected origin host;
- separately supplied human authorization reference;
- source class;
- byte/page/wall-clock bounds;
- bounded redirect host allowlist.

Output is `authorized_candidate_not_fetched`.

The derived capture plan is `plan_ready_not_executed` with `executionRequested:false`.

No network fetcher is created or invoked by v7.

## Privacy/private-identifier gate

Literal identifiers such as phone/email/address/account/document identifiers become privacy candidates with status:
`hold_for_human_privacy_classification`.

The system does not automatically classify a person as:
- victim;
- private person;
- public official;
- criminal;
- safe to publish.

A human review receipt may:
- allow a public-record identifier;
- withhold a private identifier;
- escalate a sensitive subject;
- mark the candidate not PII.

Without a human decision, release disposition remains HOLD.

## Worker/operator liveness

Worker state is derived only from:
- last heartbeat time;
- lease expiry;
- claimed unit identity;
- observation time.

A UI label saying `running` is not sufficient.

Possible receipts:
- active_lease
- recent_heartbeat_no_active_lease
- expired_or_stale
- unknown

This directly prevents stale UI from being reported as worker liveness.

## Scheduler gate

V7 scheduler state is structurally default-OFF:
- enabled=false
- cadence=null
- execution_target=null
- authorization_ref=null

The pure activation evaluator always returns `allowed:false`.
Even if hypothetical future prerequisites are supplied, v7 returns
`v7_scheduler_activation_not_implemented`.

No cron/scheduler is created.

## Proposed persistence

The v7 SQL proposal adds:
- capture authorization receipts;
- privacy candidates;
- append-only human privacy decisions;
- heartbeat/lease liveness receipts;
- owner-readable, structurally disabled scheduler state.

Raw capture/privacy material remains service-role-only.

Authenticated owners may read only their own liveness and scheduler status.

## Disposable acceptance

CI proves:
- capture authorizations are append-only;
- privacy decisions cannot be rewritten;
- privacy candidates remain HOLD;
- authenticated clients cannot read raw capture/privacy tables;
- worker liveness receipts are owner-isolated;
- scheduler state is owner-isolated;
- attempts to enable/populate scheduler execution fields fail at a CHECK constraint.

## Not performed

- no Firefly ARK Preview SQL application;
- no source fetch;
- no Epstein/EFTA capture;
- no scheduler/cron creation;
- no worker enablement;
- no automatic victim/private-person classification;
- no publication/release;
- no production Firefly/Grove mutation.
