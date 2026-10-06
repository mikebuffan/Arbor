import { describe, expect, it } from "vitest";
import { detectRoleActionMismatches } from "./investigationRoleMismatch";

describe("role/action mismatch", () => {
  it("flags a recurring action outside the documented role only after independent lineages support it", () => {
    const result = detectRoleActionMismatches({
      profiles: [{
        subjectId: "person:a",
        roleKey: "scheduler",
        expectedActionTags: ["schedule", "confirm"],
        basisEvidenceRefs: ["job:description"],
      }],
      actions: [
        {
          subjectId: "person:a",
          actionTag: "property_transfer",
          occurredAt: "2026-01-01T00:00:00Z",
          evidenceRef: "deed:1",
          lineageKey: "property:county",
        },
        {
          subjectId: "person:a",
          actionTag: "property_transfer",
          occurredAt: "2026-02-01T00:00:00Z",
          evidenceRef: "filing:2",
          lineageKey: "corporate:registry",
        },
      ],
    });

    expect(result[0]).toMatchObject({
      actionTag: "property_transfer",
      status: "role_action_mismatch_lead",
    });
    expect(result[0].note).toContain("not evidence of misconduct");
  });

  it("does not treat expected actions as mismatch leads", () => {
    const result = detectRoleActionMismatches({
      profiles: [{
        subjectId: "person:a",
        roleKey: "scheduler",
        expectedActionTags: ["schedule"],
        basisEvidenceRefs: ["job:description"],
      }],
      actions: [{
        subjectId: "person:a",
        actionTag: "schedule",
        occurredAt: "2026-01-01T00:00:00Z",
        evidenceRef: "calendar:1",
        lineageKey: "calendar:1",
      }],
    });

    expect(result[0].status).toBe("within_documented_role");
  });
});
