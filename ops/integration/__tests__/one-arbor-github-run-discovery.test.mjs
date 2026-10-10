import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverVerifiedUnlockReviews, validateRunBindings, githubReadOnlyJson } from "../one-arbor-github-run-discovery.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const view=JSON.parse(readFileSync(resolve(root,"docs/integration/ONE_ARBOR_97_UNLOCK_REVIEW_VIEW_20261009.json"),"utf8"));
const reviewedDoc=JSON.parse(readFileSync(resolve(root,"docs/integration/ONE_ARBOR_GITHUB_SOURCE_RECEIPT_BINDINGS_20261009.json"),"utf8"));
// Historical three-source characterization fixtures remain unchanged.
const doc={...reviewedDoc,bindings:reviewedDoc.bindings.slice(0,3)};
const source=doc.bindings[0];
const run={
  id:38026869361,status:"completed",conclusion:"success",event:"push",
  head_branch:source.branch,head_sha:source.headSha,name:source.workflow,
  repository:{full_name:"mikebuffan/Arbor"},
  html_url:"https://github.com/mikebuffan/Arbor/actions/runs/38026869361",
};
const completeJob={
  name:source.job,status:"completed",conclusion:"success",
  steps:source.requiredSteps.map(name=>({name,status:"completed",conclusion:"success"})),
};
const mock=(runs=[run],jobs=[completeJob])=>async url=> {
  if(url.includes("/jobs?"))return {jobs};
  if(url.includes("/actions/runs?"))return {workflow_runs:runs};
  throw Error("not_allowlisted_request");
};

test("reviewed task bindings retain exact original IDs and source gates",()=>{
  assert.equal(validateRunBindings(view,doc).length,3);
  assert.deepEqual(source.taskIds,["A09"]);
});
test("new reviewed source bindings require entire correct source-workflow gate",()=>{
  assert.equal(validateRunBindings(view,reviewedDoc).length,6);
  assert.deepEqual(reviewedDoc.bindings.slice(3).map(x=>x.taskIds),[["B15"],["D12"],["D09"]]);
  assert.deepEqual(reviewedDoc.bindings.slice(3).map(x=>x.job),
    ["identity-security","verification-source","verification-source"]);
  for(const mutate of [
    x=>{x.bindings[5].requiredSteps=x.bindings[5].requiredSteps.filter(s=>s!=="Enforce source-only Vercel branches");},
    x=>{x.bindings[4].requiredSteps=["Backend TypeScript","Full backend regression","Backend build (CI only)"];},
    x=>{x.bindings[4].taskIds=["D09","D09"];},
    x=>{x.bindings[3].stage="host_accepted";},
  ]){
    const corrupted=structuredClone(reviewedDoc);mutate(corrupted);
    assert.throws(()=>validateRunBindings(view,corrupted),/one_arbor_github_receipt/);
  }
});

test("all six source-only exact-head receipts flag new downstream reviews, never execution",async()=>{
  const confirmedRuns=[
    38026869361,38028889757,38029454170,
    38031249508,38038583653,38040681076,
  ];
  const rows=reviewedDoc.bindings.map((binding,index)=>({
    binding,id:confirmedRuns[index],
    run:{
      ...run,
      id:confirmedRuns[index],
      head_branch:binding.branch,
      head_sha:binding.headSha,
      name:binding.workflow,
      html_url:"https://github.com/mikebuffan/Arbor/actions/runs/"+confirmedRuns[index],
    },
  }));
  const read=async url=>{
    const row=rows.find(({binding})=>url.includes(encodeURIComponent(binding.branch)));
    if(!row)throw Error("unreviewed_branch");
    if(url.includes("/jobs?"))return {jobs:[{
      name:row.binding.job,status:"completed",conclusion:"success",
      steps:row.binding.requiredSteps.map(name=>({
        name,status:"completed",conclusion:"success",
      })),
    }]};
    if(url.includes("/actions/runs?"))return {workflow_runs:[row.run]};
    throw Error("unknown_github_path");
  };
  const result=await discoverVerifiedUnlockReviews(view,reviewedDoc,read);
  assert.equal(result.checkedBindings,6);
  assert.equal(result.verifiedReceiptEvents,7);
  assert.deepEqual(result.notYetVerified,[]);
  assert.deepEqual(result.review.flaggedTasks.map(x=>x.taskId),[
    "A04","F09","B11","C06","C08","C10","B15","B16",
    "C04","D05","D09","D10","D11","D12","D13","E07","E09","C09",
  ]);
  assert.deepEqual(result.review.changedTaskStatuses,[]);
  assert.deepEqual(result.review.actionsStarted,[]);
  assert.ok(result.review.flaggedTasks.every(x=>
    x.disposition==="REASSESS_ONLY" && !x.completionChanged &&
    !x.authorizationChanged && !x.mayAutoExecute));
});

