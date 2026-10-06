import { describe, expect, it, vi } from "vitest";
import type { AgentResult } from "@/lib/arbor/agency/openaiAgent";
import {
  compareBlindReconstructionToNarrative,
  planBlindReconstruction,
  type BlindInvestigationRecord,
} from "./investigationBlindReconstruction";

const records: BlindInvestigationRecord[] = [
  {
    evidenceRef: "evidence:calendar",
    lineageKey: "lineage:calendar",
    documentFamily: "calendar",
    occurredAt: "2026-01-01T10:00:00Z",
    entityIds: ["entity:a"],
    eventTags: ["scheduled"],
    contentSummary:
      "A calendar entry places Entity A at a scheduled event on January 1.",
  },
  {
    evidenceRef: "evidence:payment",
    lineageKey: "lineage:payment",
    documentFamily: "payment",
    occurredAt: "2026-01-02T09:00:00Z",
    entityIds: ["entity:a", "entity:b"],
    eventTags: ["payment"],
    contentSummary:
      "A payment record links Entity A and Entity B on January 2.",
  },
];

function selecting(eventOverrides: Record<string, unknown> = {}) {
  return vi.fn(async (input: any): Promise<AgentResult> => {
    const events = [{
      id: "event-1",
      description:
        "Entity A appears in independent scheduling and payment records across January 1-2.",
      evidenceRefs: ["evidence:calendar", "evidence:payment"],
      entityIds: ["entity:a", "entity:b"],
      earliestAt: "2026-01-01T10:00:00Z",
      latestAt: "2026-01-02T09:00:00Z",
      alternatives: [
        "The records reflect ordinary unrelated administrative activity.",
      ],
      uncertainty:
        "The records do not by themselves establish why the payment occurred.",
      status: "reconstruction_hypothesis",
      ...eventOverrides,
    }];

    await input.hooks.onToolSelected({
      round: 0,
      name: "investigation_submit_blind_reconstruction",
      arguments: {
        events,
        unresolvedQuestions: [
          "What primary record explains the purpose of the payment?",
        ],
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

describe("blind reconstruction", () => {
  it("reconstructs from record envelopes before receiving any outside narrative", async () => {
    const runAgent = selecting();
    const result = await planBlindReconstruction({
      records,
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "blind-turn",
      },
      runAgent: runAgent as any,
    });

    expect(result.rule).toBe("raw_records_before_narrative");
    expect(result.events[0]).toMatchObject({
      status: "reconstruction_hypothesis",
      evidenceRefs: ["evidence:calendar", "evidence:payment"],
    });

    const call = runAgent.mock.calls[0][0];
    expect(call.userText).toContain('"narrativeProvided":false');
    expect(call.instructions).toContain(
      "You have NOT been given the accepted public, prosecutorial, defense, media, or user narrative",
    );
    expect(call.instructions).toContain(
      "Do not fill documentary gaps",
    );
    expect(call.allowWebResearch).toBe(false);
  });

  it("rejects a reconstruction that invents an evidence object", async () => {
    const runAgent = selecting({
      evidenceRefs: ["evidence:calendar", "invented:evidence"],
    });

    await expect(planBlindReconstruction({
      records,
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "blind-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow("blind_reconstruction_unknown_evidence");
  });

  it("rejects an invented entity even if the prose sounds plausible", async () => {
    const runAgent = selecting({
      entityIds: ["entity:a", "entity:invented"],
    });

    await expect(planBlindReconstruction({
      records,
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "blind-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow("blind_reconstruction_unknown_entity");
  });

  it("requires an alternative explanation for every reconstructed event", async () => {
    const runAgent = selecting({ alternatives: [] });

    await expect(planBlindReconstruction({
      records,
      instructions: "CANONICAL ARBOR",
      context: {
        userId: "owner",
        projectId: "project",
        turnId: "blind-turn",
      },
      runAgent: runAgent as any,
    })).rejects.toThrow(
      "blind_reconstruction_invalid_event_alternatives",
    );
  });

  it("compares the blind reconstruction to a narrative only after reconstruction and surfaces chronology tensions", () => {
    const reconstruction = {
      rule: "raw_records_before_narrative" as const,
      unresolvedQuestions: [],
      events: [{
        id: "event-1",
        description: "Synthetic event window.",
        evidenceRefs: ["evidence:calendar"],
        entityIds: ["entity:a"],
        earliestAt: "2026-01-01T10:00:00Z",
        latestAt: "2026-01-02T10:00:00Z",
        alternatives: ["Ordinary activity."],
        uncertainty: "Purpose unknown.",
        status: "reconstruction_hypothesis" as const,
      }],
    };

    const comparison = compareBlindReconstructionToNarrative({
      reconstruction,
      narrativeAssertions: [
        {
          id: "narrative-overlap",
          description: "Narrative says Entity A event occurred January 10.",
          evidenceRefs: ["evidence:calendar"],
          entityIds: ["entity:a"],
          occurredAt: "2026-01-10T10:00:00Z",
        },
        {
          id: "narrative-only",
          description: "Narrative adds another event.",
          evidenceRefs: ["evidence:not-in-reconstruction"],
          entityIds: ["entity:z"],
          occurredAt: "2026-01-20T10:00:00Z",
        },
      ],
      chronologyToleranceMs: 0,
    });

    expect(comparison.narrativeOnlyAssertions).toEqual([
      "narrative-only",
    ]);
    expect(comparison.chronologyTensions).toHaveLength(1);
    expect(comparison.chronologyTensions[0]).toMatchObject({
      narrativeAssertionId: "narrative-overlap",
      reconstructionEventId: "event-1",
    });
    expect(comparison.note).toContain("investigation lead");
  });

  it("does not call divergence proof that the narrative is wrong", () => {
    const comparison = compareBlindReconstructionToNarrative({
      reconstruction: {
        rule: "raw_records_before_narrative",
        unresolvedQuestions: [],
        events: [{
          id: "event-1",
          description: "Record-derived event.",
          evidenceRefs: ["evidence:1"],
          entityIds: ["entity:a"],
          earliestAt: null,
          latestAt: null,
          alternatives: ["Alternative."],
          uncertainty: "Unknown.",
          status: "reconstruction_hypothesis",
        }],
      },
      narrativeAssertions: [],
    });

    expect(comparison.reconstructionOnlyEvents).toEqual(["event-1"]);
    expect(comparison.note).toBe(
      "Divergence is an investigation lead, not proof that either reconstruction is correct.",
    );
  });
});
