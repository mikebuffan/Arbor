#!/usr/bin/env node
/** Offline fail-closed PR/ownership guard. No network or credentials.
 * Usage: node docs/integration/check_integration_v2.mjs docs/integration/integration_manifest_v2.json
 *  [--changes proposed_paths.json --owner integration] [--observed freshly_fetched_prs.json]
 * PASS without --observed means historical snapshot integrity ONLY, not live GitHub freshness.
 */
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";

export const validate = function validate(m,{owner=null,changes=[],observed=null}={}){
 const errors=[],sha=v=>typeof v==="string"&&/^[a-f0-9]{40}$/.test(v),names=["private_grove","public_arbor_app"];
 if(m.schema_version!==2)errors.push("schema_version must be 2");
 if(m.repository!=="mikebuffan/Arbor")errors.push("wrong repository");
 if(JSON.stringify(m.product_separation)!==JSON.stringify(names))errors.push("two distinct products mandatory");
 if(!sha(m.main_sha))errors.push("main_sha must be exact SHA");
 const owners=m.owners||{},prs=m.pull_requests||[],byN=new Map(),byBranch=new Map();
 for(const p of prs){
  if(!Number.isInteger(p.number)||byN.has(p.number))errors.push(`duplicate/invalid PR ${p.number}`);
  byN.set(p.number,p);
  if(!Object.hasOwn(owners,p.owner))errors.push(`unknown owner PR #${p.number}`);
  if(!sha(p.sha)||!sha(p.base_sha))errors.push(`invalid SHA PR #${p.number}`);
  if(!p.branch||byBranch.has(p.branch))errors.push(`missing/duplicate branch ${p.branch}`);
  byBranch.set(p.branch,p);
  if(p.merged&&p.draft)errors.push(`merged+draft PR #${p.number}`);
  if(p.state!=="open"&&p.state!=="closed")errors.push(`invalid state PR #${p.number}`);
  if(p.stacked_into!=null&&p.incorporated_by!=null)errors.push(`ambiguous stack PR #${p.number}`);
 }
 const ext=new Map((m.external_bases||[]).map(e=>[e.branch,e]));
 for(const [b,e] of ext)if(!sha(e.sha)||!Object.hasOwn(owners,e.owner)||byBranch.has(b))errors.push(`invalid or duplicate external base ${b}`);
 for(const p of prs){
  const base=p.base==="main"?m.main_sha:(byBranch.get(p.base)?.sha||ext.get(p.base)?.sha);
  if(!base||base!==p.base_sha)errors.push(`unresolved/mismatched base PR #${p.number}`);
  if(p.stacked_into!=null){const next=byN.get(p.stacked_into);if(!next||next.owner!==p.owner||next.number===p.number)errors.push(`bad stack successor PR #${p.number}`)}
  if(p.incorporated_by!=null&&!byN.has(p.incorporated_by))errors.push(`missing consumer PR #${p.number}`);
 }
 const tips=m.tip_pr_by_lane||{};
 for(const lane of ["grove","ark_layer","public_app","research"]){const tip=byN.get(tips[lane]);if(!tip||tip.owner!==lane||tip.stacked_into!=null||tip.merged||tip.state!=="open")errors.push(`invalid active tip ${lane}`)}
 const stages=new Set(["planned","implemented","tested","deployed","accepted"]),ids=new Set();
 for(const c of m.capabilities||[]){
  if(!c.id||ids.has(c.id))errors.push(`duplicate/invalid capability ${c.id}`);
  ids.add(c.id);
  if(!Object.hasOwn(owners,c.owner)||!stages.has(c.stage)||!c.pending)errors.push(`invalid capability ${c.id}`);
  const p=c.ref_pr==null?null:byN.get(c.ref_pr);
  if(c.ref_pr!=null&&(!p||p.owner!==c.owner))errors.push(`invalid capability ref ${c.id}`);
  if(!c.ref_pr&&!c.ref)errors.push(`unlocated capability ${c.id}`);
  if(["tested","deployed","accepted"].includes(c.stage))if(!p||!c.proof||c.proof.sha!==p.sha||!Number.isInteger(c.proof.run_id)||!c.proof.scope)errors.push(`non-exact proof ${c.id}`);
  if(c.prior_tested_sha&&!sha(c.prior_tested_sha))errors.push(`invalid ancestor proof ${c.id}`);
  if(c.prior_tested_sha&&["tested","deployed","accepted"].includes(c.stage))errors.push(`ancestor is not current proof ${c.id}`);
 }
 const prefixes=m.exclusive_path_prefixes||{};
 for(const lane of Object.keys(owners))if(!Array.isArray(prefixes[lane])||!prefixes[lane].length)errors.push(`missing owned paths ${lane}`);
 for(const [a,ap] of Object.entries(prefixes))for(const [b,bp] of Object.entries(prefixes))if(a<b)for(const pa of ap)for(const pb of bp)if(pa.startsWith(pb)||pb.startsWith(pa))errors.push(`ownership overlap ${a}/${b}: ${pa} ${pb}`);
 for(const flow of ["private_grove->public_arbor_app","public_arbor_app->private_grove"])if(!m.forbidden_cross_product_data_flow?.includes(flow))errors.push(`missing forbidden flow ${flow}`);
 for(const gate of ["exact_head_ci","synthetic_cross_user_isolation","product_specific_live_receipt","rollback_proof","owner_approval"])if(!m.release_requires?.includes(gate))errors.push(`missing release gate ${gate}`);
 if((owner==null)!==(changes.length===0))errors.push("changes require owner and owner must supply changes");
 if(owner!=null&&!Object.hasOwn(owners,owner))errors.push(`unknown edit owner ${owner}`);
 for(const path of changes){
  if(typeof path!=="string"||!path||path.startsWith("/")||path.includes("\\")||path.split("/").some(s=>!s||s==="."||s==="..")){errors.push(`unsafe path ${path}`);continue}
  let claimed=false;
  for(const [lane,ap] of Object.entries(prefixes))for(const pre of ap)if(path.startsWith(pre)){claimed=true;if(lane!==owner)errors.push(`COLLISION ${owner} vs ${lane}: ${path}`)}
  if(!claimed)errors.push(`UNCLAIMED ${owner}: ${path}`);
  if(m.shared_review_paths?.some(pre=>path===pre||pre.endsWith("/")&&path.startsWith(pre)))errors.push(`SHARED_REVIEW ${path}`);
 }
 if(observed!=null){
  if(observed.main_sha!==m.main_sha)errors.push("STALE main_sha");
  const o=observed.pull_requests||{};
  for(const p of prs){const x=o[String(p.number)];if(!x)errors.push(`UNOBSERVED PR #${p.number}`);else for(const k of ["sha","base","base_sha","state","draft","merged"])if(x[k]!==p[k])errors.push(`STALE PR #${p.number} ${k}`)}
 }
 return errors;
};

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const a=process.argv.slice(2),pos=a.shift();
 if(!pos){console.error("Usage: check_integration_v2.mjs manifest.json [--changes paths.json --owner lane] [--observed fresh.json]");process.exit(2)}
 const val=key=>{const i=a.indexOf(key);if(i<0)return null;const v=a[i+1];if(!v||v.startsWith("--"))throw Error("missing "+key);a.splice(i,2);return v};
 try{
  const owner=val("--owner"),path=val("--changes"),obs=val("--observed");
  if(a.length||Boolean(owner)!==Boolean(path))throw Error("invalid flags; --owner and --changes required together");
  const m=JSON.parse(readFileSync(pos,"utf8")),changes=path?JSON.parse(readFileSync(path,"utf8")):[];
  if(!Array.isArray(changes))throw Error("--changes must be an array");
  const observed=obs?JSON.parse(readFileSync(obs,"utf8")):null,errors=validate(m,{owner,changes,observed});
  for(const error of errors)console.error("FAIL:",error);
  if(errors.length)process.exitCode=1;
  else console.log(observed?"PASS: manifest matches supplied observations; release remains gated":"PASS: historical snapshot ONLY; re-fetch GitHub heads before merge or deployment");
 }catch(e){console.error("FAIL:",String(e));process.exitCode=2}
}
