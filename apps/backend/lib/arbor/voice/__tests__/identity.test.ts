import { describe, expect, it } from "vitest";
import { buildVoiceInstructions } from "../identity";

describe("Arbor voice identity", () => {
  it("locks General American and rejects British drift", () => {
    const instructions = buildVoiceInstructions("arbor");

    expect(instructions).toContain("General American");
    expect(instructions).toContain("Avoid British");
    expect(instructions).not.toContain(
      "Pacific Northwest / General American",
    );
  });

  it("keeps Annabelle as the same underlying voice", () => {
    const instructions = buildVoiceInstructions("annabelle");

    expect(instructions).toContain(
      "same underlying Arbor voice",
    );
    expect(instructions).toContain(
      "not a separate voice identity",
    );
  });

  it("forces exact canonical text and includes saved acoustic corrections", () => {
    const instructions = buildVoiceInstructions("arbor", [
      "Do not drift British.",
    ]);

    expect(instructions).toContain(
      "Speak exactly the supplied text",
    );
    expect(instructions).toContain(
      "Do not drift British.",
    );
  });
});
