import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { recordSavedResearchHandoff, parseSavedResearchHandoff, readSavedResearchCheckpoint,
  savedResearchHandoffSha256, registerSavedResearchHandoffExecutor } from "./savedResearchHandoff";
import { ArkExecutorRegistry } from "../ark/executorRegistry";
import { SupabaseArkStore } from "../ark/supabaseStore";
import { runArkWorkerCycle } from "../ark/runner";

const owner = "11111111-1111-4111-8111-111111111111", project = "22222222-2222-4222-8222-222222222222";
const foreign = "99999999-9999-4999-8999-999999999999";
const fixture = { version: 1, runRef: "synthetic-manual-review",
  artifacts: [{ name: "note.md", libraryFileId: "libfile_synthetic", fileId: "file_synthetic", libraryVersion: 1, bytes: 9, sha256: "a".repeat(64) }],
  sources: [{ identifier: "synthetic:1", url: "https://example.invalid/original.pdf", sha256: "b".repeat(64), physicalPages: 1,
    inspectedPages: "physical page 1", familyOverlap: "same original family as wrapper", accessUncertainty: "synthetic fixture only" }],
  observations: ["Blank signature is not an executed agreement"], contradictions: ["copy and index dates differ"],
  uncertainty: ["borrowing and release unverified"], nextQuestion: "Where is the executed collateral agreement?",
  evidenceStatus: "manual_observations_not_misconduct_findings", saveVerification: "reported_library_receipt_requires_independent_recovery" };

