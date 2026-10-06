import { describe, expect, it } from "vitest";
import { analyzeKnowledgeState } from "./investigationKnowledgeState";

describe("documented knowledge-state timing", () => {
  it("flags an action that predates the earliest documented knowledge without claiming the subject lacked knowledge", () => {
    const result = analyzeKnowledgeState({
      knowledge: [{
        subjectId: "person:a",
        factKey: "fact:x",
        learnedAt: "2026-01-10T12:00:00Z",
        evidenceRef: "email:receipt",
        lineageKey: "email:thread-1",
        mode: "explicit_receipt",
      }],
      actions: [{
        subjectId: "person:a",
        actionKey: "action:before",
        actionAt: "2026-01-08T12:00:00Z",
        evidenceRef: "record:action",
        requiredFactKeys: ["fact:x"],
      }],
    });

    expect(result[0]).toMatchObject({
      status: "action_precedes_documented_knowledge",
      earliestDocumentedKnowledgeAt: "2026-01-10T12:00:00Z",
    });
    expect(result[0].note).toContain("not proof");
  });

  it("recognizes when documented knowledge predates the action", () => {
    const result = analyzeKnowledgeState({
      knowledge: [{
        subjectId: "person:a",
        factKey: "fact:x",
        learnedAt: "2026-01-01T12:00:00Z",
        evidenceRef: "record:1",
        lineageKey: "lineage:1",
        mode: "documented_access",
      }],
      actions: [{
        subjectId: "person:a",
        actionKey: "action:later",
        actionAt: "2026-01-02T12:00:00Z",
        evidenceRef: "record:2",
        requiredFactKeys: ["fact:x"],
      }],
    });

    expect(result[0].status).toBe("knowledge_documented_before_action");
  });

  it("keeps no-documentation separate from proof of no knowledge", () => {
    const result = analyzeKnowledgeState({
      knowledge: [],
      actions: [{
        subjectId: "person:a",
        actionKey: "action:1",
        actionAt: "2026-01-02T12:00:00Z",
        evidenceRef: "record:2",
        requiredFactKeys: ["fact:missing"],
      }],
    });

    expect(result[0]).toMatchObject({
      status: "knowledge_not_documented",
      earliestDocumentedKnowledgeAt: null,
    });
  });
});
