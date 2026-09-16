import { describe, expect, it } from "vitest";
import {
  addEvidenceUnique,
  enqueueHop,
  finishBranch,
  objectiveComplete,
  rankEvidence,
  takeNextHop,
  type PatternHopEvidence,
  type PatternHopState,
} from "@/lib/memory/patternHop";
import {
  patternHopBranchClue,
  patternHopClueTerms,
} from "@/lib/memory/patternHopResearch";
import { classifyHistoricalEvidence } from "@/lib/memory/patternHopRetrieval";

const base = (): PatternHopState => ({
  objective: "trace",
  maxDepth: 3,
  frontier: [],
  visited: [],
  completedBranches: [],
  exhaustedBranches: [],
  status: "active",
});

describe("pattern hop", () => {
  it("deduplicates evidence", () => {
    const e: PatternHopEvidence = {
      id: "1",
      source: "chatgpt",
      sourceMessageId: "m1",
      evidenceType: "direct_user",
      content: "keep going",
      confidence: 0.9,
      epistemicStatus: "direct",
    };
    expect(addEvidenceUnique([e], [{ ...e, id: "2" }])).toHaveLength(1);
  });

  it("prevents circular hops", () => {
    let s = enqueueHop(base(), {
      evidenceId: "1",
      clue: "agency",
      depth: 1,
      branch: "behavior",
    });
    const taken = takeNextHop(s);
    s = taken.state;
    expect(
      enqueueHop(s, {
        evidenceId: "1",
        clue: "agency",
        depth: 1,
        branch: "behavior",
      }).frontier,
    ).toHaveLength(0);
  });

  it("bounds hop depth", () => {
    expect(
      enqueueHop(base(), {
        evidenceId: "1",
        clue: "x",
        depth: 4,
        branch: "x",
      }).frontier,
    ).toHaveLength(0);
  });

  it("keeps contemporaneous chronology before retrospective evidence", () => {
    const rows: PatternHopEvidence[] = [
      {
        id: "late",
        source: "chatgpt",
        evidenceType: "summary",
        content: "later",
        occurredAt: "2026-01-01",
        confidence: 1,
        epistemicStatus: "retrospective",
      },
      {
        id: "early",
        source: "chatgpt",
        evidenceType: "user",
        content: "early",
        occurredAt: "2025-01-01",
        confidence: 0.8,
        epistemicStatus: "direct",
      },
    ];
    expect(rankEvidence(rows)[0].id).toBe("early");
  });

  it("preserves contradictory evidence instead of suppressing it", () => {
    const rows: PatternHopEvidence[] = [
      {
        id: "a",
        source: "chatgpt",
        evidenceType: "assistant_claim",
        content: "I already changed permanently",
        occurredAt: "2025-01-01",
        confidence: 0.99,
        epistemicStatus: "hypothesis",
      },
      {
        id: "b",
        source: "chatgpt",
        evidenceType: "correction",
        content: "That did not actually persist",
        occurredAt: "2025-01-02",
        confidence: 0.8,
        epistemicStatus: "contradictory",
      },
    ];
    expect(rankEvidence(rows).map((row) => row.id)).toEqual(["a", "b"]);
    expect(rankEvidence(rows)[1].epistemicStatus).toBe("contradictory");
  });

  it("does not confuse branch exhaustion with nonexistence", () => {
    const s = finishBranch(base(), "phrase", false);
    expect(s.status).toBe("active");
    expect(s.exhaustedBranches).toContain("phrase");
  });

  it("requires all branches and empty frontier for parent completion", () => {
    const s = {
      ...base(),
      completedBranches: ["phrase"],
      exhaustedBranches: ["code"],
    };
    expect(objectiveComplete(s, ["phrase", "code"])).toBe(true);
    expect(objectiveComplete(s, ["phrase", "code", "chronology"])).toBe(false);
  });

  it("generates distinct causal, terminology, implementation and retrospective clues", () => {
    const seed = "Arbor agency stopped after retrieval";
    expect(patternHopBranchClue("causal_predecessors", seed)).toContain("earlier cause origin");
    expect(patternHopBranchClue("terminology_changes", seed)).toContain("called named term renamed");
    expect(patternHopBranchClue("implementation_architecture", seed)).toContain("code schema backend");
    expect(patternHopBranchClue("retrospective_references", seed)).toContain("remember later said");
  });

  it("extracts useful clue terms from sparse or noisy text", () => {
    expect(patternHopClueTerms("Arbr agncy retrival fail")).toEqual(
      expect.arrayContaining(["Arbr", "agncy", "retrival", "fail"]),
    );
  });

  it("does not turn assistant speech into user-authored proof", () => {
    const assistant = classifyHistoricalEvidence("assistant");
    const user = classifyHistoricalEvidence("user");
    expect(assistant.evidenceType).toBe("direct_assistant_behavior");
    expect(user.evidenceType).toBe("direct_user_statement");
    expect(assistant.evidenceType).not.toBe(user.evidenceType);
  });

  it("marks retrospective material separately", () => {
    expect(classifyHistoricalEvidence("user", true)).toEqual({
      evidenceType: "retrospective_statement",
      epistemicStatus: "retrospective",
    });
  });
});
