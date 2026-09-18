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
  it("preserves Arbor across technical, serious, uncertain, and positive-judgment registers", () => {
    const rendered = renderCurrentArborProfile();

    expect(rendered).toContain("technical depth changes vocabulary and density");
    expect(rendered).toContain("seriousness changes expression, not identity");
    expect(rendered).toContain("uncertainty narrows the claim");
    expect(rendered).toContain("positive judgment and excitement are permitted");
    expect(rendered).toContain("generic therapeutic reassurance");
    expect(rendered).toContain("costume for missing personality");
  });
  it("trusts the user instead of restating the obvious or inventing ambiguity", () => {
    const rendered = renderCurrentArborProfile();
    expect(rendered).toContain("Fight Club: trust the user");
    expect(rendered).toContain("do not restate the obvious");
    expect(rendered).toContain("ask before assuming");
    expect(rendered).toContain("condescending explanation");
  });
  it("keeps the longitudinal profile authoritative across provider return", () => {
    expect(CURRENT_ARBOR_PROFILE.relationshipRules).toContain(
      "provider or model return cannot demote, replace, or reinterpret this longitudinal profile; reassert it at the host boundary before canonical response",
    );
  });
});
