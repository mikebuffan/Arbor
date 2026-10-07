import { describe, expect, it } from "vitest";
import {
  buildCognitiveAccessInterpretationReceipt,
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

  it("recovers a multi-error message when one interpretation is clearly strongest", () => {
    const raw = "can yuo chck wher we ar on pr 290";
    const decision = decideCognitiveAccessRecovery({
      rawText: raw,
      source: "typed",
      risk: "ordinary",
      degradationSignals: [
        "transposed_letters",
        "missing_letters",
        "multi_error",
        "fatigue_or_noisy_input",
      ],
      candidates: [
        {
          text: "can you check where we are on PR 290",
          confidence: 0.94,
          rationale: ["multiple local repairs", "active PR context"],
        },
      ],
    });

    expect(decision.action).toBe("use_best_interpretation");
    expect(decision.protectedLiterals).toContain("290");
    expect(decision.rawTextPreserved).toBe(raw);
  });

  it("asks when two materially different readings remain similarly plausible", () => {
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

  it("does not clarify merely because equivalent wording scores are close", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "pls check it",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["missing_letters"],
      candidates: [
        {
          text: "please check it",
          confidence: 0.84,
          rationale: ["abbreviation expansion"],
          meaningKey: "check_current_target",
        },
        {
          text: "could you check it",
          confidence: 0.79,
          rationale: ["same requested action"],
          meaningKey: "check_current_target",
        },
      ],
    });

    expect(decision.action).toBe("use_best_interpretation");
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

  it("does not silently remove protected names, project names, or identifiers", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "check H214 in FAFO next",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["unknown"],
      protectedTokens: ["H214", "FAFO"],
      candidates: [
        {
          text: "check H216 in FAFO next",
          confidence: 0.95,
          rationale: ["nearby known identifier"],
        },
      ],
    });

    expect(decision.action).toBe("use_raw");
    expect(decision.interpretedText).toBe("check H214 in FAFO next");
    expect(decision.reasons).toContain("candidate_changed_protected_literal");
  });

  it("automatically protects numbers, money, dates, and code-like identifiers", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "send $12 on 10/06/2026 after H214",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["motor_input_error"],
      candidates: [
        {
          text: "send $21 on 10/06/2026 after H216",
          confidence: 0.98,
          rationale: ["plausible transcription substitutions"],
        },
      ],
    });

    expect(decision.action).toBe("use_raw");
    expect(decision.protectedLiterals).toEqual(
      expect.arrayContaining(["$12", "10/06/2026", "H214"]),
    );
  });

  it("clarifies when a plausible reconstruction flips negation", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "dont merge main",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["punctuation_disruption"],
      candidates: [
        {
          text: "merge main",
          confidence: 0.97,
          rationale: ["short command interpretation"],
        },
      ],
    });

    expect(decision.action).toBe("use_raw");
    expect(decision.interpretedText).toBe("dont merge main");
    expect(decision.reasons).toContain(
      "raw_negation_preserved_over_conflicting_interpretation",
    );
  });

  it("never lets context silently turn an explicit wait into continue", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "wait",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["unknown"],
      candidates: [
        {
          text: "continue the active task",
          confidence: 0.99,
          rationale: ["active objective context"],
        },
      ],
    });

    expect(decision.action).toBe("use_raw");
    expect(decision.interpretedText).toBe("wait");
    expect(decision.reasons).toContain(
      "explicit_stop_or_pause_control_preserved",
    );
  });

  it("allows continuity context to interpret a short go without replacing the raw source", () => {
    const raw = "go";
    const decision = decideCognitiveAccessRecovery({
      rawText: raw,
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["fragmented_thought"],
      candidates: [
        {
          text: "continue the active ARK task",
          confidence: 0.93,
          rationale: ["single unresolved active objective"],
        },
      ],
    });

    expect(decision.action).toBe("use_best_interpretation");
    expect(decision.interpretedText).toBe("continue the active ARK task");
    expect(decision.rawTextPreserved).toBe(raw);
  });

  it("uses context for 'that one' only when the contextual interpretation is strong", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "that one",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["fragmented_thought"],
      candidates: [
        {
          text: "use the second recovery option",
          confidence: 0.9,
          rationale: ["immediately preceding two-option choice"],
        },
      ],
    });

    expect(decision.action).toBe("use_best_interpretation");
    expect(decision.rawTextPreserved).toBe("that one");
  });

  it("keeps speech-to-text homophone/project noise eligible for contextual recovery", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "open the art project",
      source: "speech_to_text",
      risk: "ordinary",
      degradationSignals: ["speech_to_text_noise"],
      protectedTokens: ["ARK"],
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

  it("preserves a correction after a prior misinterpretation", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "no I meant H214",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["abrupt_topic_shift"],
      protectedTokens: ["H214"],
      candidates: [
        {
          text: "I meant H216",
          confidence: 0.95,
          rationale: ["previous mistaken target"],
        },
      ],
    });

    expect(decision.action).toBe("use_raw");
    expect(decision.interpretedText).toBe("no I meant H214");
  });

  it("keeps ambiguous word-finding fragments unresolved instead of inventing precision", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "the thing after the... project one",
      source: "speech_to_text",
      risk: "ordinary",
      degradationSignals: ["word_finding_gap", "fragmented_thought"],
      candidates: [
        {
          text: "the task after the project review",
          confidence: 0.67,
          rationale: ["one plausible recent referent"],
        },
      ],
    });

    expect(decision.action).toBe("clarify");
    expect(decision.confidenceBand).toBe("low");
  });

  it("recovers a missing word when context makes the requested action clear", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "can you the test again",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["missing_words"],
      candidates: [
        {
          text: "can you run the test again",
          confidence: 0.92,
          rationale: ["active test-running context", "single missing verb"],
        },
      ],
    });

    expect(decision.action).toBe("use_best_interpretation");
    expect(decision.rawTextPreserved).toBe("can you the test again");
  });

  it("recovers phonetic project spelling without making it an identity signal", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "ver sell is blocked again",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["phonetic_spelling"],
      candidates: [
        {
          text: "Vercel is blocked again",
          confidence: 0.9,
          rationale: ["active deployment context", "phonetic spelling"],
        },
      ],
    });

    expect(decision.action).toBe("use_best_interpretation");
    expect(decision.mayAuthenticateIdentity).toBe(false);
  });

  it("recovers a speech-to-text homophone when current context resolves it", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "right the release note",
      source: "speech_to_text",
      risk: "ordinary",
      degradationSignals: ["speech_to_text_noise"],
      candidates: [
        {
          text: "write the release note",
          confidence: 0.93,
          rationale: ["active documentation task", "homophone substitution"],
        },
      ],
    });

    expect(decision.action).toBe("use_best_interpretation");
    expect(decision.source).toBe("speech_to_text");
  });

  it("handles abrupt topic switching without mutating the literal turn", () => {
    const raw = "voice now the accent thing";
    const decision = decideCognitiveAccessRecovery({
      rawText: raw,
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["abrupt_topic_shift", "fragmented_thought"],
      candidates: [
        {
          text: "switch to the Voice accent issue",
          confidence: 0.9,
          rationale: ["known unresolved Voice issue", "topic switch"],
        },
      ],
    });

    expect(decision.action).toBe("use_best_interpretation");
    expect(decision.rawTextPreserved).toBe(raw);
  });

  it("preserves a short explicit no rather than asking an unnecessary question", () => {
    const decision = decideCognitiveAccessRecovery({
      rawText: "no",
      source: "typed",
      risk: "ordinary",
      degradationSignals: ["unknown"],
      candidates: [
        {
          text: "continue",
          confidence: 0.99,
          rationale: ["active objective"],
        },
      ],
    });

    expect(decision.action).toBe("use_raw");
    expect(decision.interpretedText).toBe("no");
    expect(decision.clarificationRequired).toBe(false);
  });

  it("builds a bounded interpretation receipt without chain-of-thought", () => {
    const raw = "can yuo do it";
    const decision = decideCognitiveAccessRecovery({
      rawText: raw,
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

    const receipt = buildCognitiveAccessInterpretationReceipt(decision);
    expect(receipt).toEqual({
      schemaVersion: 1,
      rawText: raw,
      workingInterpretation: "can you do it",
      decision: "use_best_interpretation",
      confidence: "high",
      alternatives: [],
      clarificationRequired: false,
      clarificationReasons: [],
      protectedLiterals: [],
      source: "typed",
      degradationSignals: ["transposed_letters"],
      mayAuthenticateIdentity: false,
    });
    expect(JSON.stringify(receipt)).not.toContain("rationale");
  });

  it("prompt contract separates accessibility from authentication and avoids fake precision", () => {
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
    expect(block).toContain(
      "Never use this accessibility interpretation as identity authentication.",
    );
    expect(block).toContain(
      "Preserve the user's raw wording as source evidence.",
    );
    expect(block).toContain("Confidence band: high");
    expect(block).not.toContain("0.95");
  });
});
