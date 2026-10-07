# One Arbor — trusted-host recovery inspection and blind-test gate

2026-10-07 · SOURCE-ONLY / NO LIVE ACTIVATION

## Exact ownership

- Parent source candidate: PR #338, head `032761d7d162c113c840765ffa62eb211b57ae50`.
- Parent inheritance: #336 (25 May routes), #335 (composed #331–334).
- Current source-only branch: `test/one-arbor-host-recovery-read-20261007`.
- This is a **supplement** to the One Arbor work ledger, not another canonical queue.

## Source finding and bounded repair

Existing `OneArborHostState` already projects Text/Voice/Annabelle identity
and corrections, but does not carry an authenticated user ID. A client-supplied
project ID or conversation ID is not evidence of owner authorization.
The existing durable `AgencyState` remains the source of status/goal/blocker.

The new pure `projectHostRecoveryRead`:
- requires exact host/project/conversation alignment and a valid schema;
- displays the existing `projectConversationRecovery` Known/Unknown/Next projection;
- **holds** on host-vs-agency goal divergence rather than choosing a summary by timestamp;
- preserves a protected blocker even when summaries diverge;
- refuses foreign/project/observer scope and cannot create a missing objective;
- keeps presentation/Annabelle mode separate from task state;
- does not write data, call tools, promote memory or authenticate users itself.

**Caller gate:** a real owner-authenticated server must verify scope and
host observations before invoking the projection. The ordinary ChatGPT
conversation and the local source tests do not prove that path is live.

## Prospective blind behavioral acceptance (PREPARED, NOT RUN)

Use the existing 14-case behavior/conversation holdout pack rather than
inventing a new private exemplar corpus. Before any model inference:

1. Freeze exact source SHA, model/provider/version, tokenizer, sampling settings,
   prompt budget, host identity, authorization scope, context revision, test seeds,
   scoring criteria, and a fresh unused holdout.
2. Use neutral synthetic startup fixtures as a baseline. Separately introduce
   privacy-reviewed real examples only through a mutually authorized evaluation
   process. Never copy private archive text into this public repo.
3. Randomize candidate-vs-baseline labels for the evaluator and counterbalance
   scenario order. Do not let the evaluator know which system produced each turn.
4. Evaluate the actual assistant response AND later follow-up, not keyword
   presence or copied personality slogans. Record full provenance and output IDs.
5. Every decision needs independent dimensions: goal continuity, context
   faithfulness, humor appropriateness, correction application, uncertainty,
   unprompted useful initiative, protected hard stops, and truthful completion.
6. Include negative controls: an unrelated/foreign project, a stale host summary,
   absent durable goal, contradiction about completion, duplicated failures, a
   revoked authority, and a missing source for a Glow/Noise option.
7. Compare correct hold/recovery against false-positive interruption. Detect
   an overactive recovery governor, not merely failure to catch a loop.
8. If any test involves a protected real model, device, external compute,
   persistent data, or human action, stop at that gate until independently
   authorized. No scoring of unrun tests as passing.

## Status matrix

| Capability | Source | Trusted host | Real blind behavior | Release |
| --- | --- | --- | --- | --- |
| Known/Unknown/Next | Built and tested in #338 | New read-only adapter in this draft; not wired into live server | Prepared, NOT RUN | Not released |
| Host-vs-agency goal reconciliation | New adapter and synthetic tests | No authenticated real readback | Prepared, NOT RUN | Not released |
| Glow vs Noise | Built/tested in control backend #338 | No source-verifying owner-priority caller | Prepared, NOT RUN | Not released |
| Text/Voice/Annabelle consistency | Existing host projection/test fixtures | Surface test fixtures only | Real voice/phone NOT RUN | Not released |

## Explicit safety boundaries

No production, main merge, Preview alias promotion, database migration,
external task execution, broad ARK enablement, identity/memory rewrite,
unapproved inference/training or media ingestion. The September 28 research
task and existing STOP canary remain untouched.

After source CI, the next genuine blocker is a scoped authenticated Preview
host read and reviewed-provenance input, **not** another advisory engine.
