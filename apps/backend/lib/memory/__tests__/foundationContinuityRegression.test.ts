import { describe, expect, it } from "vitest";
import { provenanceGuardInstruction, routeContextCodex } from "@/lib/memory/contextCodex";

describe("foundation continuity regressions", () => {
  const provenanceCases = [
    "You invented Pattern Hop.",
    "I invented Pattern Hop.",
    "We first built this together.",
    "You picked fresh bullshit up from me.",
    "I've always wanted this.",
  ];

  for (const text of provenanceCases) {
    it(`requires evidence for provenance claim: ${text}`, () => {
      const result = routeContextCodex(text);
      expect(result.requiresVerification).toBe(true);
      expect(result.uncertaintyInstruction).toMatch(/I don't know/i);
    });
  }

  it("routes sparse app language into project continuity retrieval", () => {
    const result = routeContextCodex("What am I moving into the app?");
    expect(result.routes).toContain("project");
    expect(result.query).toMatch(/project objective decisions history implementation/i);
  });

  it("does not invent verification requirements for ordinary chat", () => {
    expect(provenanceGuardInstruction("What should we eat tonight?")).toBeNull();
  });
});
