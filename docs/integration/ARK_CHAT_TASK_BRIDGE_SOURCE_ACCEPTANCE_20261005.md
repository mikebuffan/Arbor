# ARK chat task bridge — source acceptance, 2026-10-05

Status: source candidate only. No merge, deployment, database write, application-permission grant, worker activation, or live submission was performed. The installed ARK connection still exposes its older read tools. This candidate builds on conversation-review commit `3cc67a44b019039f5c716cf875e14c5365e1cd86` and preserves the completed integration stack and correction/recall repairs.

## Implemented path

The MCP endpoint reuses the existing durable ARK agency bridge and enqueue RPC. It adds `get_ark_task_result` and, only with `ARBOR_ENABLE_ARK_MCP_SUBMISSION=true`, advertises `submit_ark_read_task`. Submission accepts one project UUID, one retry-stable request UUID and exactly one of `arbor_read_runtime_state` or `annabelle_read_workspace`; arbitrary arguments and other capabilities are rejected. Submission creates queue state, not worker execution. The receipt contains the durable objective/task IDs and actual stored status. Result retrieval preserves queued/running/blocked/failed/completed distinctions and bounds the serialized output to 20,000 characters, reporting truncation.

No new engine, table, migration, dependency, worker or model call was introduced. Existing executors do not provide general GitHub/Grove engineering automation. That capability remains separate work; this bridge must not be described as able to finish Grove by itself.

## Authorization and retry contract

Every request validates its bearer token through Supabase `getUser`. Submission requires fresh server-owned `app_metadata.arbor_ark_mcp` containing the verified OAuth `client_id` in `client_ids`, `ark.submit.read_tasks` in `permissions`, and the owned project UUID in `project_ids`. These are internal application grants, not custom OAuth scopes. Editable `user_metadata`, unvalidated JWT grants and another client's grant cannot authorize submission.

A user-scoped project ownership check precedes obtaining the privileged enqueue client. The existing service-role-only RPC independently enforces ownership and atomically records the objective, task and enqueue event. Result and task-ID readback use the user's bearer client and filter by user/project. The existing objective idempotency key is `mcp-read:<requestId>` within user/project; its request hash rejects changed payloads with the same ID. Clients must reuse that UUID after a timeout or unavailable readback, since the enqueue may already have succeeded. Submission rechecks the feature flag at invocation, including after tool discovery. Disabling submission leaves owned result reads available.

The profile reports effective submission access only when both the feature flag and validated grant exist. OAuth consent describes separately granted submission rather than promising universal read-only access. Approving OAuth alone never grants task submission or enables workers.

## Local verification

- 697 backend tests across 126 files passed with provider/network calls guarded by the existing offline test setup.
- Production Webpack build passed using offline placeholder configuration. Standalone TypeScript passed after the build. Existing middleware deprecation and Sentry instrumentation bundling warnings remain nonfatal.
- One earlier standalone TypeScript invocation overlapped the build deleting/regenerating `.next/types` and failed on missing generated files; the sequential rerun passed.
- New tests cover flag-off discovery, queue-write annotations, unsupported capabilities/arguments, client/project grants, forged grant sources, ownership-before-admin ordering, retry identity, unavailable readback, foreign results, bounded output and five durable task states.
- The new bridge tests mock queue/storage interactions. They do not establish deployed RPC behavior, live worker acceptance, consent behavior in a browser, rate limiting, or deployment alignment.

## At-home acceptance order

1. Review this candidate together with its inherited conversation/correction/recall commits. Preserve the original stacked draft PRs; do not replace them with an older deployed continuity snapshot.
2. Deploy the exact reviewed candidate to the intended preview using the established release process. Verify both backend source identity and deployed continuity before permitting writes. Production deployment is a separate gate.
3. Identify the actual connected OAuth client; grant only the intended owner/client/project using trusted administrator-controlled app metadata. Do not guess the client ID, edit user metadata, or expose a service-role credential. Keep submission disabled until this grant and release checks are complete.
4. Configure and verify a durable host-level submission rate limit before enabling the write tool. The bridge has bounded input/work but does not introduce a distributed rate limiter. A limit such as ten submissions per owner/client per minute is a proposed activation setting, not an implemented or verified guarantee.
5. Enable `ARBOR_ENABLE_ARK_MCP_SUBMISSION=true` for the reviewed preview. Refresh the ChatGPT connection's tool discovery. Expect six read tools plus one explicitly labeled queue-write tool. Confirm an ungranted client/project cannot submit and the profile accurately reports access.
6. Submit one runtime-state read with a recorded UUID. Repeat the same request and verify the same durable task/objective IDs; changing capability with that same UUID must fail the existing request-hash contract. Verify a foreign project/task is inaccessible. Queue receipt alone is not completion.
7. Exercise the existing approved objective-scoped worker canary procedure. Submission does not alter `ARBOR_ARK_ENABLE_LIVE_EXECUTION`, `ARBOR_ENABLE_ARK_EXECUTION` or existing worker cutover gates. Do not broadly enable background execution to make a queue receipt appear successful. Retrieve the actual completed task result and verify its owner/project and runtime source.
8. Disable the submission flag and verify further writes fail while owned results remain readable. Revoke the server-owned grant if needed; retain the queue and audit history.
9. Only after that round trip passes, reconcile the broader authorized ARK task list against actual executor capabilities. Grove engineering adapters, personality live acceptance, concurrent correction writes, failed-save recovery, editorial limits and deployed-context alignment remain open; this source change does not mark them complete.

## Authoritative platform references checked

- OpenAI MCP server and tool-planning documentation: https://developers.openai.com/plugins/build/mcp-server and https://developers.openai.com/plugins/plan/tools — tool annotations describe behavior; server authorization remains required.
- Supabase OAuth flows and token security: https://supabase.com/docs/guides/auth/oauth-server/oauth-flows and https://supabase.com/docs/guides/auth/oauth-server/token-security — OAuth identity scopes are not a substitute for application/client authorization.
