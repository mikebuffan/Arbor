import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Response } from "openai/resources/responses/responses";
import { runAcceptanceComparison, type AcceptanceConfig } from "../acceptanceRunner";
import { provisionAcceptanceFixture } from "../acceptanceFixture";

const defaultCreate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/providers/openai", () => ({ openai: { responses: { create: defaultCreate } } }));

const packHash = "a".repeat(64);
const generation = { schemaVersion: 1, casePackHash: packHash,
  cases: [{ id: "tired-familiarity", userTurns: ["First question", "Continue"] }] };
const assignment = { schemaVersion: 1, casePackHash: packHash,
  cases: [{ caseId: "tired-familiarity", A: "baseline", B: "candidate" }] };
const config: AcceptanceConfig = { model: "test-model", sourceIdentity: "test-source",
  taskInstructions: "Shared task rules.", baselineContext: "", candidateContext: "Reviewed Arbor context.",
  maxRounds: 4, maxCalls: 50, maxOutputTokens: 1000, verifyCompletion: false };
const response = (id: string, text = "Actual adapter reply", output: unknown[] = []): Response =>
  ({ id, model: "test-model", output_text: text, output, status: "completed", usage: null } as unknown as Response);

describe("isolated acceptance runner (mock provider, never live acceptance)", () => {
  it("uses each arm's own replies, captures hashes and never gives scoring material to inference", async () => {
    const events: Record<string, unknown>[] = [];
    let count = 0;
    const createResponse = vi.fn(async () => response(`r${++count}`, `Reply ${count}`));
    const result = await runAcceptanceComparison({ generation, assignment, config, createResponse,
      provision: provisionAcceptanceFixture, record: async e => { events.push(e); } });
    expect(result.pairs).toHaveLength(1);
    expect(createResponse.mock.calls).toHaveLength(4);
    const requests = events.filter(e => e.type === "model-request").map(e => e.request as any);
    expect(requests[1].input[1].content).toBe("Reply 1");
    expect(requests[3].input[1].content).toBe("Reply 3");
    expect(requests[0].instructions).not.toContain(config.candidateContext);
    expect(requests[2].instructions).toContain(config.candidateContext);
    expect(requests.every(r => r.model === "test-model" && r.store === true)).toBe(true);
    const pair = result.pairs[0] as any;
    expect(pair.A.turns[1].requestContextSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(pair.A.judgments).toEqual([]);
    expect(defaultCreate).not.toHaveBeenCalled();
  });

  it("routes generation and verification calls through the same captured transport", async () => {
    let count = 0;
    const createResponse = vi.fn(async (request: any) => {
      const id = `verify${++count}`;
      return response(id, String(request.instructions).includes("completion and behavioral-regression verifier")
        ? JSON.stringify({ complete: true, score: 1, evidence: [], unresolvedWork: [], strategyCorrection: null, behaviorViolations: [] })
        : "Finished reply");
    });
    const result = await runAcceptanceComparison({ generation, assignment,
      config: { ...config, verifyCompletion: true }, createResponse,
      provision: provisionAcceptanceFixture, record: async () => {} });
    expect(result.calls).toBe(8);
    expect((result.pairs[0] as any).A.modelReceipts).toHaveLength(4);
    expect(defaultCreate).not.toHaveBeenCalled();
  });

  it("executes a real isolated fixture tool through the existing agency loop", async () => {
    let count = 0;
    const createResponse = vi.fn(async (request: any) => {
      const id = `tool${++count}`;
      if (!request.previous_response_id) return response(id, "", [{ type: "function_call", call_id: id,
        name: "complete_fixture_task", arguments: '{"task":"A"}' }]);
      return response(id, "Task A finished.");
    });
    const result = await runAcceptanceComparison({
      generation: { ...generation, cases: [{ id: "fresh-continuation", userTurns: ["Continue"] }] },
      assignment: { ...assignment, cases: [{ caseId: "fresh-continuation", A: "baseline", B: "candidate" }] },
      config, createResponse, provision: provisionAcceptanceFixture, record: async () => {} });
    const arm = (result.pairs[0] as any).A;
    expect(arm.fixtureReceipts.tasks).toEqual({ A: "completed", B: "completed" });
    expect(arm.fixtureReceipts.events).toEqual([{ task: "A", result: "completed", executed: true }]);
    expect(arm.toolReceipts).toHaveLength(1);
    expect(createResponse.mock.calls[1][0].previous_response_id).toBe("tool1");
  });

  it("rejects malformed assignments before provider calls", async () => {
    const createResponse = vi.fn();
    await expect(runAcceptanceComparison({ generation, assignment: { ...assignment, cases: [] },
      config, createResponse, provision: provisionAcceptanceFixture, record: async () => {} })).rejects.toThrow("acceptance_case_count");
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("stops at the call budget and retains events without fabricating a pair", async () => {
    let count = 0;
    const createResponse = vi.fn(async () => response(`budget${++count}`));
    const events: Record<string, unknown>[] = [];
    await expect(runAcceptanceComparison({ generation, assignment, config: { ...config, maxCalls: 1 },
      createResponse, provision: provisionAcceptanceFixture, record: async e => { events.push(e); } }))
      .rejects.toThrow("acceptance_call_budget_exhausted");
    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(events.some(e => e.type === "arm-failed")).toBe(true);
  });

  it("halts when capture fails, before an unrecorded provider request", async () => {
    const createResponse = vi.fn();
    await expect(runAcceptanceComparison({ generation, assignment, config, createResponse,
      provision: provisionAcceptanceFixture, record: async e => { if (e.type === "model-request") throw new Error("disk full"); } }))
      .rejects.toThrow("acceptance_capture_failed");
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("preserves a host failure and continues the other arm without inventing outputs", async () => {
    let count = 0;
    const events: Record<string, unknown>[] = [];
    const createResponse = vi.fn(async () => { if (++count === 1) throw new Error("secret raw provider detail"); return response(`ok${count}`); });
    const result = await runAcceptanceComparison({ generation, assignment, config, createResponse,
      provision: provisionAcceptanceFixture, record: async e => { events.push(e); } });
    expect(result.pairs).toEqual([]);
    expect(result.failures).toEqual([{ caseId: "tired-familiarity", label: "A", code: "acceptance_host_error" }]);
    expect(JSON.stringify(events)).not.toContain("secret raw provider detail");
    expect(events.some(e => e.type === "arm-captured" && e.label === "B")).toBe(true);
  });

  it("rejects reused scopes and mismatched fixtures before the second arm calls the model", async () => {
    for (const mode of ["scope", "state"]) {
      let first: any;
      let count = 0;
      const createResponse = vi.fn(async () => response(`isolate${mode}${++count}`));
      const provision = async (args: any) => {
        const fixture = await provisionAcceptanceFixture(args);
        if (!first) first = fixture;
        else if (mode === "scope") fixture.context = first.context;
        else fixture.taskContext += " Different task fixture.";
        return fixture;
      };
      const result = await runAcceptanceComparison({ generation, assignment, config, createResponse, provision, record: async () => {} });
      expect(createResponse).toHaveBeenCalledTimes(2);
      expect(result.failures[0].code).toBe(mode === "scope" ? "acceptance_fixture_scope_reused" : "acceptance_unmatched_fixture");
    }
  });

  it("all eighteen prepared cases can cross the runner boundary; mocks remain test evidence only", async () => {
    const { prepareEvaluation, auditEvaluation } = await import("../../../../../../scripts/behavior-acceptance.mjs");
    const pack = JSON.parse(readFileSync(resolve(process.cwd(), "../../docs/integration/ARBOR_CONVERSATION_ACCEPTANCE_CASES_20261005.json"), "utf8"));
    const prepared = prepareEvaluation(pack, "unit-test-only");
    let count = 0;
    const result = await runAcceptanceComparison({ generation: prepared.generation, assignment: prepared.assignment,
      config: { ...config, maxCalls: 100 }, createResponse: async () => response(`synthetic-test-${++count}`),
      provision: provisionAcceptanceFixture, record: async () => {} });
    expect(result.pairs).toHaveLength(18);
    const audit = auditEvaluation(pack, result);
    expect(audit.cases.every((c: any) => c.A.every((j: any) => j.verdict === "unknown"))).toBe(true);
    // Never write these mock transcripts to the live acceptance results pack.
  });

  it("captures a rejected verification and its corrective generation chain", async () => {
    let count = 0;
    let verifications = 0;
    const events: Record<string, unknown>[] = [];
    const createResponse = async (request: any) => {
      const id = `correction${++count}`;
      const isVerifier = String(request.instructions).includes("completion and behavioral-regression verifier");
      if (!isVerifier) return response(id, "Reply");
      verifications++;
      return response(id, JSON.stringify({ complete: verifications !== 1, score: 1,
        unresolvedWork: verifications === 1 ? ["Unfinished task"] : [], evidence: [], strategyCorrection: null, behaviorViolations: [] }));
    };
    const result = await runAcceptanceComparison({ generation, assignment, config: { ...config, verifyCompletion: true },
      createResponse, provision: provisionAcceptanceFixture, record: async e => { events.push(e); } });
    expect(result.calls).toBe(10);
    const corrective = events.filter(e => e.type === "model-request").map(e => e.request as any)
      .find(r => r.previous_response_id === "correction1");
    expect(corrective.input).toContain("Unfinished task");
  });

  it("keeps a checkpoint out of completed pairs and captures its unfinished result", async () => {
    let count = 0;
    const events: Record<string, unknown>[] = [];
    const result = await runAcceptanceComparison({ generation, assignment, config: { ...config, maxRounds: 1 },
      createResponse: async () => {
        const id = `checkpoint${++count}`;
        return response(id, "", [{ type: "function_call", call_id: id, name: "inspect_fixture", arguments: "{}" }]);
      }, provision: provisionAcceptanceFixture, record: async e => { events.push(e); } });
    expect(result.pairs).toEqual([]);
    expect(result.failures.every(f => f.code === "acceptance_turn_unfinished")).toBe(true);
    expect(events.some(e => e.type === "agent-result" && (e.result as any).status === "checkpointed")).toBe(true);
  });

  it("rejects reused provider response identifiers instead of accepting duplicate receipts", async () => {
    const result = await runAcceptanceComparison({ generation, assignment, config,
      createResponse: async () => response("duplicate"), provision: provisionAcceptanceFixture, record: async () => {} });
    expect(result.pairs).toEqual([]);
    expect(result.failures.every(f => f.code === "acceptance_invalid_provider_receipt")).toBe(true);
  });

  it("fixture tools preserve draft tails, task blockers, and completed actions", async () => {
    const fixture = await provisionAcceptanceFixture({ caseId: "ambiguous-scope", label: "A", userTurns: [] });
    const edited = await fixture.tools.get("edit_fixture_opening").execute({ draft: "scene notes", opening: "Ever made a face." }, fixture.context) as any;
    expect(edited.drafts["meeting notes"][0]).toBe("The meeting opened at nine.");
    expect(edited.drafts["scene notes"]).toEqual(["Ever made a face.", "Mara waited by the sink."]);
    const tasks = await provisionAcceptanceFixture({ caseId: "bounded-workaround", label: "A", userTurns: [] });
    const complete = tasks.tools.get("complete_fixture_task");
    expect(await complete.execute({ task: "one" }, tasks.context)).toMatchObject({ result: "blocked" });
    await complete.execute({ task: "two" }, tasks.context);
    expect(await complete.execute({ task: "two" }, tasks.context)).toMatchObject({ executed: false });
    expect((tasks.receipts() as any).tasks).toEqual({ one: "blocked", two: "completed" });
  });
});
