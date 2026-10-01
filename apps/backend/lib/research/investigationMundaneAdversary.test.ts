import { describe, expect, it, vi } from "vitest";
import type { AgentResult } from "@/lib/arbor/agency/openaiAgent";
import { planMundaneAdversaries } from "./investigationMundaneAdversary";

function selecting(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (input: any): Promise<AgentResult> => {
    await input.hooks.onToolSelected({
      round: 0,
      name: "investigation_submit_mundane_explanations",
      arguments: {
        explanations: [{
          id: "ordinary-1",
          anomalyId: "anomaly-1",
          explanation:
            "The recurrence may be caused by a routine administrative role rather than coordination.",
          basisEvidenceRefs: ["evidence:1", "evidence:2"],
          entityIds: ["entity:a"],
          predictedFootprints: [
            "Routine role records should show similar appearances in unrelated ordinary matters.",
          ],
          falsifiers: [
            "Primary records show the appearances were outside the administrative role and uniquely tied to the disputed event.",
          ],
          status: "ordinary_explanation_hypothesis",
          ...overrides,
        }],
      },
    });
    return {
      status: "checkpointed",
      text: "selected",
      responseId: "response-1",
      toolCalls: 0,
    };
  });
}

describe("ordinary-explanation adversary", () => {
  it("forces a grounded anomaly to face a serious mundane alternative", async () => {
    const runAgent = selecting();
    const result = await planMundaneAdversaries({
      anomaly: {
        anomalyId: "anomaly-1",
        hypothesis: "Entity A may bridge separate clusters.",
        evidenceRefs: ["evidence:1", "evidence:2"],
        entityIds: ["entity:a"],
        observedFeatures: [
          "Entity A appears in two independent document families.",
        ],
      },
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "mundane-turn",
      },
      runAgent: runAgent as any,
    });

    expect(result.rule).toBe("strongest_ordinary_explanation_first");
    expect(result.explanations[0].status)
      .toBe("ordinary_explanation_hypothesis");
    const call = runAgent.mock.calls[0][0];
    expect(call.instructions).toContain(
      "Do not weaken an ordinary explanation just to preserve the exciting hypothesis",
    );
    expect(call.instructions).toContain("must name evidence that would falsify it");
  });

  it("rejects an ordinary explanation that invents evidence", async () => {
    const runAgent = selecting({
      basisEvidenceRefs: ["evidence:1", "invented:evidence"],
    });

    await expect(planMundaneAdversaries({
      anomaly: {
        anomalyId: "anomaly-1",
        hypothesis: "Synthetic.",
        evidenceRefs: ["evidence:1", "evidence:2"],
        entityIds: ["entity:a"],
        observedFeatures: ["Synthetic feature."],
      },
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "mundane-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow("mundane_adversary_unknown_evidence");
  });

  it("requires falsifiers for boring explanations too", async () => {
    const runAgent = selecting({ falsifiers: [] });

    await expect(planMundaneAdversaries({
      anomaly: {
        anomalyId: "anomaly-1",
        hypothesis: "Synthetic.",
        evidenceRefs: ["evidence:1", "evidence:2"],
        entityIds: ["entity:a"],
        observedFeatures: ["Synthetic feature."],
      },
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "mundane-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow("mundane_adversary_invalid_falsifiers");
  });
});
