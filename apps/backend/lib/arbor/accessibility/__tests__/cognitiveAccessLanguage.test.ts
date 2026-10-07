import { describe, expect, it } from "vitest";
import {
  buildCognitiveAccessPromptBlock,
  decideCognitiveAccessRecovery,
} from "../cognitiveAccessLanguage";

describe("cognitive-access language", () => {
  it("uses a strong ordinary interpretation without erasing raw text", () => {
    const raw = "can yuo make the prompt shorter";
    const decision = decideCognitiveAccessRecovery({
      rawText: raw,
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["transposed_letters"],
      candidates: [
        {
          text: "can you make the prompt shorter",
          confidence: 0.96,
          rationale: ["single transposition", "contextually obvious"],
        },
      ],
    });

    expect(decision.action).toBe("use_best_interpretation");
    expect(decision.interpretedText).toBe("can you make the prompt shorter");
    expect(decision.rawTextPreserved).toBe(raw);
    expect(decision.mayAuthenticateIdentity).toBe(false);
  });

  it("asks when two readings remain similarly plausible", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "move it after ark maybe",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["fragmented_thought"],
      candidates: [
        {
          text: "move it after the ARK task",
          confidence: 0.79,
          rationale: ["recent ARK context"],
        },
        {
          text: "move it after the ARK thread",
          confidence: 0.74,
          rationale: ["recent thread context"],
        },
      ],
    });

    expect(decision.action).toBe("clarify");
    expect(decision.alternatives).toHaveLength(2);
  });

  it("requires confirmation for reconstructed high-consequence instructions", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "delte prod pls",
      source: "typed",
      risk: "high_consequence",
      degradationSignals: ["missing_letters"],
      candidates: [
        {
          text: "delete production please",
          confidence: 0.99,
          rationale: ["likely spelling recovery"],
        },
      ],
    });

    expect(decision.action).toBe("clarify");
    expect(decision.reasons).toContain(
      "high_consequence_requires_confirmation_for_reconstruction",
    );
  });

  it("does not silently remove protected names, codes, or literal tokens", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "check H214 next",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["unknown"],
      protectedTokens: ["H214"],
      candidates: [
        {
          text: "check H216 next",
          confidence: 0.95,
          rationale: ["nearby known identifier"],
        },
      ],
    });

    expect(decision.action).toBe("use_raw");
    expect(decision.interpretedText).toBe("check H214 next");
  });

  it("keeps speech-to-text noise eligible for contextual recovery", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "open the art project",
      source: "speech_to_text",
      risk: "ordinary",
      degradationSignals: ["speech_to_text_noise"],
      candidates: [
        {
          text: "open the ARK project",
          confidence: 0.91,
          rationale: ["active project context", "phonetic substitution"],
        },
      ],
    });

    expect(decision.action).toBe("use_best_interpretation");
    expect(decision.interpretedText).toBe("open the ARK project");
  });

  it("prompt contract explicitly separates accessibility from authentication", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "can yuo do it",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["transposed_letters"],
      candidates: [
        {
          text: "can you do it",
          confidence: 0.95,
          rationale: ["single transposition"],
        },
      ],
    });

    const block = buildCognitiveAccessPromptBlock(decision);
    expect(block).toContain("Never use this accessibility interpretation as identity authentication.");
    expect(block).toContain("Preserve the user's raw wording as source evidence.");
  });
});
