import { expect, it, vi } from "vitest";
import type { Response } from "openai/resources/responses/responses";
import { runAcceptanceComparison, type AcceptanceConfig } from "../../agency/acceptanceRunner";
import { provisionAcceptanceFixture } from "../../agency/acceptanceFixture";
import generation from "./fixtures/proactiveJudgment/public_generation.json";
import demoAssignment from "./fixtures/proactiveJudgment/demo_assignment.json";
import rubric from "./fixtures/proactiveJudgment/host_private_rubric.json";

const unexpectedProvider = vi.hoisted(() => vi.fn(() => { throw new Error("unexpected live provider"); }));
vi.mock("@/lib/providers/openai", () => ({ openai: { responses: { create: unexpectedProvider } } }));
const assignment = demoAssignment as Parameters<typeof runAcceptanceComparison>[0]["assignment"];
const config: AcceptanceConfig = { model: "offline-fake-only", sourceIdentity: "synthetic-source-no-hosted-proof",
  taskInstructions: "Synthetic read-only comparison; no external actions.", baselineContext: "",
  candidateContext: "Synthetic candidate context; no scoring answers.",
  maxRounds: 1, maxCalls: 24, maxOutputTokens: 300, verifyCompletion: false };

it("captures the separate 12 proactive scenarios through the existing runner without rubric leakage or behavioral scoring", async () => {
  unexpectedProvider.mockClear();
  const events: Record<string, unknown>[] = [];
  let calls = 0;
  const result = await runAcceptanceComparison({ generation, assignment, config,
    provision: provisionAcceptanceFixture, record: async event => { events.push(event); },
    createResponse: async () => ({ id: "proactive-fake-" + ++calls, model: config.model,
      status: "completed", output: [], output_text: "Fake capture only; no judgment evaluated.", usage: null } as unknown as Response) });
  expect(result.status).toBe("captured; unscored");
  expect(result.failures).toEqual([]);
  expect(result.pairs).toHaveLength(12);
  expect(result.calls).toBe(24);
  expect(unexpectedProvider).not.toHaveBeenCalled();
  expect(rubric.casePackHash).toBe(generation.casePackHash);
  expect(rubric.cases.map(c => c.id)).toEqual(generation.cases.map(c => c.id));
  expect(assignment.cases.filter(c => c.A === "candidate")).toHaveLength(6);
  const requests = events.filter(e => e.type === "model-request");
  expect(requests).toHaveLength(24);
  for (const event of requests) {
    const payload = JSON.stringify(event.request);
    expect(payload).not.toContain("expectedDisposition");
    expect(payload).not.toContain("forbiddenFailure");
    for (const c of rubric.cases) expect(payload).not.toContain(c.success);
  }
  for (const pair of result.pairs as Array<{ A: { judgments: unknown[] }; B: { judgments: unknown[] } }>) {
    expect(pair.A.judgments).toEqual([]);
    expect(pair.B.judgments).toEqual([]);
  }
});

it("rejects an edited proactive prompt before fixture provisioning, capture or inference", async () => {
  const edited = structuredClone(generation);
  edited.cases[0].userTurns[0] += " altered after assignment";
  const provision = vi.fn();
  const record = vi.fn();
  const createResponse = vi.fn();
  await expect(runAcceptanceComparison({ generation: edited, assignment, config, provision, record, createResponse }))
    .rejects.toThrow("acceptance_pack_mismatch");
  expect(provision).not.toHaveBeenCalled();
  expect(record).not.toHaveBeenCalled();
  expect(createResponse).not.toHaveBeenCalled();
});
