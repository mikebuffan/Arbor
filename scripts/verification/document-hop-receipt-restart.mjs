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
  const claim = (await db.query("select public.arbor_claim_research_unit($1,$2,$3,'test-worker',240) as claim", [session, owner, project])).rows[0].claim;
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
  assert.equal((await db.query("select public.arbor_claim_research_unit($1,$2,$3,'restarted-worker',240) as claim", [session, owner, project])).rows[0].claim, null);
  console.log("PASS: SQL receipt survives database restart, dedupes settlement and preserves unresolved review.");
} finally {
  if (db) await db.close();
  await rm(dir, { recursive: true, force: true });
}
