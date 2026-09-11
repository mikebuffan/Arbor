import { describe, expect, it } from "vitest";
import {
  buildVoiceInstructions,
  voiceSpeechSpeed,
} from "../identity";

describe("Arbor voice identity", () => {
  it("locks the Pacific Northwest / General American baseline and rejects British drift", () => {
    const instructions = buildVoiceInstructions("arbor");

    expect(instructions).toContain(
      "Pacific Northwest / General American",
    );
    expect(instructions).toContain("rhotic");
    expect(instructions).toContain("Avoid British");
    expect(instructions).toContain(
      "Release phrase endings promptly",
    );
    expect(instructions).toContain(
      "Keep vowels compact and clean",
    );
    expect(instructions).toContain(
      "short, ordinary conversational pauses",
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
    expect(instructions).toContain(
      "vowels and phrase endings must remain acoustically stable and American",
    );
  });

  it("uses a slightly quicker conversational speed without speeding narration", () => {
    expect(voiceSpeechSpeed("arbor")).toBe(1.05);
    expect(voiceSpeechSpeed("annabelle")).toBe(1.0);
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
