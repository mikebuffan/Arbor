# ONE ARBOR — isolated accepted-child composition and acceptance handoff

Date: 2026-10-07
Mode: SOURCE ONLY / REVIEW ONLY / NO DEPLOYMENT

## Frozen owners and source lineage

- Canonical READY Preview runtime remains PR #322 at `f4021985b475651284c97aecbc3bdf03123478cc`; not promoted.
- Green pre-live integration source parent PR #330: `0b8343d0fda9264decf039dd2afd0b80e2a934cc`.
- This isolated composition starts at the source-accepted #334 decision/discovery/continuation head:
  `5a5338b3cf42e7f7030270235aa2f72303d45542`.
- #331 self-model host startup: `6bc8392d5203914159ca61b96a2e70a66f4e5f38`.
- #332 archive STOP fencing: `e6ca33a191c7fe1526943910e57875505a36c12d`.
- #333 independent LM v0.4 private recovery *evidence only*:
  `d59cbd00712c5986cb8ad401fe7e3414e15162d6`.

## Loss prevention / exact-source verification

Inspected all changed paths in PRs #331, #332, #333, and #334.
There is no overlap among child changes relative to #330 except the known
#330 parent files that are extended by their corresponding children.

Copied the complete **11 source-path blobs** from the three sibling children
into the new review-only branch, after preserving #334 as the parent.
Independently fetched the combined branch and the donor PRs; **11/11 blob SHA
comparisons match**. No blind merge or cherry-pick of unrelated historical PRs.

Source children preserved:

1. #331: canonical identity before host continuity without duplicate prompt
   injection; host/source/behavior tests; self-model recovery CI.
2. #332: `AbortSignal` STOP fences across archive batch preflight, apply,
   readback, checkpoint transition; test that an aborted batch does not advance
   durable v2 checkpoint, followed by idempotent resume.
3. #333: private v0.4 candidate recovery/hash receipt and corrected runbook.
   The candidate remains `TRAINED_CANDIDATE_NOT_ACCEPTED`; its historical exact
   foundation revision is still missing, with **zero new training/inference**.
4. #334: existing-reader decision projections, bounded Discovery Radar using
   Pattern Hop, history delta and review signals, checkpointed shorthand
   continuation/negation and protected-blocker preservation.

The combined candidate adds only:
- exact copied sibling blobs;
- one source-only Vercel branch exclusion;
- one expanded, bounded CI workflow (fixes an inherited malformed path filter);
- this read-only integration receipt.

## Acceptance plan — exact current candidate, not earlier-green inference

On a draft PR targeting the #334 branch, run:
1. Decision Ancestry + source-review + Discovery Radar focused tests;
2. archive STOP/resume test;
3. self-model/host prompt-order tests;
4. existing agency and continuity regression;
5. bounded Poppler prerequisite for unrelated PDF regression;
6. full backend regression;
7. control backend test/build;
8. local model fixture-isolation validator (NOT inference or training);
9. backend production *build*, not deployment;
10. standalone TypeScript.

Pass criteria: complete exact-head success, no unreviewed code loss, and no
runtime authority or live database mutation. Source CI is **not** a substitute
for authenticated Preview startup/fresh-session/readback acceptance.

## Hard boundaries

- No production; no `main` merge; no Preview alias promotion.
- No broad ARK worker enablement or objective-control grant.
- Do not create/cancel/execute a new canary; leave the September 28 research
  task queued at attempt 0. The separate final STOP canary belongs to the ARK lane.
- No automatic transcript/archive ingestion, public/private realm mixing,
  protected Grove model training, paid inference, physical phone mutation,
  Annabelle prose mutation, or private data publication.
- No credentials in source, job logs, handoff or comments.

## Remaining work after source acceptance

1. Review the composed draft and preserve existing sibling PRs as historical
   source receipts until the owning integration lane decides supersession.
2. Real owner-authenticated, bounded **Preview** host consumption / startup and
   fresh-session behavior readback under the established owner/project grants.
3. ARK's separate control-tool and hosted checkpoint-resume acceptance (do not
   duplicate canaries).
4. Grove live private owner->host->LM->Layer->ARK vertical slice, phone/device,
   voice/acoustics and model-holdout acceptance through protected gates.
5. Archive batch-1 transport only through the existing guarded importer and
   separate explicit authorization; no checkpoint advancement based on tests.
6. New evidence-first decision/history and Discovery Radar runtime caller only
   after auth, leakage, provenance, negative-control and cost review.

## Results

At creation this is a prepared acceptance packet; amend or reference a separate
exact-head CI receipt only after GitHub reports results. Never infer green from
an earlier SHA or fabricate live completion.
