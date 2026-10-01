import { describe, expect, it } from "vitest";
import { detectDocumentFamilyCollisions } from "./investigationDocumentFamilyCollision";

describe("document-family collision", () => {
  it("flags one event appearing in records created for different purposes and independent lineages", () => {
    const [result] = detectDocumentFamilyCollisions({
      observations: [
        {
          eventKey: "event:x",
          documentFamily: "calendar",
          purposeKey: "scheduling",
          evidenceRef: "calendar:1",
          lineageKey: "calendar:source",
          entityIds: ["entity:a"],
        },
        {
          eventKey: "event:x",
          documentFamily: "payment",
          purposeKey: "accounting",
          evidenceRef: "payment:1",
          lineageKey: "bank:source",
          entityIds: ["entity:a"],
        },
        {
          eventKey: "event:x",
          documentFamily: "property",
          purposeKey: "land_registry",
          evidenceRef: "deed:1",
          lineageKey: "county:source",
          entityIds: ["entity:a"],
        },
      ],
    });

    expect(result.status).toBe("independent_family_collision");
    expect(result.purposeKeys).toEqual([
      "accounting",
      "land_registry",
      "scheduling",
    ]);
    expect(result.note).toContain("does not by itself establish conduct");
  });

  it("does not call three documents from one operational purpose independent collision", () => {
    const [result] = detectDocumentFamilyCollisions({
      observations: [
        {
          eventKey: "event:x",
          documentFamily: "memo",
          purposeKey: "case_file",
          evidenceRef: "m1",
          lineageKey: "office:1",
          entityIds: [],
        },
        {
          eventKey: "event:x",
          documentFamily: "attachment",
          purposeKey: "case_file",
          evidenceRef: "m2",
          lineageKey: "office:1",
          entityIds: [],
        },
        {
          eventKey: "event:x",
          documentFamily: "summary",
          purposeKey: "case_file",
          evidenceRef: "m3",
          lineageKey: "office:1",
          entityIds: [],
        },
      ],
    });

    expect(result.status).toBe("single_purpose_cluster");
  });
});
