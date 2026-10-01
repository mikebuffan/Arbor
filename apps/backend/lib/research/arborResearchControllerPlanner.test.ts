import { describe, expect, it, vi } from "vitest";
import type { AgentResult } from "@/lib/arbor/agency/openaiAgent";
import type { ResearchControllerContext } from "./researchController";
import { buildArborResearchControllerPlanner } from "./arborResearchControllerPlanner";

const context: ResearchControllerContext = {
  session: {
    id: "session",
    userId: "owner",
    projectId: "project",
    objective: "Follow the strongest bounded public-record lead.",
    status: "running",
    startedAt: "2026-09-28T19:00:00.000Z",
    deadlineAt: "2026-09-28T22:00:00.000Z",
    maxWorkUnits: 20,
    consumedWorkUnits: 2,
    maxCostCents: 100,
    committedCostCents: 4,
    authorized: true,
    cancellationRequested: false,
    unresolvedRequiredWork: 3,
    completedEvidenceRefs: ["evidence:one"],
  },
  units: [{
    unitKey: "timeline-a",
    kind: "research.timeline",
    status: "queued",
    attemptCount: 0,
    maxAttempts: 3,
  }],
  recentReceipts: [{
    unitKey: "prior-a",
    status: "completed",
    evidenceRefs: ["evidence:one"],
    recordedAt: "2026-09-28T19:30:00.000Z",
  }],
};

function agentSelecting(name: string, args: Record<string, unknown>) {
  return vi.fn(async (input: any): Promise<AgentResult> => {
    await input.hooks?.onToolSelected?.({
      round: 0,
      name,
      arguments: args,
    });
    const delegated = await input.executionDelegate?.execute({
      tool: input.tools.get(name),
      args,
      context: input.context,
      attemptedRoutes: [name],
    });
    expect(delegated).toEqual({
      kind: "checkpointed",
      reason: "research_controller_plan_selected",
    });
    return {
      status: "checkpointed",
      text: "research_controller_plan_selected",
      responseId: "response-1",
      toolCalls: 0,
    };
  });
}

