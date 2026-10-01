import { describe, expect, it } from "vitest";
import { analyzeWhyNow } from "./investigationWhyNow";

const events = [
  {
    id: "before",
    entityIds: ["entity:a"],
    eventTag: "message",
    occurredAt: "2026-01-09T00:00:00Z",
    evidenceRef: "message:1",
    lineageKey: "message:thread",
  },
  {
    id: "focal",
    entityIds: ["entity:a"],
    eventTag: "property_sale",
    occurredAt: "2026-01-10T00:00:00Z",
    evidenceRef: "deed:1",
    lineageKey: "property:county",
  },
  {
    id: "after",
    entityIds: ["entity:a"],
    eventTag: "payment",
    occurredAt: "2026-01-11T00:00:00Z",
    evidenceRef: "payment:1",
    lineageKey: "bank:record",
  },
];

describe("why-now event windows", () => {
  it("collects independently sourced events immediately before and after a material change", () => {
    const result = analyzeWhyNow({
      focalEventId: "focal",
      events,
      backwardWindowMs: 2 * 24 * 60 * 60 * 1000,
      forwardWindowMs: 2 * 24 * 60 * 60 * 1000,
    });

    expect(result.before.map((event) => event.id)).toEqual(["before"]);
    expect(result.after.map((event) => event.id)).toEqual(["after"]);
    expect(result.independentLineages).toEqual([
      "bank:record",
      "message:thread",
      "property:county",
    ]);
    expect(result.note).toContain("does not establish causation");
  });

  it("does not include distant events outside the chosen window", () => {
    const result = analyzeWhyNow({
      focalEventId: "focal",
      events: [
        ...events,
        {
          id: "far",
          entityIds: ["entity:a"],
          eventTag: "travel",
          occurredAt: "2025-01-01T00:00:00Z",
          evidenceRef: "travel:old",
          lineageKey: "travel:old",
        },
      ],
      backwardWindowMs: 5 * 24 * 60 * 60 * 1000,
    });

    expect(result.before.some((event) => event.id === "far")).toBe(false);
  });
});
