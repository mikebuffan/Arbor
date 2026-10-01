# Evidence follow-up queue and resume integration

Implementation base: PR #218, commit `8f1eb745daaf2dbbeb3452cfed91902bc3743b34`.
Review branch: `feat/research-evidence-followups-20261001`.
Delivery target: October 19, 2026. The date is a target, not a guarantee of discoveries.

## What changed

The existing `research.casework` trusted packet seam accepts `followup_plan` packets.
The planner supplies a packet ID, not new support evidence or source authority.
Every nested evidence reference must appear in the packet envelope and the persisted
session evidence set. Scope must equal the session's owner/project.

Unresolved questions generate bounded, deterministic `research.pattern_hop` jobs.
Each job includes its source revision, basis evidence, completion condition,
disconfirming search, fallback, and explicit cost reservation. Its key depends on
owner/project scope, question ID, target ID, and source revision. A new session,
reworded question, or changed clock cannot manufacture a fresh retry.

The priority heuristic weighs expected decision change, uncertainty reduction,
independent-lineage opportunity, and acquisition effort. It schedules research;
it is neither a confidence score nor a finding-promotion rule.

The controller reads the latest persisted follow-up plan, skips existing durable
unit keys, and appends at most eight affordable units through the existing atomic
append RPC. It executes at most one bounded tick and does not self-schedule.
The scoped store separately retains the latest follow-up receipt beyond its
rolling recent-receipt window, so a long run cannot lose the unfinished frontier.

## Eight requested improvements

| Improvement | Source implementation / reuse |
| --- | --- |
| Automatic follow-up queue | `investigationFollowupPlan.ts`; `researchController.ts` atomic append path |
| Evidence-gain ranking | Explicit scheduling heuristic and stable ordering in the follow-up plan |
| Competing explanations | Existing `investigationCompetingTheories.ts`, prediction ledger and ordinary-explanation adversary reused; every new target includes a disconfirming search |
| Document neighborhoods | Bounded physical pages plus attachment locators within an identified document version; adjacency proves no connection |
| Separate clocks | Event, document, seizure, publication and discovery retain separate values, precision and evidence; unknown dates remain null |
| Coverage-aware gaps | Expectation references, collection scope, manifest-backed coverage and search completion required; no gap proves nonexistence |
| Traveling corrections | Direct and transitive affected findings receive explicit review-required records; cycles and unknown dependencies rejected; prior input preserved |
| Resume without circling | Attempt history, blocking reasons, stable job keys, source revision and retained full ranked frontier |

Corrections produce review requirements, not edits to live findings. The trusted
finding store and integrity gate still own promotion and any actual version update.
A completed search unit does not mean the originating question was answered.
Completion conditions require source comparison before any finding is promoted.

## Synthetic acceptance

The fixture mirrors difficult evidence shapes: two potentially duplicate message
slips, unknown event date despite known seizure/publication dates, a missing
original transcript, bounded scan neighbors, and a correction that affects a
chain of findings. It contains no real investigation documents or people.

Tests cover ranking, bounded jobs, unchanged-source retry prevention, restart
serialization, cumulative budgets, owner/project scope, nested evidence,
transitive correction review, missing coverage, dependency cycles, controller
append/settlement, and frontier retention outside recent history.

The existing competing-theory, prediction, discovery, integrity and restart
regressions remain in the research suite.

## Boundaries and next work

Source implementation is not deployed-host acceptance. The optional trusted
casework store remains unregistered in the live host. No live schema, external
PDF intake, worker activation, scheduler, private research record publication,
merge, or paid inference is part of this change.

This branch has explicit Vercel Git deployment-disable entries in root and backend
configuration, plus a backend ignored-build rule for this branch. Other branch
rules and cron definitions are preserved. Its source-only GitHub workflow runs
synthetic tests/builds and the existing disposable acceptance suites.

Next end-to-end gate: register a reviewed trusted packet store in the isolated
host; create one source-authorized evidence packet; execute the plan then a
bounded follow-up; independently read task/receipt/evidence state; interrupt and
resume; confirm no duplicate acquisition and preserve unanswered questions.
Only after that gate should repeated unattended runs be treated as verified.
