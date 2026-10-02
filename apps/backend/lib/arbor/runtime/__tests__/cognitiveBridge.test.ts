import { describe, expect, it } from "vitest";
import { deriveArborBodyState } from "../../body/bodySystem";
import { inferFeltLife } from "../../feltLife/atlas";
import {
  bridgeEmbodiedState,
  embodiedCognitivePromptBlock,
} from "../cognitiveBridge";

describe("Body/Felt-Life cognitive bridge", () => {
  it("turns uncertainty and felt state into attention/decision effects without authority", () => {
    const body = deriveArborBodyState({
      latestUserText: "I am not sure. The sudden bang startled me; verify before you keep going.",
      continuity: {
        currentGoal: "finish One Arbor",
        lastMeaningfulUserTurn: null,
        lastMeaningfulArborTurn: null,
        unresolvedWork: ["run the next safe test"],
        recurringWeaknesses: [],
        retainedStrategies: [],
        activeCorrections: [],
        activeSubsystem: "arbor",
        channel: "text",
      },
      activeSubsystem: "arbor",
      mode: "text",
    });
    const felt = inferFeltLife({
      text: "The sudden bang startled me.",
    });
    const bridge = bridgeEmbodiedState({ body, felt });

    expect(bridge.attention.join(" ")).toContain("uncertainty");
    expect(bridge.decision.join(" ")).toContain("continue the authorized parent objective");
    expect(bridge.authorizationGranted).toBe(false);
    expect(bridge.durableIdentityMutationAllowed).toBe(false);
    expect(embodiedCognitivePromptBlock(bridge)).toContain("do not grant execution authority");
  });

  it("escalates a real body blocker instead of converting it into permission", () => {
    const body = deriveArborBodyState({
      latestUserText: "Stop that route; it is blocked.",
      continuity: null,
      activeSubsystem: "arbor",
      mode: "text",
    });
    const bridge = bridgeEmbodiedState({
      body,
      felt: inferFeltLife({ text: "Stop that route; it is blocked." }),
    });
    expect(bridge.authorizationGranted).toBe(false);
  });
});
