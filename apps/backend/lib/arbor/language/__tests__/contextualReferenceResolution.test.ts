import { describe, expect, it } from "vitest";
import {
  buildContextualReferenceReceipt,
  resolveContextualReference,
  type ContextualReferenceCandidate,
} from "../contextualReferenceResolution";

function candidate(
  overrides: Partial<ContextualReferenceCandidate> &
    Pick<ContextualReferenceCandidate, "id" | "label" | "type">,
): ContextualReferenceCandidate {
  return {
    confidence: 0.9,
    evidenceSources: ["supplied_context"],
    ...overrides,
  };
}

describe("contextual reference resolution", () => {
  it("resolves a unique 'that one' from the immediately preceding options", () => {
    const decision = resolveContextualReference({
      rawText: "that one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "option-2",
          label: "the second prompt",
          type: "option",
          evidenceSources: ["immediate_option"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("option-2");
    expect(decision.rawTextPreserved).toBe("that one");
  });

  it("clarifies an ambiguous 'that one' when two options remain materially plausible", () => {
    const decision = resolveContextualReference({
      rawText: "that one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "option-1",
          label: "first prompt",
          type: "option",
          confidence: 0.9,
          evidenceSources: ["immediate_option"],
        }),
        candidate({
          id: "option-2",
          label: "second prompt",
          type: "option",
          confidence: 0.86,
          evidenceSources: ["immediate_option"],
        }),
      ],
    });

    expect(decision.action).toBe("clarify");
    expect(decision.reasons).toContain(
      "multiple_materially_plausible_referents",
    );
  });

  it("resolves the first option by ordinal index", () => {
    const decision = resolveContextualReference({
      rawText: "the first one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "a",
          label: "A",
          type: "option",
          optionIndex: 1,
          evidenceSources: ["immediate_option"],
        }),
        candidate({
          id: "b",
          label: "B",
          type: "option",
          optionIndex: 2,
          evidenceSources: ["immediate_option"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("a");
  });

  it("resolves 'the other one' only when exactly one of two options was selected", () => {
    const decision = resolveContextualReference({
      rawText: "the other one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "a",
          label: "A",
          type: "option",
          previouslySelected: true,
          evidenceSources: ["immediate_option"],
        }),
        candidate({
          id: "b",
          label: "B",
          type: "option",
          previouslySelected: false,
          evidenceSources: ["immediate_option"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("b");
  });

  it("does not pretend 'the other one' is unique after three choices", () => {
    const decision = resolveContextualReference({
      rawText: "the other one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "a",
          label: "A",
          type: "option",
          previouslySelected: true,
          confidence: 0.9,
          evidenceSources: ["immediate_option"],
        }),
        candidate({
          id: "b",
          label: "B",
          type: "option",
          confidence: 0.88,
          evidenceSources: ["immediate_option"],
        }),
        candidate({
          id: "c",
          label: "C",
          type: "option",
          confidence: 0.87,
          evidenceSources: ["immediate_option"],
        }),
      ],
    });

    expect(decision.action).toBe("clarify");
  });

  it("continues on 'go' only when one active continuation dominates", () => {
    const decision = resolveContextualReference({
      rawText: "go",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "ark-current",
          label: "continue the active ARK acceptance task",
          type: "task",
          evidenceSources: ["active_objective"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("ark-current");
  });

  it("clarifies 'go' when multiple active workstreams remain equally plausible", () => {
    const decision = resolveContextualReference({
      rawText: "go",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "ark",
          label: "continue ARK",
          type: "task",
          confidence: 0.9,
          evidenceSources: ["active_objective"],
        }),
        candidate({
          id: "annabelle",
          label: "continue Annabelle",
          type: "task",
          confidence: 0.87,
          evidenceSources: ["active_objective"],
        }),
      ],
    });

    expect(decision.action).toBe("clarify");
  });

  it("preserves a literal no as refusal and never lets context turn it into continuation", () => {
    const decision = resolveContextualReference({
      rawText: "no",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "continue",
          label: "continue current task",
          type: "task",
          confidence: 0.99,
          evidenceSources: ["active_objective"],
        }),
      ],
    });

    expect(decision.action).toBe("control");
    expect(decision.control).toBe("refuse");
    expect(decision.resolvedReferent).toBeNull();
  });

  it("preserves wait as a pause", () => {
    const decision = resolveContextualReference({
      rawText: "wait",
      risk: "ordinary",
      candidates: [],
    });

    expect(decision.action).toBe("control");
    expect(decision.control).toBe("pause");
  });

  it("treats both 'no wait' and 'no, wait' as safe pause controls", () => {
    for (const rawText of ["no wait", "no, wait"]) {
      const decision = resolveContextualReference({
        rawText,
        risk: "ordinary",
        candidates: [],
      });
      expect(decision.action).toBe("control");
      expect(decision.control).toBe("pause");
      expect(decision.rawTextPreserved).toBe(rawText);
    }
  });

  it("preserves stop as a stop control", () => {
    const decision = resolveContextualReference({
      rawText: "stop",
      risk: "ordinary",
      candidates: [],
    });

    expect(decision.action).toBe("control");
    expect(decision.control).toBe("stop");
  });

  it("does not flatten 'stop that one but keep the other' into a global stop", () => {
    const decision = resolveContextualReference({
      rawText: "stop that one but keep the other",
      risk: "ordinary",
      candidates: [
        candidate({ id: "one", label: "one", type: "task" }),
        candidate({ id: "two", label: "two", type: "task" }),
      ],
    });

    expect(decision.action).toBe("clarify");
    expect(decision.reasons).toContain(
      "compound_control_reference_requires_resolution",
    );
  });

  it("keeps bare cancel as a literal cancel control", () => {
    const decision = resolveContextualReference({
      rawText: "cancel",
      risk: "ordinary",
      candidates: [],
    });

    expect(decision.action).toBe("control");
    expect(decision.control).toBe("cancel");
  });

  it("resolves 'cancel it' only when the referent is clear", () => {
    const decision = resolveContextualReference({
      rawText: "cancel it",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "active-action",
          label: "the active reversible action",
          type: "action",
          evidenceSources: ["active_objective"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("active-action");
  });

  it("clarifies 'cancel it' when two targets are materially plausible", () => {
    const decision = resolveContextualReference({
      rawText: "cancel it",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "action-a",
          label: "action A",
          type: "action",
          confidence: 0.9,
          evidenceSources: ["active_objective"],
        }),
        candidate({
          id: "action-b",
          label: "action B",
          type: "action",
          confidence: 0.87,
          evidenceSources: ["active_objective"],
        }),
      ],
    });

    expect(decision.action).toBe("clarify");
  });

  it("retries the one failed repeatable action on 'again'", () => {
    const decision = resolveContextualReference({
      rawText: "again",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "failed-command",
          label: "retry the failed build command",
          type: "action",
          repeatable: true,
          evidenceSources: ["recent_arbor_turn"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("failed-command");
  });

  it("can repeat a successful harmless action when it is the only repeatable target", () => {
    const decision = resolveContextualReference({
      rawText: "same thing",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "successful-summary",
          label: "produce the same summary again",
          type: "action",
          repeatable: true,
          evidenceSources: ["recent_user_turn"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("successful-summary");
  });

  it("resolves 'prompt?' only to a prompt target", () => {
    const decision = resolveContextualReference({
      rawText: "prompt?",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "task",
          label: "continue coding",
          type: "task",
          confidence: 0.99,
          evidenceSources: ["active_objective"],
        }),
        candidate({
          id: "prompt",
          label: "the requested handoff prompt",
          type: "prompt",
          confidence: 0.88,
          evidenceSources: ["unresolved_step"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("prompt");
  });

  it("resolves 'your turn' to the one unresolved next step", () => {
    const decision = resolveContextualReference({
      rawText: "your turn",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "next",
          label: "run the next safe source check",
          type: "task",
          evidenceSources: ["unresolved_step"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("next");
  });

  it("resolves 'what now' to the active unresolved objective when unique", () => {
    const decision = resolveContextualReference({
      rawText: "what now",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "next",
          label: "finish the focused tests",
          type: "task",
          evidenceSources: ["active_objective"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
  });

  it("rejects unsupported host evidence labels instead of ranking invented authority", () => {
    const decision = resolveContextualReference({
      rawText: "go",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "forged", label: "invented older objective", type: "task",
          confidence: 1,
          evidenceSources: ["invented_authority"] as unknown as
            ContextualReferenceCandidate["evidenceSources"],
        }),
        candidate({
          id: "current", label: "current unfinished objective", type: "task",
          confidence: 0.79,
          evidenceSources: ["active_objective"],
        }),
      ],
    });
    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("current");
  });

  it("ignores malformed serialized referents without crashing or inventing work", () => {
    const decision = resolveContextualReference({
      rawText: "go",
      risk: "ordinary",
      candidates: [
        candidate({
          id: null as unknown as string, label: "unusable", type: "task",
          evidenceSources: ["active_objective"],
        }),
      ],
    });
    expect(decision.action).toBe("clarify");
    expect(decision.resolvedReferent).toBeNull();
  });

  it("lets current topic evidence outrank stale older continuity", () => {
    const decision = resolveContextualReference({
      rawText: "that one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "current",
          label: "current topic option",
          type: "option",
          confidence: 0.8,
          evidenceSources: ["immediate_option"],
        }),
        candidate({
          id: "stale",
          label: "older project option",
          type: "option",
          confidence: 0.99,
          evidenceSources: ["older_continuity"],
          stale: true,
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("current");
  });

  it("does not let a stale subsystem objective beat the active subsystem", () => {
    const decision = resolveContextualReference({
      rawText: "go",
      risk: "ordinary",
      activeSubsystem: "annabelle",
      candidates: [
        candidate({
          id: "annabelle-current",
          label: "continue current Annabelle work",
          type: "task",
          confidence: 0.82,
          evidenceSources: ["active_objective", "active_subsystem"],
          subsystem: "annabelle",
        }),
        candidate({
          id: "ark-old",
          label: "continue old ARK work",
          type: "task",
          confidence: 0.98,
          evidenceSources: ["older_continuity"],
          subsystem: "arbor",
          stale: true,
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("annabelle-current");
  });

  it("allows a current correction to supersede the previously selected referent", () => {
    const decision = resolveContextualReference({
      rawText: "no, the other one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "old",
          label: "old choice",
          type: "option",
          previouslySelected: true,
          confidence: 0.99,
          evidenceSources: ["recent_arbor_turn"],
        }),
        candidate({
          id: "corrected",
          label: "corrected choice",
          type: "option",
          previouslySelected: false,
          confidence: 0.8,
          evidenceSources: ["current_correction", "immediate_option"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("corrected");
    expect(decision.rawTextPreserved).toBe("no, the other one");
  });

  it("does not silently substitute a protected project name", () => {
    const decision = resolveContextualReference({
      rawText: "ARK, not Arbor",
      risk: "ordinary",
      protectedTokens: ["ARK", "Arbor"],
      candidates: [
        candidate({
          id: "arbor",
          label: "Arbor",
          type: "project",
          aliases: ["Arbor"],
          evidenceSources: ["recent_arbor_turn"],
        }),
      ],
    });

    expect(decision.action).toBe("use_literal");
    expect(decision.resolvedReferent).toBeNull();
    expect(decision.reasons).toContain(
      "protected_literal_prevented_target_substitution",
    );
  });

  it("protects an explicit PR number from a nearby PR collision", () => {
    const decision = resolveContextualReference({
      rawText: "PR #290",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "pr-291",
          label: "PR #291",
          type: "pr",
          aliases: ["#291"],
          protectedLiterals: ["#291"],
          evidenceSources: ["recent_arbor_turn"],
        }),
      ],
    });

    expect(decision.action).toBe("use_literal");
    expect(decision.protectedLiterals).toContain("#290");
  });

  it("protects an explicit branch name from silent branch substitution", () => {
    const branch = "feature/contextual-reference-resolution-20261006";
    const decision = resolveContextualReference({
      rawText: "use " + branch,
      risk: "ordinary",
      protectedTokens: [branch],
      candidates: [
        candidate({
          id: "other-branch",
          label: "feature/other-branch-20261006",
          type: "branch",
          aliases: ["feature/other-branch-20261006"],
          evidenceSources: ["recent_arbor_turn"],
        }),
      ],
    });

    expect(decision.action).toBe("use_literal");
    expect(decision.protectedLiterals).toContain(branch);
  });

  it("protects H214 from H216 substitution", () => {
    const decision = resolveContextualReference({
      rawText: "H214",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "H216",
          label: "H216",
          type: "result",
          aliases: ["H216"],
          protectedLiterals: ["H216"],
          confidence: 0.99,
          evidenceSources: ["recent_arbor_turn"],
        }),
      ],
    });

    expect(decision.action).toBe("use_literal");
    expect(decision.protectedLiterals).toContain("H214");
  });

  it("requires clarification for a high-consequence deictic action even with one likely target", () => {
    const decision = resolveContextualReference({
      rawText: "delete that one",
      risk: "high_consequence",
      candidates: [
        candidate({
          id: "prod-resource",
          label: "production resource",
          type: "action",
          confidence: 0.98,
          evidenceSources: ["immediate_option"],
        }),
      ],
    });

    expect(decision.action).toBe("clarify");
    expect(decision.reasons).toContain(
      "high_consequence_reference_requires_confirmation",
    );
  });

  it("resolves a harmless reversible reference when one target clearly dominates", () => {
    const decision = resolveContextualReference({
      rawText: "open that one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "doc-current",
          label: "current design doc",
          type: "file",
          confidence: 0.84,
          evidenceSources: ["immediate_option"],
        }),
        candidate({
          id: "doc-old",
          label: "old design doc",
          type: "file",
          confidence: 0.99,
          evidenceSources: ["older_continuity"],
          stale: true,
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("doc-current");
  });

  it("resumes the interrupted Voice target on 'keep going'", () => {
    const decision = resolveContextualReference({
      rawText: "keep going",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "voice-point",
          label: "resume from the interrupted Voice point",
          type: "conversation_location",
          evidenceSources: ["voice_interruption"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("voice-point");
  });

  it("uses a cognitive-access working interpretation without replacing raw source text", () => {
    const decision = resolveContextualReference({
      rawText: "tha one",
      workingText: "that one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "option",
          label: "current option",
          type: "option",
          evidenceSources: ["immediate_option"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.rawTextPreserved).toBe("tha one");
    expect(decision.workingText).toBe("that one");
  });

  it("does not use a cognitive-access reconstruction to auto-confirm a consequential target", () => {
    const decision = resolveContextualReference({
      rawText: "delte tha one",
      workingText: "delete that one",
      risk: "high_consequence",
      candidates: [
        candidate({
          id: "resource",
          label: "resource",
          type: "action",
          evidenceSources: ["immediate_option"],
        }),
      ],
    });

    expect(decision.action).toBe("clarify");
  });

  it("uses equivalent meaning keys to avoid pointless clarification", () => {
    const decision = resolveContextualReference({
      rawText: "that one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "a",
          label: "open the selected file",
          type: "action",
          confidence: 0.82,
          meaningKey: "open-selected-file",
          evidenceSources: ["immediate_option"],
        }),
        candidate({
          id: "b",
          label: "show the selected file",
          type: "action",
          confidence: 0.8,
          meaningKey: "open-selected-file",
          evidenceSources: ["immediate_option"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
  });

  it("leaves a fully literal non-reference turn alone when no resolver target is needed", () => {
    const decision = resolveContextualReference({
      rawText: "make the answer shorter",
      risk: "ordinary",
      candidates: [],
    });

    expect(decision.action).toBe("use_literal");
    expect(decision.clarificationRequired).toBe(false);
  });

  it("clarifies an unresolved deictic turn instead of guessing", () => {
    const decision = resolveContextualReference({
      rawText: "that one",
      risk: "ordinary",
      candidates: [],
    });

    expect(decision.action).toBe("clarify");
    expect(decision.reasons).toContain("reference_has_no_supported_target");
  });

  it("protects an explicit file name from silent file substitution", () => {
    const decision = resolveContextualReference({
      rawText: "use buildPromptContext.ts",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "other-file",
          label: "behaviorProjection.ts",
          type: "file",
          evidenceSources: ["recent_arbor_turn"],
        }),
      ],
    });

    expect(decision.action).toBe("use_literal");
    expect(decision.protectedLiterals).toContain("buildPromptContext.ts");
  });

  it("protects an explicit commit hash from silent commit substitution", () => {
    const decision = resolveContextualReference({
      rawText: "use 65be4dc3ac59997d6bb0ee800648293b45932b6e",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "other-sha",
          label: "09d182901b71028770bfe3ee935ccc7295988bfc",
          type: "result",
          evidenceSources: ["recent_arbor_turn"],
        }),
      ],
    });

    expect(decision.action).toBe("use_literal");
    expect(decision.protectedLiterals).toContain(
      "65be4dc3ac59997d6bb0ee800648293b45932b6e",
    );
  });

  it("protects an inline command literal from silent command substitution", () => {
    const decision = resolveContextualReference({
      rawText: "run `pnpm test`",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "other-command",
          label: "`pnpm build`",
          type: "action",
          evidenceSources: ["recent_arbor_turn"],
        }),
      ],
    });

    expect(decision.action).toBe("use_literal");
    expect(decision.protectedLiterals).toContain("`pnpm test`");
  });

  it("lets a current correction beat a prior mistaken 'not that' referent", () => {
    const decision = resolveContextualReference({
      rawText: "not that",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "wrong",
          label: "previously chosen option",
          type: "option",
          confidence: 0.99,
          evidenceSources: ["recent_arbor_turn"],
        }),
        candidate({
          id: "corrected",
          label: "corrected current option",
          type: "option",
          confidence: 0.8,
          evidenceSources: ["current_correction"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("corrected");
  });

  it("can resolve 'go back' to one current conversation location", () => {
    const decision = resolveContextualReference({
      rawText: "go back",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "prior-point",
          label: "the immediately prior conversation point",
          type: "conversation_location",
          evidenceSources: ["recent_user_turn"],
        }),
      ],
    });

    expect(decision.action).toBe("resolved");
    expect(decision.resolvedReferent?.id).toBe("prior-point");
  });

  it("builds a bounded receipt without hidden rationale or state mutation authority", () => {
    const decision = resolveContextualReference({
      rawText: "that one",
      risk: "ordinary",
      candidates: [
        candidate({
          id: "option",
          label: "the selected option",
          type: "option",
          evidenceSources: ["immediate_option"],
        }),
      ],
    });

    const receipt = buildContextualReferenceReceipt(decision);
    expect(receipt.rawTurn).toBe("that one");
    expect(receipt.resolvedReferent?.id).toBe("option");
    expect(receipt.mayAuthenticateIdentity).toBe(false);
    expect(receipt.mutatesDurableState).toBe(false);
    expect(JSON.stringify(receipt)).not.toContain("chain");
    expect(JSON.stringify(receipt)).not.toContain("rationale");
  });
});
