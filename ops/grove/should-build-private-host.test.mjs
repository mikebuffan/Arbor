import test from "node:test";
import assert from "node:assert/strict";
import {
  grovePrivateBuildDecision,
  OLD_PRODUCTION_BRANCH,
  REVIEW_PREVIEW_BRANCH,
} from "./should-build-private-host.mjs";

test("owner-confirmed older private production ref remains allowed", () => {
  assert.deepEqual(grovePrivateBuildDecision({
    VERCEL_ENV:"production",
    VERCEL_GIT_COMMIT_REF:OLD_PRODUCTION_BRANCH,
  }),{build:true,reason:"existing_private_production_branch"});
});
test("only current reviewed Grove preview branch builds", () => {
  assert.deepEqual(grovePrivateBuildDecision({
    VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:REVIEW_PREVIEW_BRANCH,
  }),{build:true,reason:"approved_preview_candidate_branch"});
});
test("research, main, public alpha, old CI-only and unknown stages SKIP", () => {
  for(const stage of ["preview","production","development"]){
    for(const branch of ["chore/research-ci-trigger-cleanup-handoff-20260923",
      "test/ark-research-persisted-session-simulation-20260923",
      "main","fix/public-alpha-exclude-grove-provider-20260922",
      "test/grove-private-end-to-end-composite-20260923"]) {
      assert.equal(grovePrivateBuildDecision({
        VERCEL_ENV:stage,VERCEL_GIT_COMMIT_REF:branch,
      }).build,false,stage+" "+branch);
    }
  }
});
test("even a Grove preview branch cannot silently become production", () => {
  assert.equal(grovePrivateBuildDecision({
    VERCEL_ENV:"production",VERCEL_GIT_COMMIT_REF:REVIEW_PREVIEW_BRANCH,
  }).build,false);
  assert.equal(grovePrivateBuildDecision({
    VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:OLD_PRODUCTION_BRANCH,
  }).build,false);
});
test("no matching stage/ref means skip, not unbounded all-branch preview", () => {
  for(const env of [{},{VERCEL_ENV:"preview"},
    {VERCEL_GIT_COMMIT_REF:REVIEW_PREVIEW_BRANCH},
    {VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:""}])
    assert.equal(grovePrivateBuildDecision(env).build,false);
});
