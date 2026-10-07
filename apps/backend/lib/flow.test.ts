import { describe, expect, it } from "vitest";
import { buildNextMove } from "./flow";
import { PERSONAS } from "./persona";

describe("legacy flow humor compatibility", () => {
  const cues = {
    comingUpScore: 30,
    goingDownScore: 0,
    signals: ["fixture"],
  };

  it("does not let humorLevel alone create a humor opportunity", () => {
    const result = buildNextMove({
      persona: { ...PERSONAS.arbor_masc, humorLevel: 3 },
      cues,
      memory: {},
      latestUserText: "I finished the task.",
    });

    expect(result.prompt.startsWith("Quick detour.")).toBe(true);
    expect(result.prompt).not.toContain("coming back up");
  });

  it("lets current conversational context, not the numeric level, open the playful wording", () => {
    const result = buildNextMove({
      persona: { ...PERSONAS.arbor_masc, humorLevel: 1 },
      cues,
      memory: {},
      latestUserText: "lol this is ridiculous",
    });

    expect(result.prompt).toContain("coming back up");
  });
});
