import { describe, expect, it } from "vitest";

import { decideNeedsUser } from "./needsUser.js";

describe("needs_user arbitration", () => {
  it("continues autonomously when there is no material boundary", () => {
    expect(
      decideNeedsUser({
        ambiguityMateriallyChangesResult: false,
        risk: "low",
        externalSideEffect: false,
      }),
    ).toEqual({
      needsUser: false,
      reason: "continue_autonomously",
    });
  });

  it("asks when ambiguity materially changes the result", () => {
    expect(
      decideNeedsUser({
        ambiguityMateriallyChangesResult: true,
        risk: "low",
        externalSideEffect: false,
      }).reason,
    ).toBe("material_ambiguity");
  });

  it("asks for high-risk decisions", () => {
    expect(
      decideNeedsUser({
        ambiguityMateriallyChangesResult: false,
        risk: "high",
        externalSideEffect: false,
      }).reason,
    ).toBe("high_risk");
  });

  it("asks before an external side effect", () => {
    expect(
      decideNeedsUser({
        ambiguityMateriallyChangesResult: false,
        risk: "medium",
        externalSideEffect: true,
      }).reason,
    ).toBe("external_side_effect");
  });
});
