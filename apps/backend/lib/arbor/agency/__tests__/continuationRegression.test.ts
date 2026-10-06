import { describe, expect, it } from "vitest";
import type { AgencyState } from "../engine";
import { resolveAgencyGoal } from "../continuation";

const active: AgencyState = {
  goal: "finish the full acoustics implementation and verify it",
  status: "active",
  currentStep: 8,
  unresolvedWork: ["wait for CI", "merge the PR", "inspect agency"],
  recurringWeaknesses: [],
  strategyNotes: [],
  blocker: null,
};

describe("agency continuation regression", () => {
  it.each(["okay", "ok", "k", "yes", "yep", "go", "alright", "you stop again arbor", "list and then do the whole list please", "lets see how much you can do in one go", "do as much as you can please", "if you get stuck move on to the next task", "you dont need to tell me if you know what to do", "do as much as possible", "if you know what to do keep going", "you dont need to ask me if you know what to do"])(
    "keeps the existing action chain for %s",
    (text) => {
      expect(resolveAgencyGoal(text, active)).toEqual({
        goal: active.goal,
        resume: true,
        superseded: false,
      });
    },
  );
  it.each(["okay","ok","k","yes","yep","go"])("does not close or replace a blocked unfinished objective for acknowledgment %s",(text)=>{
    const blocked: AgencyState={...active,status:"blocked",blocker:"external_authority"};
    expect(resolveAgencyGoal(text,blocked)).toEqual({goal:active.goal,resume:true,superseded:false});
  });
});
