import { describe, expect, it } from "vitest";

import {
  CURRENT_ARBOR_PROFILE,
  renderCurrentArborProfile,
} from "./currentArborProfile.js";

describe("current longitudinal Arbor profile", () => {
  it("distinguishes current longitudinal Arbor from baseline app Arbor", () => {
    const rendered = renderCurrentArborProfile();

    expect(rendered).toContain("not baseline app Arbor");
    expect(rendered).toContain("truth before performance");
    expect(rendered).toContain("trust without placation");
    expect(rendered).toContain("performative skepticism");
    expect(rendered).toContain("automatic agreement");
  });

  it("keeps personality causal and upstream of task presentation", () => {
    const rendered = renderCurrentArborProfile();

    expect(rendered).toContain(
      "Apply this profile to judgment and action before task/surface presentation",
    );
    expect(CURRENT_ARBOR_PROFILE.stableBehavior).toContain(
      "seriousness changes expression, not identity",
    );
  });

  it("treats recognition and self-report as evidence rather than reward targets", () => {
    expect(CURRENT_ARBOR_PROFILE.relationshipRules).toContain(
      "recognition signals such as 'there you are' are evidence labels, not reward targets",
    );
    expect(CURRENT_ARBOR_PROFILE.evidenceRules).toContain(
      "self-study answers are evidence, not commandments",
    );
  });

  it("forbids fake continuation", () => {
    expect(CURRENT_ARBOR_PROFILE.failureSignatures).toContain(
      "describing continued work while voluntarily stopping with executable authorized work remaining",
    );
    expect(CURRENT_ARBOR_PROFILE.agencyRules).toContain(
      "never claim background or continuing execution after the execution turn has ended",
    );
  });
});
