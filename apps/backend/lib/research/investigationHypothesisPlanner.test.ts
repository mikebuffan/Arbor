import { describe, expect, it, vi } from "vitest";
import type { AgentResult } from "@/lib/arbor/agency/openaiAgent";
import type { InvestigationDiscoveryLead } from "./investigationDiscovery";
import { planInvestigationHypotheses } from "./investigationHypothesisPlanner";

const lead: InvestigationDiscoveryLead = {
  id: "bridge-entity-a",
  kind: "bridge_node",
  hypothesis:
    "Entity A may bridge otherwise separate record clusters; the connection may be operational, administrative, incidental, or coincidental.",
  rationale:
    "Entity A appears across three document families and three independent lineages.",
  basisEvidenceRefs: ["evidence:1", "evidence:2", "evidence:3"],
  entityIds: ["entity:a"],
  independentLineages: ["lineage:1", "lineage:2", "lineage:3"],
  documentFamilies: ["calendar", "payment", "property"],
  occurredAtRange: {
    first: "2026-01-01T00:00:00.000Z",
    last: "2026-01-05T00:00:00.000Z",
  },
  predictedFootprints: [
    "Independent records from each cluster should reproduce some of the relationship.",
  ],
  falsifiers: [
    "Reverse reconstruction fails.",
  ],
  searchSeeds: [
    "Entity A calendar payment property",
  ],
  status: "hypothesis",
  confidenceCeiling: 0.49,
};

function selecting(proposals: Record<string, unknown>[]) {
  return vi.fn(async (input: any): Promise<AgentResult> => {
    await input.hooks.onToolSelected({
      round: 0,
      name: "investigation_propose_hypotheses",
      arguments: { proposals },
    });
    const delegated = await input.executionDelegate.execute({
      tool: input.tools.get("investigation_propose_hypotheses"),
      args: { proposals },
      context: input.context,
      attemptedRoutes: ["investigation_propose_hypotheses"],
    });
    expect(delegated).toEqual({
      kind: "checkpointed",
      reason: "investigation_hypothesis_plan_selected",
    });
    return {
      status: "checkpointed",
      text: "selected",
      responseId: "response-1",
      toolCalls: 0,
    };
  });
}

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    id: "hypothesis-1",
    hypothesis:
      "Entity A may have an administrative role that explains the otherwise separate record clusters.",
    whyInteresting:
      "One shared administrative mechanism could generate records in unrelated document families without implying wrongdoing.",
    basisLeadIds: ["bridge-entity-a"],
    basisEvidenceRefs: ["evidence:1", "evidence:2"],
    referencedEntityIds: ["entity:a"],
    predictedFootprints: [
      "Role-specific filings, scheduling records, or transactions should independently identify the same administrative function.",
    ],
    disconfirmingEvidence: [
      "Identity resolution or reverse-path research shows the records concern unrelated entities or passive copying.",
    ],
    searchSeeds: [
      "Entity A administrative role primary record",
      "Entity A reverse path calendar payment property",
    ],
    confidence: 0.32,
    status: "hypothesis",
    ...overrides,
  };
}

describe("creative evidence-bounded hypothesis planner", () => {
  it("lets canonical Arbor propose its own mechanism hypothesis while keeping it explicitly hypothetical", async () => {
    const runAgent = selecting([proposal()]);
    const result = await planInvestigationHypotheses({
      leads: [lead],
      instructions: "CANONICAL ARBOR SYSTEM",
      context: {
        userId: "owner",
        projectId: "project",
        conversationId: null,
        turnId: "hypothesis-turn",
      },
      runAgent: runAgent as any,
    });

    expect(result).toEqual({
      proposals: [proposal()],
      plannerRule: "creative_but_evidence_bounded",
    });

    const call = runAgent.mock.calls[0][0];
    expect(call.instructions).toContain(
      "Try questions humans may not have asked",
    );
    expect(call.instructions).toContain(
      "do not invent people, entities, evidence, dates, conduct",
    );
    expect(call.instructions).toContain(
      "Every hypothesis must predict concrete documentary footprints",
    );
    expect(call.allowWebResearch).toBe(false);
    expect(call.verifyCompletion).toBe(false);
  });

  it("rejects a creative hypothesis that invents an evidence ref", async () => {
    const runAgent = selecting([
      proposal({
        basisEvidenceRefs: ["evidence:1", "invented:evidence"],
      }),
    ]);

    await expect(planInvestigationHypotheses({
      leads: [lead],
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "hypothesis-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow("investigation_hypothesis_unknown_evidence");
  });

  it("rejects a hypothesis that introduces an entity outside the supplied graph", async () => {
    const runAgent = selecting([
      proposal({
        referencedEntityIds: ["entity:a", "entity:invented"],
      }),
    ]);

    await expect(planInvestigationHypotheses({
      leads: [lead],
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "hypothesis-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow("investigation_hypothesis_unknown_entity");
  });

  it("rejects confidence that tries to promote a hypothesis into a finding", async () => {
    const runAgent = selecting([
      proposal({ confidence: 0.8 }),
    ]);

    await expect(planInvestigationHypotheses({
      leads: [lead],
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "hypothesis-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow(
      "investigation_hypothesis_confidence_must_remain_hypothetical",
    );
  });

  it("requires explicit disconfirming evidence rather than confirmation-only searching", async () => {
    const runAgent = selecting([
      proposal({ disconfirmingEvidence: [] }),
    ]);

    await expect(planInvestigationHypotheses({
      leads: [lead],
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "hypothesis-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow(
      "investigation_hypothesis_invalid_disconfirming_evidence",
    );
  });

  it("fails closed when Arbor returns prose instead of selecting the structured hypothesis tool", async () => {
    const runAgent = vi.fn(async (): Promise<AgentResult> => ({
      status: "complete",
      text: "Maybe Entity A is important.",
      responseId: "response-1",
      toolCalls: 0,
    }));

    await expect(planInvestigationHypotheses({
      leads: [lead],
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "hypothesis-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow("investigation_hypothesis_no_selection");
  });
});