// Transport shim only: all persistence, leases, conflicts, scope and dedupe use delivered SQL.
function client(getDb: () => any) {
  const db: any = { rpc: async (name: string, params: Record<string, unknown>) => {
    const entries = Object.entries(params);
    try { const r = await getDb().query(`select public.${name}(${entries.map(([key], i) => `${key} => $${i + 1}`).join(",")}) as value`,
      entries.map(([, value]) => value && typeof value === "object" && !Array.isArray(value) ? JSON.stringify(value) : value));
      return { data: r.rows[0].value, error: null };
    } catch (error) { return { data: null, error }; }
  }, from: (table: string) => {
    const filters: Array<[string, unknown]> = []; let columns = "*";
    const q: any = { select: (s: string) => { columns = s; return q; }, eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
      order: () => q, limit: () => q,
      maybeSingle: async () => {
        try { const r = await getDb().query(`select ${columns} from public.${table}${filters.length ? " where " : ""}${filters.map(([k], i) => `${k}=$${i + 1}`).join(" and ")} limit 1`, filters.map(([, v]) => v));
          return { data: r.rows[0] ?? null, error: null }; } catch (error) { return { data: null, error }; }
      } };
    return q;
  } }; return db;
}
let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => { await cleanup?.(); cleanup = undefined; });
describe("saved research custody handoff", () => {
  it("rejects fabricated verification, owner overrides, missing uncertainty and duplicate artifacts", () => {
    expect(() => parseSavedResearchHandoff({ ...fixture, userId: foreign })).toThrow();
    expect(() => parseSavedResearchHandoff({ ...fixture, saveVerification: "verified" })).toThrow();
    expect(() => parseSavedResearchHandoff({ ...fixture, uncertainty: [] })).toThrow();
    expect(() => parseSavedResearchHandoff({ ...fixture, artifacts: [fixture.artifacts[0], fixture.artifacts[0]] })).toThrow();
  });
  it("preserves source/order/uncertainty and hashes changed next questions differently", () => {
    expect(parseSavedResearchHandoff(fixture)).toEqual(fixture);
    expect(savedResearchHandoffSha256({ ...fixture, nextQuestion: "Different next question" })).not.toBe(savedResearchHandoffSha256(fixture));
  });
  it.skipIf(!process.env.ARBOR_PGLITE_MODULE)("uses real ARK SQL to checkpoint, close/reopen, recover, replay and resume without another action", async () => {
    const modulePath = process.env.ARBOR_PGLITE_MODULE;
    if (!modulePath) throw new Error("ARBOR_PGLITE_MODULE_required_for_durable_handoff_test");
    const moduleUrl = pathToFileURL(join(modulePath, "dist/index.js")).href;
    const { PGlite } = await import(/* @vite-ignore */ moduleUrl);
    const dir = await mkdtemp(join(tmpdir(), "arbor-saved-handoff-")); let pg = new PGlite(dir);
    cleanup = async () => { await pg.close(); await rm(dir, { recursive: true, force: true }); };
    await pg.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'', true),'''')::uuid';
      create table public.projects(id uuid primary key, user_id uuid);`);
    await pg.exec(await readFile(join(process.cwd(), "../../supabase/migrations/20260918143000_create_ark_autonomous_work_runner.sql"), "utf8"));
    await pg.exec(await readFile(join(process.cwd(), "../../supabase/migrations/20260918203000_ark_targeted_objective_claim.sql"), "utf8"));
    await pg.query("insert into auth.users values($1),($2)", [owner, foreign]);
    await pg.query("insert into public.projects values($1,$2)", [project, owner]);
    const db = client(() => pg);
    const actual = process.env.ARBOR_HANDOFF_FIXTURE ? JSON.parse(await readFile(process.env.ARBOR_HANDOFF_FIXTURE, "utf8")) : fixture;
    const input = { db, ownerId: owner, projectId: project, handoff: actual, workerId: "manual-host" };
    const first = await recordSavedResearchHandoff(input);
    expect(first).toMatchObject({ replayed: false, sequence: 1, researchCompletionVerified: false, executionRequested: false });
    expect(first.handoff).toEqual(actual);
    await pg.close(); pg = new PGlite(dir);
    const recovered = await readSavedResearchCheckpoint(db, owner, project, first.objectiveId);
    expect(recovered?.handoff).toEqual(actual); expect(recovered?.nextQuestion).toBe(actual.nextQuestion);
    const replay = await recordSavedResearchHandoff({ ...input, workerId: "reopened-host" });
    expect(replay).toMatchObject({ objectiveId: first.objectiveId, taskId: first.taskId, replayed: true });
    expect((await pg.query("select count(*)::int as n from public.ark_checkpoints")).rows[0].n).toBe(1);
    expect((await pg.query("select attempt_count from public.ark_tasks")).rows[0].attempt_count).toBe(2);
    expect(await readSavedResearchCheckpoint(db, foreign, project, first.objectiveId)).toBeNull();
    await expect(recordSavedResearchHandoff({ ...input, ownerId: foreign })).rejects.toThrow("ark_project_owner_mismatch");
    // Existing owner RLS governs recovery; foreign identities cannot read checkpoint state.
    await pg.exec(`set role authenticated; set request.jwt.claim.sub = '${foreign}'`);
    expect((await pg.query("select state from public.ark_checkpoints")).rows).toEqual([]);
    await pg.exec(`set request.jwt.claim.sub = '${owner}'`);
    expect((await pg.query("select state from public.ark_checkpoints")).rows[0].state.handoff).toEqual(actual);
    await pg.exec("reset role");
    // A separate bounded worker only verifies custody. It does not research the next question.
    const registry = new ArkExecutorRegistry(); registerSavedResearchHandoffExecutor(registry, db);
    const cycle = await runArkWorkerCycle({ store: new SupabaseArkStore(db), executors: registry, workerId: "resumed-worker",
      objectiveId: first.objectiveId, maxTasks: 1 });
    expect(cycle.claimed).toBe(0);
    const row = (await pg.query("select result from public.ark_tasks")).rows[0];
    expect(row.result).toMatchObject({ completionScope: "handoff_custody_only", nextQuestion: actual.nextQuestion, researchCompletionVerified: false });
    expect((await recordSavedResearchHandoff(input)).replayed).toBe(true);
    expect((await pg.query("select count(*)::int as n from public.ark_checkpoints")).rows[0].n).toBe(1);
    // Lose the transport before settlement: checkpoint remains recoverable, with no duplicate stage.
    let loseSettlement = true;
    const interruptedDb = { ...db, rpc: async (name: string, params: Record<string, unknown>) => {
      if (name === "ark_complete_task" && loseSettlement) { loseSettlement = false; return { data: null, error: new Error("simulated_settlement_transport_loss") }; }
      return db.rpc(name, params);
    } };
    const interrupted = { ...input, db: interruptedDb, handoff: { ...actual, runRef: actual.runRef + ":transport-recovery" } };
    await expect(recordSavedResearchHandoff(interrupted)).rejects.toThrow("simulated_settlement_transport_loss");
    await expect(recordSavedResearchHandoff(interrupted)).rejects.toThrow("research_handoff_not_confirmed_retry_same_content");
    await pg.query("update public.ark_tasks set lease_expires_at=now()-interval '1 second' where status='running'");
    await pg.close(); pg = new PGlite(dir);
    const resumed = await recordSavedResearchHandoff(interrupted);
    expect(resumed).toMatchObject({ replayed: true, taskStatus: "completed", nextQuestion: actual.nextQuestion });
    expect((await pg.query("select count(*)::int as n from public.ark_checkpoints where task_id=$1", [resumed.taskId])).rows[0].n).toBe(1);
    await pg.query("update public.ark_checkpoints set next_action='tampered'");
    await expect(readSavedResearchCheckpoint(db, owner, project, first.objectiveId)).rejects.toThrow("research_handoff_checkpoint_mismatch");
  }, 30000);
});