test("authentic-looking exact-head green source job emits only reassessment flags",async()=>{
  const result=await discoverVerifiedUnlockReviews(view,doc,mock());
  assert.equal(result.checkedBindings,3);
  assert.equal(result.verifiedReceiptEvents,1);
  assert.deepEqual(result.review.flaggedTasks.map(x=>x.taskId),["A04","F09","B11","B15","E07"]);
  assert.equal(result.review.actionsStarted.length,0);
  assert.equal(result.review.changedTaskStatuses.length,0);
  assert.ok(result.review.flaggedTasks.every(x=>x.mayAutoExecute===false && x.authorizationChanged===false));
});
test("two genuine exact-head runs independently flag new B11/E07 dependency reviews",async()=>{
  const bound=doc.bindings[1];
  assert.deepEqual(bound.taskIds,["B11","E07"]);
  const second={
    ...run, id:38028889757, head_branch:bound.branch, head_sha:bound.headSha,
    html_url:"https://github.com/mikebuffan/Arbor/actions/runs/38028889757",
  };
  const read=async(url)=>{
    if(url.includes("/jobs?"))return {jobs:[completeJob]};
    if(url.includes(encodeURIComponent(bound.branch)))return {workflow_runs:[second]};
    if(url.includes("/actions/runs?"))return {workflow_runs:[run]};
    throw Error("unknown_github_path");
  };
  const result=await discoverVerifiedUnlockReviews(view,doc,read);
  assert.equal(result.verifiedReceiptEvents,3);
  assert.equal(result.notYetVerified.length,1);
  assert.deepEqual(result.review.flaggedTasks.map(x=>x.taskId),[
    "A04","F09","B11","C06","C08","B15","D12","E07",
  ]);
  assert.deepEqual(result.review.actionsStarted,[]);
  assert.ok(result.review.flaggedTasks.every(x=>
    x.disposition==="REASSESS_ONLY" && x.mayAutoExecute===false && x.completionChanged===false));
});
test("third verified C08 source receipt expands review flags without promoting task status",async()=>{
  const one=doc.bindings[0],two=doc.bindings[1],three=doc.bindings[2];
  assert.deepEqual(three.taskIds,["C08"]);
  const values=[
    {binding:one,id:38026869361},
    {binding:two,id:38028889757},
    {binding:three,id:38029454170},
  ];
  const read=async(url)=>{
    if(url.includes("/jobs?"))return {jobs:[completeJob]};
    const match=values.find(x=>url.includes(encodeURIComponent(x.binding.branch)));
    if(!match)throw Error("unknown_github_branch");
    return {workflow_runs:[{
      ...run,id:match.id,head_branch:match.binding.branch,head_sha:match.binding.headSha,
      html_url:"https://github.com/mikebuffan/Arbor/actions/runs/"+match.id,
    }]};
  };
  const result=await discoverVerifiedUnlockReviews(view,doc,read);
  assert.equal(result.checkedBindings,3);
  assert.equal(result.verifiedReceiptEvents,4);
  assert.deepEqual(result.notYetVerified,[]);
  assert.deepEqual(result.review.flaggedTasks.map(x=>x.taskId),[
    "A04","F09","B11","C06","C08","C10","B15","D12","E07","C09",
  ]);
  assert.ok(result.review.flaggedTasks.every(x=>
    x.disposition==="REASSESS_ONLY" && !x.mayAutoExecute && !x.completionChanged));
  assert.deepEqual(result.review.actionsStarted,[]);
});
test("does not promote a successful job when required safety steps were skipped",async()=>{
  const changed=structuredClone(completeJob);
  changed.steps.find(s=>s.name==="Full backend regression").conclusion="skipped";
  const result=await discoverVerifiedUnlockReviews(view,doc,mock([run],[changed]));
  assert.equal(result.verifiedReceiptEvents,0);
  assert.equal(result.notYetVerified.length,3);
  assert.deepEqual(result.review.flaggedTasks,[]);
});
test("rejects stale heads, wrong branches, and other repositories",async()=>{
  for(const wrong of [
    {...run,head_sha:"a".repeat(40)},
    {...run,head_branch:"main"},
    {...run,repository:{full_name:"foreign/Arbor"}},
    {...run,event:"workflow_dispatch"},
    {...run,status:"in_progress"},
    {...run,conclusion:"failure"},
    {...run,name:"Unreviewed workflow"},
    {...run,html_url:"https://example.org/forged"},
  ]) {
    const result=await discoverVerifiedUnlockReviews(view,doc,mock([wrong]));
    assert.equal(result.verifiedReceiptEvents,0);
  }
});
test("missing GitHub permissions or malformed responses fail visibly, never become zero tasks",async()=>{
  await assert.rejects(
    discoverVerifiedUnlockReviews(view,doc,async()=>({error:"forbidden"})),
    /invalid_github_run_response/,
  );
  await assert.rejects(
    discoverVerifiedUnlockReviews(view,doc,async()=>{throw Error("forbidden");}),
    /forbidden/,
  );
});
test("do not allow unreviewed mappings to invent task IDs, fake host acceptance, or bypass tests",()=>{
  for(const mutate of [
    x=>{x.bindings[0].taskIds=["Z99"];},
    x=>{x.bindings[0].stage="host_accepted";},
    x=>{x.bindings[0].headSha="none";},
    x=>{x.bindings[0].requiredSteps=["Production backend build"];},
    x=>{x.bindings[0].taskIds=["A09","A09"];},
  ]) {
    const bad=structuredClone(doc);mutate(bad);
    assert.throws(()=>validateRunBindings(view,bad),/one_arbor_github_receipt/);
  }
});
test("duplicate run entries and already acknowledged receipt keys do not double flag",async()=>{
  const result=await discoverVerifiedUnlockReviews(view,doc,mock([run,run]));
  assert.equal(result.verifiedReceiptEvents,1);
  const acknowledged=await discoverVerifiedUnlockReviews(view,doc,mock(),{
    processedEventKeys:[run.html_url+"|A09|source_verified"],
  });
  assert.equal(acknowledged.review.flaggedTasks.length,0);
});
test("read-only GitHub adapter rejects missing token and unrelated endpoints before network",async()=>{
  await assert.rejects(githubReadOnlyJson("https://api.github.com/repos/mikebuffan/Arbor/actions/runs",""),
    /missing_read_only_github_token/);
  await assert.rejects(githubReadOnlyJson("https://example.org/action","synthetic"),
    /unexpected_github_endpoint/);
});
