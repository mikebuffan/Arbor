import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { findUnlockReviews, validateUnlockView } from "../one-arbor-unlock-review.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const view = JSON.parse(readFileSync(resolve(root,
  "docs/integration/ONE_ARBOR_97_UNLOCK_REVIEW_VIEW_20261009.json"), "utf8"));
const evidence = (taskId,stage="source_verified",receipt="https://github.com/mikebuffan/Arbor/actions/runs/38026869361") =>
  ({taskId,stage,outcome:"verified",receipt});

test("all original 97 IDs occur exactly once in seven fixed groups", () => {
  assert.equal(validateUnlockView(view).size,97);
  assert.deepEqual(view.groups.map(g => g.ids.length),[11,7,3,17,27,11,21]);
});

test("verified A09 source repair flags only direct dependent reviews", () => {
  const result = findUnlockReviews(view,[evidence("A09")]);
  assert.deepEqual(result.flaggedTasks.map(x=>x.taskId),["A04","B11","B15","E07","F09"]);
  assert.equal(result.originalTaskCount,97);
  assert.deepEqual(result.changedTaskStatuses,[]);
  assert.deepEqual(result.actionsStarted,[]);
  assert.ok(result.flaggedTasks.every(x =>
    x.disposition==="REASSESS_ONLY" &&
    x.completionChanged===false && x.authorizationChanged===false &&
    x.mayAutoExecute===false && x.triggers[0].eventStage==="source_verified"));
});

test("source verification cannot impersonate host or device acceptance", () => {
  const sourceOnly=findUnlockReviews(view,[evidence("F03")]);
  assert.deepEqual(sourceOnly.flaggedTasks,[]);
  const accepted=findUnlockReviews(view,[evidence("F03","host_accepted")]);
  assert.ok(accepted.flaggedTasks.some(x=>x.taskId==="B10"));
  assert.ok(accepted.flaggedTasks.some(x=>x.taskId==="G03"));
  assert.ok(accepted.flaggedTasks.every(x=>x.mayAutoExecute===false));
});

test("duplicate receipts and reviewed receipt keys cannot create duplicate alerts", () => {
  const row=evidence("A09");
  const twice=findUnlockReviews(view,[row,row]);
  assert.equal(twice.verifiedEventsEvaluated,1);
  assert.equal(twice.flaggedTasks.length,5);
  const acknowledged=findUnlockReviews(view,[row],[row.receipt+"|A09|source_verified"]);
  assert.equal(acknowledged.verifiedEventsEvaluated,0);
  assert.deepEqual(acknowledged.flaggedTasks,[]);
});

test("unknown or unverified statuses never unlock anything", () => {
  for(const wrong of [
    {...evidence("A09"),outcome:"complete"},
    {...evidence("A09"),stage:"claimed"},
    {...evidence("A09"),taskId:"Z99"},
    {...evidence("A09"),receipt:"https://example.org/false"},
    {...evidence("A09"),receipt:""},
    {...evidence("A09"),outcome:true},
  ]) assert.throws(()=>findUnlockReviews(view,[wrong]),/one_arbor_unlock_review/);
});

test("false 97-task coverage and invented target IDs fail closed", () => {
  const clone=()=>structuredClone(view);
  const duplicate=clone();
  duplicate.groups[1].ids[0]=duplicate.groups[0].ids[0];
  assert.throws(()=>validateUnlockView(duplicate),/duplicate_task_id/);
  const missing=clone(); missing.groups[0].ids.pop();
  assert.throws(()=>validateUnlockView(missing),/not_exactly_97/);
  const unknown=clone(); unknown.reviewTriggers[0].to.push("Z99");
  assert.throws(()=>validateUnlockView(unknown),/invalid_trigger_target/);
});

test("no transitive unlocks without their own verified receipt", () => {
  const a=findUnlockReviews(view,[evidence("A09")]);
  assert.ok(a.flaggedTasks.some(x=>x.taskId==="F09"));
  assert.ok(!a.flaggedTasks.some(x=>x.taskId==="B16"));
  const b=findUnlockReviews(view,[evidence("F09","host_accepted")]);
  assert.ok(b.flaggedTasks.some(x=>x.taskId==="B16"));
});

test("multiple events combine review reasons without running protected work", () => {
  const result=findUnlockReviews(view,[
    evidence("A09"),evidence("A05","source_verified","https://github.com/mikebuffan/Arbor/actions/runs/38024259006")
  ]);
  const match=result.flaggedTasks.find(x=>x.taskId==="F09");
  assert.equal(match?.triggers.length,2);
  assert.equal(match?.mayAutoExecute,false);
  assert.deepEqual(result.actionsStarted,[]);
});
