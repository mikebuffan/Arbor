import { describe, expect, it } from "vitest";
import { normalizeObjective, normalizeUnresolvedWork } from "../state";

describe("agency state hydration", () => {
  it("preserves legacy structured unresolved work instead of erasing it", () => {
    expect(
      normalizeUnresolvedWork([
        {
          id: "chatgpt-canonical-path-recovery",
          objective: "Restore canonical Arbor.",
          exactNextAction: "Wire durable runtime carrier.",
        },
      ]),
    ).toEqual(["Wire durable runtime carrier."]);
  });


  it("rejects malformed durable objectives instead of trusting partial JSON", () => {
    expect(normalizeObjective({ parentGoal: "goal", status: "active" })).toBeUndefined();
    expect(normalizeObjective({ parentGoal: "", status: "active", revision: 2 })).toBeUndefined();
  });

  it("hydrates a valid checkpointed objective", () => {
    expect(
      normalizeObjective({
        parentGoal: "finish permanence",
        completionCriteria: ["verified"],
        standingAuthorization: ["safe reversible work"],
        hardStops: ["deploy"],
        nextAction: "resume checkpoint",
        checkpoint: "round ceiling",
        status: "checkpointed",
        revision: 9,
      }),
    ).toMatchObject({
      parentGoal: "finish permanence",
      status: "checkpointed",
      revision: 9,
      nextAction: "resume checkpoint",
    });
  });

  it("still accepts ordinary string work items", () => {
    expect(normalizeUnresolvedWork([" step one ", "", "step two"])).toEqual([
      "step one",
      "step two",
    ]);
  });
});
