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

  it("hydrates a durable ARK execution pointer without dropping its arguments", () => {
    expect(
      normalizeObjective({
        parentGoal: "finish permanence",
        completionCriteria: ["verified"],
        standingAuthorization: ["safe reversible work"],
        hardStops: ["deploy"],
        nextAction: "execute capability: state.inspect",
        checkpoint: "step 3 persisted",
        status: "active",
        revision: 10,
        execution: {
          planId: "ark:plan-1",
          actionId: "execute",
          capability: "state.inspect",
          arguments: { scope: "project" },
          turnId: "turn-1",
          arkObjectiveId: "objective-1",
          status: "dispatched",
        },
      }),
    ).toMatchObject({
      execution: {
        planId: "ark:plan-1",
        capability: "state.inspect",
        arguments: { scope: "project" },
        arkObjectiveId: "objective-1",
        status: "dispatched",
      },
    });
  });

  it("still accepts ordinary string work items", () => {
    expect(normalizeUnresolvedWork([" step one ", "", "step two"])).toEqual([
      "step one",
      "step two",
    ]);
  });
});
