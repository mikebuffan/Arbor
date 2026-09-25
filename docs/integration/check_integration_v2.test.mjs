import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validate} from './check_integration_v2.mjs';

const DATA=JSON.parse(readFileSync(new URL('./integration_manifest_v2.json',import.meta.url),'utf8'));
const clone=()=>JSON.parse(JSON.stringify(DATA));
const hits=(errors,part)=>errors.some(s=>s.includes(part));
const observed=()=>({main_sha:DATA.main_sha,pull_requests:Object.fromEntries(DATA.pull_requests.map(p=>[String(p.number),Object.fromEntries(['sha','base','base_sha','state','draft','merged'].map(k=>[k,p[k]]))]))});

test('dated snapshot is internally consistent without pretending live freshness',()=>assert.deepEqual(validate(DATA),[]));
test('integration can only alter its own paths',()=>assert.deepEqual(validate(DATA,{owner:'integration',changes:['docs/integration/example.md']}),[]));
test('integration cannot write a Grove-owned file',()=>assert.ok(hits(validate(DATA,{owner:'integration',changes:['apps/frontend/lib/environment/home.dart']}),'COLLISION')));
test('integration cannot write a public-owned file',()=>assert.ok(hits(validate(DATA,{owner:'integration',changes:['apps/backend/lib/publicApp/arborLM.ts']}),'COLLISION')));
test('near-prefix names are not treated as authorized directory ownership',()=>assert.ok(hits(validate(DATA,{owner:'integration',changes:['apps/frontend/lib/environment2/home.dart']}),'UNCLAIMED')));
test('path traversal is blocked',()=>assert.ok(hits(validate(DATA,{owner:'integration',changes:['docs/integration/../private.env']}),'unsafe path')));
test('Windows separators are blocked',()=>assert.ok(hits(validate(DATA,{owner:'integration',changes:['docs\\integration\\note.md']}),'unsafe path')));
test('shared paths require cross-owner review',()=>assert.ok(hits(validate(DATA,{owner:'integration',changes:['apps/frontend/lib/main.dart']}),'SHARED_REVIEW')));
test('duplicate PR IDs are rejected',()=>{const m=clone();m.pull_requests.push({...m.pull_requests[0]});assert.ok(hits(validate(m),'duplicate/invalid PR'))});
test('changed stacked base SHA is rejected',()=>{const m=clone();m.pull_requests.find(p=>p.number===151).base_sha='0'.repeat(40);assert.ok(hits(validate(m),'mismatched base'))});
test('changed external base SHA is rejected',()=>{const m=clone();m.external_bases[0].sha='0'.repeat(40);assert.ok(hits(validate(m),'mismatched base'))});
test('cross-owner stack absorption is rejected',()=>{const m=clone();m.pull_requests.find(p=>p.number===150).stacked_into=152;assert.ok(hits(validate(m),'bad stack successor'))});
test('old Grove tip cannot be called current',()=>{const m=clone();m.tip_pr_by_lane.grove=150;assert.ok(hits(validate(m),'invalid active tip'))});
test('two-product isolation cannot collapse to one account',()=>{const m=clone();m.product_separation=['private_grove'];assert.ok(hits(validate(m),'two distinct'))});
test('previously tested implementation cannot claim final current-head proof',()=>{const m=clone();m.capabilities[0].stage='tested';m.capabilities[0].proof={sha:m.capabilities[0].prior_tested_sha,run_id:35678497172,scope:'previous implementation'};assert.ok(hits(validate(m),'non-exact proof'))});
test('fake CI SHA cannot prove tested current head',()=>{const m=clone();m.capabilities[2].proof.sha='0'.repeat(40);assert.ok(hits(validate(m),'non-exact proof'))});
test('matching newly fetched observations pass offline',()=>assert.deepEqual(validate(DATA,{observed:observed()}),[]));
test('PR updated after snapshot is reported STALE, never counted as current',()=>{const o=observed();o.pull_requests['152'].sha='0'.repeat(40);assert.ok(hits(validate(DATA,{observed:o}),'STALE PR #152'))});
test('missing observed PR is not silently skipped',()=>{const o=observed();delete o.pull_requests['151'];assert.ok(hits(validate(DATA,{observed:o}),'UNOBSERVED PR #151'))});
test('missing owner or --changes pair is invalid',()=>assert.ok(hits(validate(DATA,{owner:'integration',changes:[]}), 'changes require owner')));

test('Grove #156 is the consolidated tip with #155 retained as parent',()=>{
  const m=clone();
  assert.equal(m.tip_pr_by_lane.grove,156);
  assert.equal(m.pull_requests.find(p=>p.number===155).stacked_into,156);
  assert.deepEqual(validate(m),[]);
});
test('current Grove credential-free CI proves tested not deployed',()=>{
  const m=clone();
  const c=m.capabilities.find(c=>c.id==='grove_private_api_credential_free_build');
  assert.equal(c.stage,'tested');
  assert.equal(c.proof.sha,m.pull_requests.find(p=>p.number===156).sha);
  c.stage='deployed';
  assert.ok(hits(validate(m),'missing live proof'));
});
test('a deployed claim must bind to the exact deployed commit',()=>{
  const m=clone();
  const c=m.capabilities.find(c=>c.id==='grove_private_api_credential_free_build');
  c.stage='deployed';
  c.live_proof={commit_sha:'0'.repeat(40),url:'https://example.invalid',observed_at:'2026-09-22',scope:'test only'};
  assert.ok(hits(validate(m),'mismatched live proof SHA'));
});
test('owner acceptance cannot be inferred from CI or deployment alone',()=>{
  const m=clone();
  const c=m.capabilities.find(c=>c.id==='grove_private_api_credential_free_build');
  c.stage='accepted';
  c.live_proof={commit_sha:c.proof.sha,url:'https://example.invalid',observed_at:'2026-09-22',scope:'test only'};
  assert.ok(hits(validate(m),'missing owner acceptance proof'));
});
test('manually applied bridge schema is not mislabeled exact-head tested',()=>{
  const m=clone();
  const c=m.capabilities.find(c=>c.id==='grove_manual_mapping_schema');
  assert.equal(c.stage,'implemented');
  assert.ok(c.prior_tested_sha);
  assert.deepEqual(validate(m),[]);
});
