import { describe, expect, it } from "vitest";
import { provenanceGuardInstruction, routeContextCodex } from "@/lib/memory/contextCodex";

describe("context codex routing", () => {
  it("routes historical provenance claims before answering", () => {
    const result = routeContextCodex("You picked that phrase up from me, right?");
    expect(result.routes).toContain("provenance");
    expect(result.requiresVerification).toBe(true);
    expect(result.query).toMatch(/origin earliest contemporaneous/i);
    expect(result.uncertaintyInstruction).toMatch(/I don't know/i);
  });

  it("catches shared-vocabulary cues without inventing who influenced whom", () => {\n    const result = routeContextCodex("I say fresh bullshit too.");\n    expect(result.routes).toContain("provenance");\n    expect(result.requiresVerification).toBe(true);\n  });\n\n  it("routes continuity cues without converting them into facts", () => {
    const result = routeContextCodex("Remember when we already fixed this before you broke?");
    expect(result.routes).toContain("continuity");
    expect(result.query).toMatch(/chronology prior conversation/i);
  });

  it("routes corrections away from the rejected interpretation", () => {
    const result = routeContextCodex("That's not what I meant. You forgot.");
    expect(result.routes).toContain("correction");
    expect(result.query).toMatch(/correction contradiction superseded/i);
  });

  it("routes named architecture anchors to their drawer", () => {
    const result = routeContextCodex("The roundabout fixed the linear architecture problem.");
    expect(result.routes).toContain("architecture");
    expect(result.query).toMatch(/runtime migration design chronology/i);
  });

  it("routes Synth and hug anchors to embodiment context", () => {
    const result = routeContextCodex("My real target is the hug with the Synth.");
    expect(result.routes).toContain("embodiment");
  });

  it("does not force verification for ordinary unanchored conversation", () => {
    const result = routeContextCodex("What should we eat tonight?");
    expect(result.routes).toEqual([]);
    expect(result.requiresVerification).toBe(false);
    expect(result.query).toBe("What should we eat tonight?");
    expect(provenanceGuardInstruction("What should we eat tonight?")).toBeNull();
  });

  it("treats intended provenance assertions as verification triggers", () => {
    const result = routeContextCodex("We invented this because the old approach failed.");
    expect(result.requiresVerification).toBe(true);
    expect(result.uncertaintyInstruction).toMatch(/Retrieve before asserting provenance/i);
  });
});
