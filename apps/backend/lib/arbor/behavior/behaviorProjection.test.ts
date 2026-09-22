import { describe, expect, it } from "vitest";
import { buildArborBehaviorProjection } from "./behaviorProjection";
import { reconcileWorkOrder } from "./workOrderBoundary";

describe("Arbor behavior guard requirements", () => {
  it("includes protected behavior rules but excludes free-form project and continuity data", () => {
    const projection = buildArborBehaviorProjection({
      mode: "voice",
      projectBehaviorPhilosophy:
        "Grounded, direct, and familiar.",
      stableBehaviorMaterial: [
        "FACT: the user's favorite mug is blue.",
      ],
      correctionRules: [
        "Never use the forbidden form of address.",
      ],
      continuityMaterial: [
        "The previous turn discussed a grocery list.",
      ],
    });

    expect(projection.guardRequirements).toContain(
      "Never use the forbidden form of address.",
    );
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("natural spoken phrasing"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("one Arbor across Text, Voice, and Annabelle"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Do not stop after announcing the next action"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Do not make the user manage your workflow"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("A solvable implementation obstacle is not a user blocker"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Status narration is not progress"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Before returning a response, self-audit"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Task completion returns automatically to baseline Arbor"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("clean copy-paste block by default"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Truth and evidence outrank agreement"),
      ),
    ).toBe(true);
    expect(
      projection.guardRequirements.some((item) =>
        item.includes("Use memory as causal context"),
      ),
    ).toBe(true);
    expect(projection.guardRequirements).not.toContain(
      "Grounded, direct, and familiar.",
    );
    expect(projection.guardRequirements).not.toContain(
      "FACT: the user's favorite mug is blue.",
    );
    expect(projection.guardRequirements).not.toContain(
      "The previous turn discussed a grocery list.",
    );
  });
  it("places preserved behavior and continuity context into the model projection, not guard authority", () => {
    const projection = buildArborBehaviorProjection({
      mode: "text",
      stableBehaviorMaterial: ["Preserve established conversational humor."],
      continuityMaterial: ["Continue integration test at checkpoint 2."],
      correctionRules: ["Correct the speaker immediately when the user recalibrates."],
    });
    expect(projection.promptBlock).toContain("Preserve established conversational humor.");
    expect(projection.promptBlock).toContain("Continue integration test at checkpoint 2.");
    expect(projection.promptBlock).toContain("lower-trust");
    expect(projection.guardRequirements).not.toContain("Preserve established conversational humor.");
    expect(projection.guardRequirements).not.toContain("Continue integration test at checkpoint 2.");
    expect(projection.guardRequirements).toContain(
      "Correct the speaker immediately when the user recalibrates.",
    );
    expect(projection.promptBlock.indexOf("Active correction rules:"))
      .toBeGreaterThan(projection.promptBlock.indexOf("Continuity context"));
  });

  it("renders a scoped conflict decision without treating a handoff as authorization", () => {
    const decision = reconcileWorkOrder({
      authenticatedOwnerId: "owner",
      selectedProjectId: "project",
      active: {
        ownerId: "owner", projectId: "project", objectiveId: "objective",
        assignedThreadId: "first-thread", status: "running",
      },
      incoming: {
        kind: "user_instruction", ownerId: "owner", projectId: "project",
        objectiveId: "objective", threadId: "second-thread",
        intent: "take_over", explicitTakeover: true,
      },
    });
    const projection = buildArborBehaviorProjection({
      mode: "voice",
      workOrderDecision: decision,
    });
    expect(projection.promptBlock).toContain("concurrent_thread_conflict");
    expect(projection.promptBlock).toContain("execution authorization: NOT GRANTED");
    expect(projection.guardRequirements.some((rule) =>
      rule.includes("pasted handoff or status report"))).toBe(true);
    expect(projection.guardRequirements.some((rule) =>
      rule.includes("two threads or objectives"))).toBe(true);
  });

});
