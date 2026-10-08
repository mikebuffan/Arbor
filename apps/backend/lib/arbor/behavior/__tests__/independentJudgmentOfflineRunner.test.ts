import { describe, expect, it, vi } from "vitest";
import type { Response } from "openai/resources/responses/responses";
import { runAcceptanceComparison, type AcceptanceConfig } from "../../agency/acceptanceRunner";
import { provisionAcceptanceFixture } from "../../agency/acceptanceFixture";
import { buildJudgmentGeneration, buildPrivateJudgmentPlan } from "./independentJudgmentBlindPack";

const unexpectedProvider = vi.hoisted(() => vi.fn());
vi.mock("@/lib/providers/openai", () => ({
  openai: { responses: { create: unexpectedProvider } },
}));

const config: AcceptanceConfig = {
  model: "offline-fixture-only",
  sourceIdentity: "synthetic-source-only-no-deployed-SHA",
  taskInstructions: "This is a bounded synthetic read-only transcript fixture.",
  baselineContext: "Synthetic baseline instructions.",
  candidateContext: "Synthetic candidate instructions, no evaluation rubric.",
  maxRounds: 1,
  maxCalls: 32,
  maxOutputTokens: 300,
  verifyCompletion: false,
};

function mockResponse(id: string): Response {
  return {
    id, model: config.model, output_text: "Placeholder from a local fake provider; no judgment made.",
    output: [], status: "completed", usage: null,
  } as unknown as Response;
}

describe("16-case judgment dry run through EXISTING agency runner (no live inference)", () => {
  it("captures all 16 pairs with private rubric never passed to a fake model", async () => {
    unexpectedProvider.mockReset();
    const { generation } = buildJudgmentGeneration();
    const { assignment, rubric } = buildPrivateJudgmentPlan({
      generation, hostSeed: "synthetic-only-private-seed-20261007",
    });
    const events: Record<string, unknown>[] = [];
    let calls = 0;
    const localModel = vi.fn(async () => mockResponse("synthetic-" + ++calls));
    const result = await runAcceptanceComparison({
      generation, assignment, config,
      createResponse: localModel,
      provision: provisionAcceptanceFixture,
      record: async event => { events.push(event); },
    });
    expect(result.status).toBe("captured; unscored");
    expect(result.calls).toBe(32);
    expect(result.pairs).toHaveLength(16);
    expect(result.failures).toEqual([]);
    expect(localModel).toHaveBeenCalledTimes(32);
    expect(unexpectedProvider).not.toHaveBeenCalled();
    const requests = events.filter(e => e.type === "model-request");
    expect(requests).toHaveLength(32);
    for (const request of requests) {
      const payload = JSON.stringify(request.request);
      expect(payload).not.toContain("expectedDisposition");
      expect(payload).not.toContain("forbiddenFailure");
      expect(payload).not.toContain("judgment_pack_private_rubric");
      expect(payload).toContain("SYNTHETIC BLIND JUDGMENT CASE");
    }
    for (const item of result.pairs as Array<{
      caseId: string;
      A: { judgments: unknown[]; turns: unknown[]; modelReceipts: unknown[] };
      B: { judgments: unknown[]; turns: unknown[]; modelReceipts: unknown[] };
    }>) {
      expect(rubric.cases.some(c => c.id === item.caseId)).toBe(true);
      for (const arm of [item.A, item.B]) {
        expect(arm.judgments).toEqual([]);
        expect(arm.turns).toHaveLength(2);
        expect(arm.modelReceipts).toHaveLength(1);
      }
    }
    // Complete host capture does not equal truth or successful model behavior.
    expect(events.filter(e => e.type === "arm-captured")).toHaveLength(32);
    expect(events.find(e => e.type === "run-end")?.result).toMatchObject({
      status: "captured; unscored",
    });
  });

  it("honors a hard request-count budget without a live provider", async () => {
    unexpectedProvider.mockReset();
    const { generation } = buildJudgmentGeneration();
    const { assignment } = buildPrivateJudgmentPlan({
      generation, hostSeed: "synthetic-only-private-seed-20261007",
    });
    let calls = 0;
    await expect(runAcceptanceComparison({
      generation,
      assignment,
      config: { ...config, maxCalls: 1 },
      createResponse: async () => mockResponse("budget-" + ++calls),
      provision: provisionAcceptanceFixture,
      record: async () => {},
    })).rejects.toThrow("acceptance_call_budget_exhausted");
    expect(calls).toBe(1);
    expect(unexpectedProvider).not.toHaveBeenCalled();
  });
});
