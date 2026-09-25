#!/usr/bin/env node
/** OFFLINE integration audit, not a live GitHub fetch or release authorization.
 * Optional observed JSON must be independently freshly fetched from GitHub.
 * A PASS for schema integrity NEVER means Grove is live or mergeable.
 */
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
const SHA=/^[a-f0-9]{40}$/;
const REQUIRED_GATES=["live_grove_project_id_access","live_privacy_migration",
 "real_owner_project_grants","real_independent_lm_inference",
 "physical_samsung_acceptance","real_ark_worker_receipts",
 "research_source_approval","public_multi_user_acceptance",
 "live_retry_claim_migration"];
const FLOWS=["private_grove->public_arbor_app",
 "public_arbor_app->private_grove","private_grove->research_engine",
 "research_engine->private_grove"];
const OWNERS=["integration","grove","ark_layer","public","research"];
export function auditIntegrationV3(m,{observed=null,owner=null,paths=[]}={}){
  const errors=[],holds=[];
  const fail=(s)=>errors.push(s),hold=(s)=>holds.push(s);
  if(m?.schema_version!==3||m.repository!=="mikebuffan/Arbor")fail("invalid manifest version or repository");
  if(!SHA.test(m.main_sha??""))fail("invalid pinned main SHA");
  if(JSON.stringify(m.products)!==JSON.stringify(["private_grove","public_arbor_app","research_engine"]))
    fail("cross-product identities cannot collapse");
  const prs=m.prs??[],byN=new Map(),byBranch=new Map();
  for(const p of prs){
    if(!Number.isInteger(p.n)||byN.has(p.n))fail("duplicate/invalid PR");
    byN.set(p.n,p);
    if(!OWNERS.includes(p.lane))fail("invalid owner PR "+p.n);
    if(!SHA.test(p.sha??"")||!SHA.test(p.base_sha??""))fail("unverified SHA PR "+p.n);
    if(!p.branch||byBranch.has(p.branch))fail("duplicate branch PR "+p.n);
    byBranch.set(p.branch,p);
    if(!p.base)fail("missing base PR "+p.n);
  }
  for(const n of [159,160,193,194,196,201,205,206,207,208,209,210])
    if(!byN.has(n))fail("missing lane PR #"+n);
  for(const n of [195,197,204]){
    if(!m.no_merge?.includes(n))fail("missing CI-only DO NOT MERGE #"+n);
    if(byN.has(n))fail("CI-only mirror cannot be an active lane PR #"+n);
  }
  const expectedEdges=[[194,193],[205,194],[206,205],[208,206],[209,208],[210,209],[207,201]];
  for(const [child,parent] of expectedEdges){
    const c=byN.get(child),p=byN.get(parent);
    if(c&&p){
      if(c.base!==p.branch)fail("wrong stack branch #"+child);
      if(c.base_sha!==p.sha)hold("STALE_STACK_BASE #"+child+" parent #"+parent);
    }
  }
  if(m.old_grove_production_branch!=="deploy/grove-private-api-20260921")
    fail("old Grove production branch changed without a release");
  for(const x of REQUIRED_GATES)if(!m.blocked_release?.includes(x))fail("missing owner gate "+x);
  for(const x of FLOWS)if(!m.forbidden_flows?.includes(x))fail("missing forbidden data flow "+x);
  if(m.source_ready_for_production!==false)fail("unsupported production ready assertion");
  for(const proof of m.proofs??[]){
    const p=byN.get(proof.pr);
    if(!p||proof.sha!==p.sha||!Number.isInteger(proof.run)||proof.run<1||
       proof.level!=="exact_head_ci"||!proof.scope)
      fail("invalid exact-head source proof #"+proof.pr);
    if(/production|deployed live|real model|owner accepted/i.test(proof.scope))
      fail("CI scope cannot claim live proof #"+proof.pr);
  }
  if(!m.proofs?.some(x=>x.pr===206))fail("missing combined Grove source proof");
  const owned=m.owner_paths??{};
  for(const x of OWNERS)if(!Array.isArray(owned[x])||!owned[x].length)
    fail("missing path owner "+x);
  const pathOwner=new Map();
  for(const [lane,prefixes] of Object.entries(owned))
    for(const prefix of prefixes){
      if(typeof prefix!=="string"||!prefix)fail("invalid owner path");
      if(pathOwner.has(prefix))fail("duplicate owned path "+prefix);
      pathOwner.set(prefix,lane);
    }
  const entries=[...pathOwner];
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const [a,ao]=entries[i],[b,bo]=entries[j];
    if(ao!==bo&&(a.startsWith(b)||b.startsWith(a)))
      fail("overlap "+a+" "+b);
  }
  if((owner===null)!==(paths.length===0))fail("owner and proposed paths required together");
  if(owner!==null&&!OWNERS.includes(owner))fail("invalid change owner");
  for(const path of paths){
    if(typeof path!=="string"||!path||path.startsWith("/")||path.includes("\\")||
       path.split("/").some(x=>!x||x==="."||x==="..")){
      fail("unsafe proposed path");continue;
    }
    if(m.shared_review_paths?.some(x=>x.endsWith("/")?
      path.startsWith(x):path===x))fail("SHARED_REVIEW "+path);
    const matched=entries.filter(([p])=>path.startsWith(p));
    if(!matched.length)fail("UNCLAIMED "+path);
    else if(matched.some(([,lane])=>lane!==owner))
      fail("COLLISION "+owner+" "+path);
  }
  if(observed===null)hold("HISTORICAL_SNAPSHOT_ONLY: supply newly fetched GitHub observations");
  else{
    if(observed.main_sha!==m.main_sha)fail("STALE main SHA");
    for(const p of prs){
      const x=observed.prs?.[String(p.n)];
      if(!x)fail("UNOBSERVED PR #"+p.n);
      else for(const k of ["sha","base","base_sha","branch"])
        if(x[k]!==p[k])fail("STALE PR #"+p.n+" "+k);
    }
  }
  hold("OWNER_GATE: separate live permissions, model and device acceptance required");
  return {errors,holds};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2),file=args.shift();
  const idx=args.indexOf("--observed");
  let observed=null;
  if(idx>=0&&args[idx+1]){
    observed=JSON.parse(readFileSync(args[idx+1],"utf8"));
    args.splice(idx,2);
  }
  if(!file||args.length){console.error("Usage: check_integration_v3.mjs manifest.json [--observed freshly-fetched.json]");process.exitCode=2}
  else{
    try{
      const out=auditIntegrationV3(JSON.parse(readFileSync(file,"utf8")),{observed});
      for(const line of out.errors)console.error("FAIL:",line);
      for(const line of out.holds)console.log("HOLD:",line);
      if(!out.errors.length)console.log("PASS: structural inventory only; NOT a release or live-source claim");
      if(out.errors.length)process.exitCode=1;
    }catch(e){console.error("FAIL:",e instanceof Error?e.message:"invalid snapshot");process.exitCode=2}
  }
}
