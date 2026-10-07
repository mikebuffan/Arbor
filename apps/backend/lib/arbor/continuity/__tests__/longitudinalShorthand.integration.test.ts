import { describe, expect, it } from "vitest";
import type { AgencyState } from "../../agency/engine";
import { buildAgencySessionState } from "../../agency/session";
import { splitAgencyWork } from "../../agency/openLoops";
import {
  explicitlyContinues,
  explicitlySupersedes,
  shouldCarryGoal,
} from "../longitudinalPolicy";

const prior = (status: AgencyState["status"] = "active"): AgencyState => ({
  goal: "finish One Arbor evidence-based integration",
  status,
  currentStep: 7,
  unresolvedWork: ["verify next tested implementation"],
  recurringWeaknesses: [],
  strategyNotes: [],
  blocker: status === "blocked" ? "external_authority" : null,
  objective: {
    parentGoal: "finish One Arbor evidence-based integration",
    status: status === "complete" ? "complete" : status,
    completionCriteria: ["verified source acceptance"],
    standingAuthorization: ["continue reversible scoped work"],
    hardStops: ["external authority"],
    nextAction: "verify next tested implementation",
    checkpoint: "tested step 7",
    revision: 4,
  },
});

describe("One Arbor shorthand and checkpoint return", () => {
  it.each([
    "list prompt go", "List, prompt, go", "prompt and go",
    "list prompt then go", "go go buffalo",
  ])("treats %s as continuation when prior work is active", text => {
    expect(explicitlyContinues(text)).toBe(true);
    const next = buildAgencySessionState({ userText: text, prior: prior() });
    expect(next.goal).toBe(prior().goal);
    expect(next.currentStep).toBe(7);
    expect(splitAgencyWork(next.unresolvedWork).suspended).toHaveLength(0);
  });

  it.each([
    "Anything else?", "is there anything else", "more?", "what else can we check?",
  ])("treats %s as bounded follow-up only for unfinished work", text => {
    expect(shouldCarryGoal(text, prior())).toBe(true);
    expect(shouldCarryGoal(text, prior("checkpointed"))).toBe(true);
    expect(shouldCarryGoal(text, prior("complete"))).toBe(false);
    expect(shouldCarryGoal(text, null)).toBe(false);
    const next = buildAgencySessionState({ userText: text, prior: prior() });
    expect(next.goal).toBe(prior().goal);
    expect(next.currentStep).toBe(7);
  });

  it("does not let a more-work follow-up clear a protected blocker", () => {
    const next = buildAgencySessionState({ userText: "Anything else?", prior: prior("blocked") });
    expect(next.goal).toBe(prior().goal);
    expect(next.status).toBe("blocked");
    expect(next.blocker).toBe("external_authority");
  });

  it("resumes an explicitly checkpointed goal rather than creating a new 'go' task", () => {
    const next = buildAgencySessionState({ userText: "go", prior: prior("checkpointed") });
    expect(next.goal).toBe(prior().goal);
    expect(next.currentStep).toBe(7);
    expect(next.objective?.revision).toBe(5);
    expect(splitAgencyWork(next.unresolvedWork).current).toEqual(["verify next tested implementation"]);
  });

  it("does not manufacture work if there is no existing goal", () => {
    expect(shouldCarryGoal("list prompt go", null)).toBe(false);
    expect(shouldCarryGoal("go", prior("complete"))).toBe(false);
  });

  it("does not mistake a STOP/switch for authorization to continue", () => {
    expect(explicitlyContinues("do not go")).toBe(false);
    expect(explicitlySupersedes("stop that and switch to the new plan")).toBe(true);
    const switched = buildAgencySessionState({
      userText: "Stop that. New task: review safe source", prior: prior(),
    });
    expect(switched.goal).toContain("New task");
    expect(splitAgencyWork(switched.unresolvedWork).suspended).toHaveLength(0);
  });

  it("does not invert negated STOP, drop or switch instructions", () => {
    for (const message of [
      "Don't stop this; keep going",
      "Do not drop that",
      "Never switch goals",
      "Don't forget that",
      "Do not change the goal",
    ]) {
      expect(explicitlySupersedes(message)).toBe(false);
      expect(buildAgencySessionState({ userText: message, prior: prior() }).goal)
        .toBe(prior().goal);
    }
    expect(explicitlySupersedes(
      "Don't stop this. Instead, switch to the other task",
    )).toBe(true);
  });

  it("keeps a protected blocker on shorthand resume, absent trusted clearance", () => {
    const blocked = prior("blocked");
    const next = buildAgencySessionState({
      userText: "list prompt go", prior: blocked,
    });
    expect(next.goal).toBe(blocked.goal);
    expect(next.status).toBe("blocked");
    expect(next.blocker).toBe("external_authority");
    expect(next.objective?.status).toBe("blocked");
  });
});
