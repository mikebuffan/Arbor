// Disposable PostgreSQL only. Requires separately installed pinned PGlite 0.5.8.
// Never reads credentials or connects to a remote database.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const modulePath = process.env.ARBOR_PGLITE_MODULE;
if (!modulePath) throw new Error("ARBOR_PGLITE_MODULE_required");
const { PGlite } = await import(pathToFileURL(join(modulePath, "dist/index.js")).href);
const dir = await mkdtemp(join(tmpdir(), "arbor-document-receipt-"));
let db;
try {
  db = new PGlite(dir);
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as 'select null::uuid';
    create table public.projects(id uuid, user_id uuid, unique(id,user_id));`);
  await db.exec(await readFile(new URL("../../docs/research/sql/PROPOSED_arbor_research_sessions.sql", import.meta.url), "utf8"));
  const owner = "11111111-1111-4111-8111-111111111111", project = "22222222-2222-4222-8222-222222222222";
  const session = "33333333-3333-4333-8333-333333333333", unit = "44444444-4444-4444-8444-444444444444";
  await db.query("insert into auth.users values($1)", [owner]);
  await db.query("insert into public.projects values($1,$2)", [project, owner]);
  await db.query(`insert into public.arbor_research_sessions
    (id,user_id,project_id,objective,started_at,deadline_at,max_work_units,max_cost_cents,authorized,unresolved_required_work)
    values($1,$2,$3,'Synthetic stored search',now()-interval '1 minute',now()+interval '30 minutes',5,10,true,3)`, [session, owner, project]);
  await db.query(`insert into public.arbor_research_units(id,session_id,user_id,project_id,unit_key,kind,max_cost_reservation_cents)
    values($1,$2,$3,$4,'batch-1','document_pattern_hop_search',0)`, [unit, session, owner, project]);
  await db.exec(`create table public.arbor_research_integration_state (
    owner_id uuid, project_id uuid, execution_enabled boolean default false,
    scheduler_enabled boolean default false, real_source_ingestion_enabled boolean default false,
    publication_enabled boolean default false,
    constraint rehearsal_closed check(execution_enabled=false), primary key(owner_id,project_id));`);
  await db.query("insert into public.arbor_research_integration_state(owner_id,project_id) values($1,$2)", [owner, project]);
  await db.exec(await readFile(new URL("../../docs/research/sql/PROPOSED_document_hop_targeted_claim_20261006.sql", import.meta.url), "utf8"));
  const targeted = "select public.arbor_claim_document_hop_unit($1,$2,$3,'test-worker',$4,240) as claim";
  assert.equal((await db.query(targeted, [session,owner,project,unit])).rows[0].claim, null);
  await assert.rejects(db.query("update public.arbor_research_integration_state set execution_enabled=true"));
  // HYPOTHETICAL FUTURE STATE, disposable DB only. No delivered migration opens the gate.
  await db.exec("alter table public.arbor_research_integration_state drop constraint rehearsal_closed; update public.arbor_research_integration_state set execution_enabled=true");
  const unrelated = "00000000-0000-4000-8000-000000000000";
  await db.query(`insert into public.arbor_research_units(id,session_id,user_id,project_id,unit_key,kind,max_cost_reservation_cents,available_at)
    values($1,$2,$3,$4,'unrelated','source_fetch',0,now()-interval '1 minute')`,[unrelated,session,owner,project]);
  assert.equal((await db.query(targeted,[session,owner,project,unrelated])).rows[0].claim,null);
  assert.equal((await db.query(targeted,[session,'99999999-9999-4999-8999-999999999999',project,unit])).rows[0].claim,null);
  const claim = (await db.query(targeted, [session,owner,project,unit])).rows[0].claim;
  assert.equal((await db.query(targeted,[session,owner,project,unit])).rows[0].claim,null);
  assert.equal(claim.unitId, unit);
  const result = { receipt_recorded_at: new Date().toISOString(), unit_result: {
    version: 1, completionScope: "bounded_document_search_batch", nextPageId: unit,
    hits: [{ recordId: unit, pageHash: "a".repeat(64), source: { pdfPage: 2, sha256: "b".repeat(64) }, findingVerified: false }],
    corpusExhaustionVerified: false, originalPageReviewRequired: true,
  } };
  const args = [session, owner, project, unit, claim.leaseToken, claim.idempotencyKey, JSON.stringify(result)];
  const settle = "select public.arbor_settle_research_unit($1,$2,$3,$4,$5,$6,'completed',0,'{}'::text[],3,$7::jsonb) as status";
  assert.equal((await db.query(settle, args)).rows[0].status, "committed");
  assert.equal((await db.query(settle, args)).rows[0].status, "duplicate");
  await db.close();
  db = new PGlite(dir);
  const restored = (await db.query("select result from public.arbor_research_receipts where session_id=$1 and unit_id=$2 and user_id=$3 and project_id=$4", [session, unit, owner, project])).rows;
  assert.equal(restored.length, 1); assert.deepEqual(restored[0].result, result);
  const state = (await db.query("select consumed_work_units,unresolved_required_work,committed_cost_cents,completed_evidence_refs from public.arbor_research_sessions where id=$1", [session])).rows[0];
  assert.deepEqual(state, { consumed_work_units: 1, unresolved_required_work: 3, committed_cost_cents: 0, completed_evidence_refs: [] });
  assert.equal((await db.query(targeted,[session,owner,project,unit])).rows[0].claim,null);
  const untouched=(await db.query("select status,attempt_count from public.arbor_research_units where id=$1",[unrelated])).rows[0];
  assert.deepEqual(untouched,{status:"queued",attempt_count:0});
  const retry="55555555-5555-4555-8555-555555555555";
  await db.query(`insert into public.arbor_research_units(id,session_id,user_id,project_id,unit_key,kind,max_cost_reservation_cents)
    values($1,$2,$3,$4,'retry','document_pattern_hop_search',0)`,[retry,session,owner,project]);
  const old=(await db.query(targeted,[session,owner,project,retry])).rows[0].claim;
  await db.query("update public.arbor_research_units set lease_expires_at=now()-interval '1 second' where id=$1",[retry]);
  const renewed=(await db.query(targeted,[session,owner,project,retry])).rows[0].claim;
  assert.equal(renewed.unitId,retry); assert.notEqual(renewed.leaseToken,old.leaseToken);
  const retryArgs=[session,owner,project,retry,old.leaseToken,old.idempotencyKey,JSON.stringify(result)];
  assert.equal((await db.query(settle,retryArgs)).rows[0].status,"lease_lost");
  await db.query("select public.arbor_stop_research_session($1,$2,$3,'cancelled','owner stop')",[session,owner,project]);
  retryArgs[4]=renewed.leaseToken;
  assert.equal((await db.query(settle,retryArgs)).rows[0].status,"lease_lost");
  assert.equal((await db.query(targeted,[session,owner,project,retry])).rows[0].claim,null);
  await assert.rejects(db.exec("set role authenticated; select public.arbor_claim_document_hop_unit(null,null,null,'forbidden',null,240)"));
  await db.exec("reset role");
  console.log("PASS: targeted claims, closed gate, mixed queue isolation, restart, dedupe, lease expiry, STOP and role denial.");
} finally {
  if (db) await db.close();
  await rm(dir, { recursive: true, force: true });
}
