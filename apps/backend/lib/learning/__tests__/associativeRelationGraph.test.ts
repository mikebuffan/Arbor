import { describe, expect, it } from "vitest";
import { assertNicknameRelation, contestNicknameRelation, newRelationGraph,
  nicknameOwners, subjectNicknames } from "../associativeRelationGraph";
const scope = { userId: "synthetic-owner", projectId: "synthetic-project" };
const user = "synthetic-user";
const assistant = "synthetic-assistant";
const claim = { ...scope, speakerId: user, addresseeId: assistant,
  subjectRef: "speaker" as const, nicknameId: "Sparrow", evidenceRef: "synthetic-source:1" };

describe("isolated typed relation graph — source assertions, NOT facts or LLM reasoning", () => {
  it("preserves a speaker's nickname when different speakers say my/your", () => {
    const state = assertNicknameRelation(newRelationGraph(scope.userId, scope.projectId), claim);
    const fromAssistant = assertNicknameRelation(state, { ...claim, speakerId: assistant,
      addresseeId: user, subjectRef: "addressee", evidenceRef: "synthetic-source:2" });
    expect(nicknameOwners(fromAssistant, { ...scope, nicknameId: "Sparrow" }).matches.map(x => x.subjectId)).toEqual([user]);
    expect(subjectNicknames(fromAssistant, { ...scope, subjectId: user }).matches[0].evidenceRefs)
      .toEqual(["synthetic-source:1", "synthetic-source:2"]);
    expect(fromAssistant.edges[0].strength).toBeCloseTo(0.55);
  });
  it("never guesses that the alias is exclusive to one person", () => {
    const one = assertNicknameRelation(newRelationGraph(scope.userId, scope.projectId), claim);
    const two = assertNicknameRelation(one, { ...claim, speakerId: assistant,
      evidenceRef: "synthetic-source:other" });
    expect(nicknameOwners(two, { ...scope, nicknameId: "Sparrow" }).matches).toHaveLength(2);
  });
  it("requires scopes and preserves evidence on contest rather than deleting history", () => {
    const one = assertNicknameRelation(newRelationGraph(scope.userId, scope.projectId), claim);
    expect(() => assertNicknameRelation(one, { ...claim, userId: "other" })).toThrow("relation_scope_mismatch");
    const contested = contestNicknameRelation(one, { ...scope, subjectId: user,
      nicknameId: "Sparrow", evidenceRef: "synthetic:dispute" });
    expect(contested.edges[0].status).toBe("contested");
    expect(contested.edges[0].evidenceRefs).toEqual(["synthetic-source:1", "synthetic:dispute"]);
    expect(nicknameOwners(contested, { ...scope, nicknameId: "Sparrow" }).matches).toEqual([]);
    expect(() => assertNicknameRelation(contested, { ...claim, evidenceRef: "synthetic:new" }))
      .toThrow("relation_contested_requires_review");
  });
  it("cannot repeat or retarget an existing source receipt", () => {
    const one = assertNicknameRelation(newRelationGraph(scope.userId, scope.projectId), claim);
    expect(assertNicknameRelation(one, claim)).toBe(one);
    expect(() => assertNicknameRelation(one, { ...claim, nicknameId: "Other" })).toThrow("relation_receipt_conflict");
  });
  it("doesn't turn an assertion into evidence of user authorization", () => {
    const one = assertNicknameRelation(newRelationGraph(scope.userId, scope.projectId), claim);
    const result = nicknameOwners(one, { ...scope, nicknameId: "Sparrow" });
    expect(result.grantsExecution).toBe(false);
    expect(result.sourceKind).toBe("source_assertions_only");
    expect(() => nicknameOwners(one, { ...scope, projectId: "public", nicknameId: "Sparrow" }))
      .toThrow("relation_scope_mismatch");
  });
});