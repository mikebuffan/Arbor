import { describe, expect, it } from "vitest";
import { safeArborReturnPath } from "../safeReturnPath";

describe("Arbor sign-in return path containment", () => {
  it("allows a local route and its ordinary query/hash parameters", () => {
    expect(safeArborReturnPath("/")).toBe("/");
    expect(safeArborReturnPath("/vault?view=read#recent")).toBe("/vault?view=read#recent");
  });

  it.each([
    null, "", "vault", "https://attacker.example", "//attacker.example",
    "/\\attacker.example", "/%2fattacker.example", "/%5cattacker.example",
    "/vault%2fadmin", "/vault%5cadmin", "/vault\nnext",
  ])("rejects unsafe return target %s", (value) => {
    expect(safeArborReturnPath(value)).toBe("/");
  });
});
