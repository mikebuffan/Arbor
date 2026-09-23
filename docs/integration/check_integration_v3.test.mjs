import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {auditIntegrationV3} from "./check_integration_v3.mjs";
const M=JSON.parse(readFileSync(new URL("./integration_manifest_v3.json",import.meta.url),"utf8"));
const copy=()=>JSON.parse(JSON.stringify(M));
const hit=(arr,x)=>arr.some(s=>s.includes(x));
const observations=()=>({
  main_sha:M.main_sha,
  prs:Object.fromEntries(M.prs.map(p=>[
    String(p.n),Object.fromEntries(["sha","base","base_sha","branch"].map(k=>[k,p[k]])),
  ])),
});
test("new snapshot is structurally sound but explicitly NOT current/live acceptance",()=>{
  const x=auditIntegrationV3(M);
  assert.deepEqual(x.errors,[]);
  assert.ok(hit(x.holds,"HISTORICAL_SNAPSHOT_ONLY"));
  assert.ok(hit(x.holds,"STALE_STACK_BASE #205 parent #194"));
  assert.ok(hit(x.holds,"OWNER_GATE"));
});
test("fresh exact observations suppress historical-only HOLD but do not authorize a release",()=>{
  const x=auditIntegrationV3(M,{observed:observations()});
  assert.deepEqual(x.errors,[]);
  assert.ok(!hit(x.holds,"HISTORICAL_SNAPSHOT_ONLY"));
  assert.ok(hit(x.holds,"OWNER_GATE"));
});
test("new #208 commit fails freshness instead of claiming old CI applies",()=>{
  const o=observations();o.prs["208"].sha="0".repeat(40);
  assert.ok(hit(auditIntegrationV3(M,{observed:o}).errors,"STALE PR #208 sha"));
});
test("main drift and missing research observation fail",()=>{
  const o=observations();o.main_sha="0".repeat(40);delete o.prs["207"];
  const x=auditIntegrationV3(M,{observed:o});
  assert.ok(hit(x.errors,"STALE main"));
  assert.ok(hit(x.errors,"UNOBSERVED PR #207"));
});
test("reject CI mirror as official release tip",()=>{
  const m=copy();m.prs.push({...m.prs.find(x=>x.n===194),n:195});
  assert.ok(hit(auditIntegrationV3(m).errors,"CI-only mirror"));
});
test("reject a fake green head or promoted live claim",()=>{
  const m=copy();m.proofs.find(x=>x.pr===206).sha="0".repeat(40);
  assert.ok(hit(auditIntegrationV3(m).errors,"invalid exact-head"));
  const n=copy();n.proofs[0].scope="deployed live";
  assert.ok(hit(auditIntegrationV3(n).errors,"CI scope cannot claim live"));
});
test("cross-product flow, owner gate and production-branch drift fail",()=>{
  const m=copy();m.forbidden_flows.pop();
  m.blocked_release=m.blocked_release.filter(x=>x!=="real_independent_lm_inference");
  m.old_grove_production_branch="main";
  const x=auditIntegrationV3(m);
  assert.ok(hit(x.errors,"forbidden data flow"));
  assert.ok(hit(x.errors,"owner gate"));
  assert.ok(hit(x.errors,"old Grove production branch"));
});
test("integration cannot touch research, Grove or shared backend",()=>{
  const x=auditIntegrationV3(M,{owner:"integration",paths:[
    "docs/integration/review.md"]});
  assert.deepEqual(x.errors,[]);
  for(const path of [
    "ops/research/pdf-sandbox/run.sh",
    "apps/frontend/lib/environment/grove_house_room.dart",
    "apps/backend/lib/grove/privateTranscriptStore.ts",
  ]){
    const out=auditIntegrationV3(M,{owner:"integration",paths:[path]});
    assert.ok(hit(out.errors,"COLLISION "+ "integration"));
  }
  const shared=auditIntegrationV3(M,{owner:"integration",
    paths:["apps/backend/lib/providers/openai.ts"]});
  assert.ok(hit(shared.errors,"SHARED_REVIEW"));
});
test("unsafe or unclaimed edits fail",()=>{
  for(const path of ["../secret","docs/integration/../secret",
    "docs\\integration\\x", "/docs/integration/x"]) {
    assert.ok(hit(auditIntegrationV3(M,{
      owner:"integration",paths:[path]}).errors,"unsafe proposed path"));
  }
  assert.ok(hit(auditIntegrationV3(M,{owner:"integration",
    paths:["apps/unknown/new.ts"]}).errors,"UNCLAIMED"));
});
