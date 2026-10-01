import { describe, expect, it, vi } from "vitest";
import type { AgentResult } from "@/lib/arbor/agency/openaiAgent";
import { planInvestigationQuestions } from "./investigationQuestionMiner";

const candidates = [
  {
    id: "question-source-1",
    sourceRef: "public:discussion:1",
    lineageKey: "lineage:discussion:1",
    questionText:
      "Why did Entity A appear in the property records right after the calendar event?",
    mentionedEntityIds: ["entity:a"],
    proposedAnswerText:
      "The author speculates that Entity A must have coordinated both events.",
  },
  {
    id: "question-source-2",
    sourceRef: "public:discussion:2",
    lineageKey: "lineage:discussion:2",
    questionText:
      "Was Entity A's property-record appearance connected to the earlier calendar event?",
    mentionedEntityIds: ["entity:a"],
    proposedAnswerText: null,
  },
];

function selecting(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (input: any): Promise<AgentResult> => {
    await input.hooks.onToolSelected({
      round: 0,
      name: "investigation_submit_question_seeds",
      arguments: {
        questions: [{
          id: "neutral-question-1",
          sourceCandidateIds: [
            "question-source-1",
            "question-source-2",
          ],
          neutralQuestion:
            "What documented relationship, if any, exists between Entity A's calendar appearance and later property-record appearance?",
          inheritedAssumptions: [
            "The source author assumes one person coordinated both events.",
          ],
          entityIds: ["entity:a"],
          primarySourceTargets: [
            "Original calendar record",
            "Original property transfer record",
          ],
          disconfirmingSearches: [
            "Search for ordinary administrative explanations that would place Entity A in both record sets without coordination.",
          ],
          searchSeeds: [
            "Entity A calendar property primary record chronology",
          ],
          status: "unresolved_question",
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

describe("investigation question miner", () => {
  it("separates the unresolved question from the source author's proposed answer", async () => {
    const runAgent = selecting();
    const result = await planInvestigationQuestions({
      candidates,
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "question-turn",
      },
      runAgent: runAgent as any,
    });

    expect(result.rule).toBe("question_without_inherited_answer");
    expect(result.questions[0]).toMatchObject({
      status: "unresolved_question",
      entityIds: ["entity:a"],
      sourceCandidateIds: [
        "question-source-1",
        "question-source-2",
      ],
    });
    expect(result.questions[0].neutralQuestion).toContain("if any");
    expect(result.questions[0].inheritedAssumptions[0]).toContain(
      "assumes",
    );

    const call = runAgent.mock.calls[0][0];
    expect(call.instructions).toContain(
      "Harvest the unresolved question, not the source author's proposed answer",
    );
    expect(call.instructions).toContain(
      "Every question must identify primary-source targets",
    );
  });

  it("rejects a question that invents a named entity outside the source candidates", async () => {
    const runAgent = selecting({
      entityIds: ["entity:a", "entity:invented"],
    });

    await expect(planInvestigationQuestions({
      candidates,
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "question-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow("investigation_question_unknown_entity");
  });

  it("requires a disconfirming search instead of confirmation-only question mining", async () => {
    const runAgent = selecting({
      disconfirmingSearches: [],
    });

    await expect(planInvestigationQuestions({
      candidates,
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "question-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow(
      "investigation_question_invalid_disconfirming_searches",
    );
  });

  it("preserves all source candidate IDs when merging duplicate questions", async () => {
    const runAgent = selecting();
    const result = await planInvestigationQuestions({
      candidates,
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "question-turn",
      },
      runAgent: runAgent as any,
    });

    expect(result.questions[0].sourceCandidateIds).toEqual([
      "question-source-1",
      "question-source-2",
    ]);
  });

  it("fails closed if the planner returns prose instead of a structured question reservoir", async () => {
    const runAgent = vi.fn(async (): Promise<AgentResult> => ({
      status: "complete",
      text: "People are wondering about Entity A.",
      responseId: "response-1",
      toolCalls: 0,
    }));

    await expect(planInvestigationQuestions({
      candidates,
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "question-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow("investigation_question_no_selection");
  });
});
