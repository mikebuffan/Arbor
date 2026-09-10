import { describe, expect, it } from "vitest";
import { chooseRecovery } from "../recovery";

describe("agency recovery", () => {
  it("routes around repeated failures when possible", () => {
    expect(
      chooseRecovery({
        attemptCount: 2,
        sameFailureCount: 2,
        alternateRouteAvailable: true,
        needsUserAuthority: false,
        irreversible: false,
      }).disposition,
    ).toBe("alternate_route");
  });

  it("asks only when authority or irreversibility requires it", () => {
    expect(
      chooseRecovery({
        attemptCount: 0,
        sameFailureCount: 0,
        alternateRouteAvailable: true,
        needsUserAuthority: true,
        irreversible: false,
      }).disposition,
    ).toBe("ask_user");
  });

  it("blocks only when no safe route remains", () => {
    expect(
      chooseRecovery({
        attemptCount: 3,
        sameFailureCount: 3,
        alternateRouteAvailable: false,
        needsUserAuthority: false,
        irreversible: false,
      }).disposition,
    ).toBe("block");
  });
});
