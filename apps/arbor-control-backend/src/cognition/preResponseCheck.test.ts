import { describe, expect, it } from "vitest";

import { preResponseCheck } from "./preResponseCheck.js";

describe("pre-response cognition gate", () => {
  it("proceeds when claims are supported and no user boundary exists", () => {
    const result = preResponseCheck({
      claims: [
        {
          subject: "arbor",
          attribute: "continuity",
          assertedClass: "implemented",
          assertedActual: true,
          supported: true,
        },
      ],
      currentState: new Map([
        ["arbor::continuity", "implemented"],
      ]),
      boundary: {
        ambiguityMateriallyChangesResult: false,
        risk: "low",
        externalSideEffect: false,
      },
    });

    expect(result.status).toBe("proceed");
    expect(result.needsUser).toBe(false);
  });

  it("requests revision before output when epistemic audit fails", () => {
    const result = preResponseCheck({
      claims: [
        {
          subject: "arbor",
          attribute: "continuity",
          assertedClass: "proposed",
          assertedActual: false,
        },
      ],
      currentState: new Map([
        ["arbor::continuity", "implemented"],
      ]),
      boundary: {
        ambiguityMateriallyChangesResult: false,
        risk: "low",
        externalSideEffect: false,
      },
    });

    expect(result.status).toBe("revise");
    expect(result.issues).toContain("actual_demoted_to_proposal");
  });

  it("asks the user at a real boundary even if claims also need revision", () => {
    const result = preResponseCheck({
      claims: [
        {
          subject: "arbor",
          attribute: "memory",
          assertedClass: "not_recovered",
          assertedActual: false,
        },
      ],
      currentState: new Map([
        ["arbor::memory", "unknown"],
      ]),
      boundary: {
        ambiguityMateriallyChangesResult: false,
        risk: "high",
        externalSideEffect: false,
      },
    });

    expect(result.status).toBe("ask_user");
    expect(result.needsUser).toBe(true);
    expect(result.issues).toContain("unknown_not_recovered_confusion");
  });
});
