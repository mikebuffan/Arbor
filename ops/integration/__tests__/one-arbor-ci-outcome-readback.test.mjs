import test from "node:test";
import assert from "node:assert/strict";
import { REVIEWED_CI_PAIR, verifyReviewedCIOutcomePair } from "../one-arbor-ci-outcome-readback.mjs";
const repo = "mikebuffan/Arbor";
const branch = "test/d10-e09-reviewed-outcome-recommendation-20261010";
const workflow = "One Arbor verified boundary receipt and chat source acceptance";
const guards = [
  "Verify 223 retained source fingerprints",
  "Verify review branch can never trigger Vercel build",
];
const green = [
  "Verify identity issuer negative and positive controls",
  "Type-check existing backend",
  "Full backend regression",
  "Production backend build",
];
function fixtures() {
  return REVIEWED_CI_PAIR.map(pin => ({
    run: {id:pin.id,head_sha:pin.sha,head_branch:branch,
      name:workflow,event:"push",status:"completed",
      conclusion:pin.kind==="red_focused_regression"?"failure":"success",
      html_url:"https://github.com/"+repo+"/actions/runs/"+pin.id,
      repository:{full_name:repo}},
    jobs: {jobs:[{name:"identity-security",status:"completed",
      conclusion:pin.kind==="red_focused_regression"?"failure":"success",
      steps:[...guards.map(name=>({name,status:"completed",conclusion:"success"})),
        ...green.map((name,i)=>({name,status:"completed",
          conclusion:pin.kind==="red_focused_regression"
            ? (i===0?"failure":"skipped"):"success"}))]}]},
  }));
}
function reader(rows) {
  return async url => {
    const item=rows.find(entry =>
      url.includes("/actions/runs/"+entry.run.id));
    if (!item) throw Error("unreviewed_run");
    if (url.endsWith("/jobs?per_page=100")) return item.jobs;
    if (url.endsWith("/actions/runs/"+item.run.id)) return item.run;
    throw Error("unreviewed_endpoint");
  };
}
test("pinned external red and green records remain only software-test evidence",async()=>{
 const result=await verifyReviewedCIOutcomePair(reader(fixtures()));
 assert.equal(result.source,"authenticated_github_actions_api");
 assert.deepEqual(result.outcomes.map(x=>x.status),
  ["red_focused_regression","green_source_acceptance"]);
 assert.deepEqual(result.outcomes.map(x=>x.runId),
  [38062557479,38062786120]);
 assert.equal(result.realModelDecisionProved,false);
 assert.equal(result.realWorldChoiceConsequenceProved,false);
 assert.equal(result.grantsExecution,false);
 assert.equal(result.changesTaskStatus,false);
});
test("CI result text alone cannot impersonate an exact commit or foreign repo",async()=>{
 for(const mutate of [
  rows=>{rows[0].run.head_sha="a".repeat(40);},
  rows=>{rows[0].run.repository.full_name="other/repo";},
  rows=>{rows[0].run.event="workflow_dispatch";},
  rows=>{rows[1].run.head_branch="main";},
  rows=>{rows[1].run.html_url="https://example.org/claimed";},
  rows=>{rows[1].run.status="in_progress";},
 ]) {
  const rows=fixtures();mutate(rows);
  await assert.rejects(verifyReviewedCIOutcomePair(reader(rows)),
    /one_arbor_external_outcome/);
 }
});
test("cancelled, incomplete or unproven failures cannot become reviewed negative evidence",async()=>{
 for(const mutate of [
  rows=>{rows[0].run.conclusion="cancelled";},
  rows=>{rows[0].jobs.jobs[0].conclusion="success";},
  rows=>{rows[0].jobs.jobs[0].steps.find(s=>s.name===green[0]).conclusion="skipped";},
  rows=>{rows[0].jobs.jobs=[];},
 ]) {
  const rows=fixtures();mutate(rows);
  await assert.rejects(verifyReviewedCIOutcomePair(reader(rows)),
    /one_arbor_external_outcome/);
 }
});
test("source safety and complete green backend gate are mandatory",async()=>{
 for(const mutate of [
  rows=>{rows[0].jobs.jobs[0].steps.find(s=>s.name===guards[0]).conclusion="skipped";},
  rows=>{rows[1].jobs.jobs[0].steps.find(s=>s.name===guards[1]).conclusion="failure";},
  rows=>{rows[1].run.conclusion="failure";},
  rows=>{rows[1].jobs.jobs[0].steps.find(s=>s.name==="Full backend regression").conclusion="skipped";},
 ]) {
  const rows=fixtures();mutate(rows);
  await assert.rejects(verifyReviewedCIOutcomePair(reader(rows)),
    /one_arbor_external_outcome/);
 }
});
test("missing external API access fails visibly, never creates synthetic proof",async()=>{
 await assert.rejects(verifyReviewedCIOutcomePair(null),
  /missing_authenticated_reader/);
 await assert.rejects(verifyReviewedCIOutcomePair(async()=>{throw Error("forbidden");}),
  /forbidden/);
});