describe("canonical Arbor research controller planner adapter", () => {
  it("uses the canonical Arbor agency loop to select an existing durable unit", async () => {
    const runAgent = agentSelecting("research_controller_run_next", {
      rationale: "The queued timeline check is already the best bounded next step.",
    });
    const planner = buildArborResearchControllerPlanner({
      instructions: "CANONICAL ARBOR SYSTEM INSTRUCTIONS",
      context: {
        userId: "owner",
        projectId: "project",
        conversationId: null,
        turnId: "background-turn",
      },
      behaviorRequirements: ["continue when the next safe step is clear"],
      runAgent: runAgent as any,
    });

    await expect(planner.plan({
      goal: context.session.objective,
      context,
    })).resolves.toEqual({
      action: "run_next",
      rationale: "The queued timeline check is already the best bounded next step.",
    });

    expect(runAgent).toHaveBeenCalledOnce();
    const call = runAgent.mock.calls[0][0];
    expect(call.instructions).toContain("CANONICAL ARBOR SYSTEM INSTRUCTIONS");
    expect(call.instructions).toContain("same Arbor agency controller");
    expect(call.instructions).toContain("evidence class is immutable");
    expect(call.instructions).toContain("attempt to break it");
    expect(call.instructions).toContain("not-found-in-searched-scope");
    expect(call.instructions).toContain("DISCOVERY MODE");
    expect(call.instructions).toContain("question a normal name-first search would miss");
    expect(call.instructions).toContain("searches that could both support and kill it");
    expect(call.allowWebResearch).toBe(false);
    expect(call.verifyCompletion).toBe(false);
    expect(call.maxRounds).toBe(2);
    expect(call.behaviorRequirements).toEqual([
      "continue when the next safe step is clear",
    ]);
    expect(call.tools.list().map((tool: any) => tool.name).sort()).toEqual([
      "research_controller_append_then_run",
      "research_controller_await_review",
      "research_controller_blocked",
      "research_controller_run_next",
    ]);
  });

  it("maps Arbor's bounded follow-up selection into controller research units", async () => {
    const runAgent = agentSelecting("research_controller_append_then_run", {
      rationale: "The receipt creates one narrow contradiction follow-up.",
      units: [{
        unitKey: "contradiction-b",
        kind: "research.contradiction",
        description: "Test the dated contradiction against an independent record.",
        payload: { evidenceRef: "evidence:one" },
        maxCostReservationCents: 2,
        maxAttempts: 3,
      }],
    });
    const planner = buildArborResearchControllerPlanner({
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "background-turn",
      },
      runAgent: runAgent as any,
    });

    await expect(planner.plan({
      goal: context.session.objective,
      context,
    })).resolves.toEqual({
      action: "append_then_run",
      rationale: "The receipt creates one narrow contradiction follow-up.",
      units: [{
        unitKey: "contradiction-b",
        kind: "research.contradiction",
        description: "Test the dated contradiction against an independent record.",
        payload: { evidenceRef: "evidence:one" },
        maxCostReservationCents: 2,
        maxAttempts: 3,
      }],
    });
  });

  it("maps genuine review boundaries without executing a planning tool", async () => {
    const runAgent = agentSelecting("research_controller_await_review", {
      rationale: "Original-page human review is required before promotion.",
      unresolvedWork: ["compare original page to extracted text"],
    });
    const planner = buildArborResearchControllerPlanner({
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "background-turn",
      },
      runAgent: runAgent as any,
    });

    await expect(planner.plan({
      goal: context.session.objective,
      context,
    })).resolves.toEqual({
      action: "await_review",
      rationale: "Original-page human review is required before promotion.",
      unresolvedWork: ["compare original page to extracted text"],
    });
  });

  it("fails closed when Arbor returns prose instead of selecting a planning action", async () => {
    const runAgent = vi.fn(async (): Promise<AgentResult> => ({
      status: "complete",
      text: "I would probably continue.",
      responseId: "response-1",
      toolCalls: 0,
    }));
    const planner = buildArborResearchControllerPlanner({
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "background-turn",
      },
      runAgent: runAgent as any,
    });

    await expect(planner.plan({
      goal: context.session.objective,
      context,
    })).rejects.toThrow("research_controller_planner_no_selection");
  });

  it("fails on multiple planner selections in one planning pass", async () => {
    const runAgent = vi.fn(async (input: any): Promise<AgentResult> => {
      await input.hooks.onToolSelected({
        round: 0,
        name: "research_controller_run_next",
        arguments: { rationale: "first" },
      });
      await input.hooks.onToolSelected({
        round: 0,
        name: "research_controller_blocked",
        arguments: { rationale: "second", unresolvedWork: ["boundary"] },
      });
      return {
        status: "checkpointed",
        text: "bad",
        responseId: "response-1",
        toolCalls: 0,
      };
    });
    const planner = buildArborResearchControllerPlanner({
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "background-turn",
      },
      runAgent: runAgent as any,
    });

    await expect(planner.plan({
      goal: context.session.objective,
      context,
    })).rejects.toThrow("research_controller_planner_multiple_selections");
  });
  it("restricts dynamic planner units to kinds actually registered by the host", async () => {
    const runAgent = agentSelecting("research_controller_append_then_run", {
      rationale: "Try an unavailable handler.",
      units: [{
        unitKey: "timeline-b",
        kind: "research.timeline",
        description: "This handler is not registered in the first host.",
        payload: {},
        maxCostReservationCents: 0,
        maxAttempts: 1,
      }],
    });
    const planner = buildArborResearchControllerPlanner({
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "background-turn",
      },
      allowedUnitKinds: ["research.pattern_hop"],
      runAgent: runAgent as any,
    });

    await expect(planner.plan({
      goal: context.session.objective,
      context,
    })).rejects.toThrow(
      "research_controller_planner_unregistered_unit_kind",
    );
  });

  it("feeds grounded discovery leads back into canonical Arbor so it can create a novel bounded hypothesis search", async () => {
    const discoveryContext: ResearchControllerContext = {
      ...context,
      units: [],
      recentReceipts: [{
        unitKey: "discovery-a",
        status: "completed",
        evidenceRefs: ["evidence:one", "evidence:two", "evidence:three"],
        recordedAt: "2026-09-28T19:40:00.000Z",
        result: {
          discoveryLeads: [{
            id: "bridge-entity-a",
            kind: "bridge_node",
            status: "hypothesis",
            hypothesis: "Entity A may bridge separate record clusters.",
            basisEvidenceRefs: [
              "evidence:one",
              "evidence:two",
              "evidence:three",
            ],
            entityIds: ["entity:a"],
            independentLineages: ["lineage:a", "lineage:b"],
            documentFamilies: ["calendar", "payment", "property"],
            predictedFootprints: [
              "Independent role records should reproduce the bridge.",
            ],
            falsifiers: [
              "Reverse reconstruction does not reproduce the relationship.",
            ],
            searchSeeds: ["Entity A calendar payment property"],
          }],
          independentlyVerifiedFinding: false,
        },
      }],
    };
    const runAgent = agentSelecting("research_controller_append_then_run", {
      rationale:
        "The bridge anomaly supports one reverse-path hypothesis worth trying from an unsaturated edge.",
      units: [{
        unitKey: "hypothesis-bridge-reverse-a",
        kind: "research.pattern_hop",
        description:
          "Hypothesis only: test whether Entity A is a real bridge by reconstructing the relationship backward from property records.",
        payload: {
          seed: "Entity A property calendar payment independent record",
          objective:
            "Try to disprove the bridge hypothesis using primary records and reverse reconstruction.",
          maxDepth: 2,
          maxHopsPerAttempt: 4,
        },
        maxCostReservationCents: 0,
        maxAttempts: 3,
      }],
    });
    const planner = buildArborResearchControllerPlanner({
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "background-turn",
      },
      allowedUnitKinds: ["research.pattern_hop"],
      runAgent: runAgent as any,
    });

    await expect(planner.plan({
      goal: discoveryContext.session.objective,
      context: discoveryContext,
    })).resolves.toMatchObject({
      action: "append_then_run",
      units: [{
        kind: "research.pattern_hop",
        payload: {
          maxDepth: 2,
          maxHopsPerAttempt: 4,
        },
      }],
    });

    const call = runAgent.mock.calls[0][0];
    expect(call.userText).toContain("bridge-entity-a");
    expect(call.userText).toContain("evidence:three");
    expect(call.userText).toContain("independentlyVerifiedFinding");
    expect(call.instructions).toContain("Do not merely repeat their search seeds");
    expect(call.instructions).toContain("prefer bridge nodes/edges");
  });

});
