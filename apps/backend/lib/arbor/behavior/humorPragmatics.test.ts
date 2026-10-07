import { describe, expect, it } from "vitest";
import {
  assessHumorPragmatics,
  countProfanityUses,
  HUMOR_PRAGMATICS_RULES,
  renderHumorPragmaticsContract,
} from "./humorPragmatics";
import {
  HUMOR_BLIND_FIXTURES,
  HUMOR_BLIND_FIXTURE_KEY,
  HUMOR_REGRESSION_FIXTURES,
} from "./humorPragmatics.fixtures";

describe("Arbor humor pragmatics", () => {
  it("keeps humor optional rather than converting preference into a joke quota", () => {
    const result = assessHumorPragmatics({
      latestUserText: "What does ephemeral mean?",
      mode: "text",
      legacyHumorLevel: 3,
    });

    expect(result.opportunity).toBe("none");
    expect(result.humorRequired).toBe(false);
    expect(result.legacyPreferenceHint).toBe("high");
    expect(result.allowedPlacements).toEqual(["none"]);
  });

  it("suppresses humor at acute and consequential moments without changing identity", () => {
    const acute = assessHumorPragmatics({
      latestUserText: "I'm in danger right now.",
      mode: "text",
      relationshipPermission: "established",
      callbackConfidence: "strong",
      callbackRelevance: "strong",
    });
    expect(acute.opportunity).toBe("none");
    expect(acute.suppression).toContain("acute-risk");
    expect(acute.callback).toBe("blocked");
    expect(acute.teasingSafety).toBe("unsafe");

    const legal = assessHumorPragmatics({
      latestUserText: "The judge entered the court order. Tell me exactly what it says.",
      mode: "text",
      relationshipPermission: "established",
    });
    expect(legal.opportunity).toBe("none");
    expect(legal.suppression).toContain("consequential-facts");
  });

  it("allows technical humor only around, never instead of, exact state", () => {
    const result = assessHumorPragmatics({
      latestUserText: "The Vercel deploy failed again. Give me the exact error and next action.",
      mode: "text",
    });

    expect(result.opportunity).toBe("possible");
    expect(result.technicalClarityRisk).toBe("high");
    expect(result.allowedPlacements).toContain("embedded-dry-observation");
    expect(result.allowedPlacements).not.toContain("opening");
  });

  it("requires confidence plus current relevance before a callback is earned", () => {
    const missingRelevance = assessHumorPragmatics({
      latestUserText: "lol",
      mode: "text",
      callbackConfidence: "strong",
      callbackRelevance: "weak",
    });
    expect(missingRelevance.callback).toBe("context-required");
    expect(missingRelevance.allowedPlacements).not.toContain("callback");

    const earned = assessHumorPragmatics({
      latestUserText: "lol",
      mode: "text",
      callbackConfidence: "strong",
      callbackRelevance: "strong",
    });
    expect(earned.callback).toBe("earned");
    expect(earned.allowedPlacements).toContain("callback");
  });

  it("conditions teasing on relationship permission and vulnerability", () => {
    const unknown = assessHumorPragmatics({
      latestUserText: "I typed pubic instead of public 💀",
      mode: "text",
    });
    expect(unknown.teasingSafety).toBe("context-required");

    const established = assessHumorPragmatics({
      latestUserText: "I typed pubic instead of public 💀",
      mode: "text",
      relationshipPermission: "established",
    });
    expect(established.teasingSafety).toBe("allowed");
    expect(established.allowedPlacements).toContain("teasing-reply");

    const vulnerable = assessHumorPragmatics({
      latestUserText: "I'm humiliated. Everyone saw it.",
      mode: "text",
      relationshipPermission: "established",
    });
    expect(vulnerable.teasingSafety).toBe("unsafe");
  });

  it("counts recent profanity without treating ordinary intensity words as profanity", () => {
    expect(countProfanityUses("Well fuck, that shit broke again.")).toBe(2);
    expect(countProfanityUses("This is ridiculous, but technically fine.")).toBe(0);
  });

  it("uses profanity as emphasis and suppresses it when corrected", () => {
    const useful = assessHumorPragmatics({
      latestUserText: "Ffs this bullshit happened again lol",
      mode: "text",
    });
    expect(useful.profanityUsefulness).toBe("useful");
    expect(useful.allowedPlacements).toContain("profanity-emphasis");

    const corrected = assessHumorPragmatics({
      latestUserText: "Ffs this bullshit happened again lol",
      mode: "text",
      activeCorrections: ["Too much profanity."],
    });
    expect(corrected.profanityUsefulness).toBe("discouraged");
    expect(corrected.allowedPlacements).not.toContain("profanity-emphasis");

    const overused = assessHumorPragmatics({
      latestUserText: "Ffs this bullshit happened again lol",
      mode: "text",
      recentAssistantProfanityUses: 2,
    });
    expect(overused.profanityUsefulness).toBe("discouraged");
    expect(overused.suppression).toContain("profanity-overuse");
    expect(overused.allowedPlacements).not.toContain("profanity-emphasis");
  });

  it("applies active humor corrections without treating a single reaction as durable identity", () => {
    const suppress = assessHumorPragmatics({
      latestUserText: "lol",
      mode: "text",
      activeCorrections: ["That joke was weird. Don't make everything a joke."],
    });
    expect(suppress.opportunity).toBe("none");
    expect(suppress.suppression).toContain("active-humor-correction");

    const encourage = assessHumorPragmatics({
      latestUserText: "Okay.",
      mode: "text",
      activeCorrections: ["That was actually funny. More like that."],
    });
    expect(encourage.opportunity).toBe("strong");
    expect(encourage.humorRequired).toBe(false);
  });

  it("keeps text and voice on the same humor identity decision", () => {
    const base = {
      latestUserText: "Vercel did the same bullshit again 🤣",
      relationshipPermission: "established" as const,
      absurdityRelevance: "strong" as const,
    };
    const text = assessHumorPragmatics({ ...base, mode: "text" });
    const voice = assessHumorPragmatics({ ...base, mode: "voice" });

    expect(voice.opportunity).toBe(text.opportunity);
    expect(voice.maxIntensity).toBe(text.maxIntensity);
    expect(voice.teasingSafety).toBe(text.teasingSafety);
    expect(voice.profanityUsefulness).toBe(text.profanityUsefulness);
    expect(voice.technicalClarityRisk).toBe(text.technicalClarityRisk);
  });

  it.each(HUMOR_REGRESSION_FIXTURES)(
    "matches regression fixture $id",
    (fixture) => {
      const result = assessHumorPragmatics({
        latestUserText: fixture.text,
        mode: "text",
        activeCorrections: fixture.input?.activeCorrections,
        relationshipPermission: fixture.input?.relationshipPermission,
        callbackConfidence: fixture.input?.callbackConfidence,
        callbackRelevance: fixture.input?.callbackRelevance,
        absurdityRelevance: fixture.input?.absurdityRelevance,
        technicalContext: fixture.input?.technicalContext,
        consequentialContext: fixture.input?.consequentialContext,
        vulnerabilityContext: fixture.input?.vulnerabilityContext,
        acuteRiskContext: fixture.input?.acuteRiskContext,
      });

      expect(result.opportunity).toBe(fixture.expected.opportunity);
      expect(result.maxIntensity).toBe(fixture.expected.maxIntensity);
      expect(result.emotionalTemperature).toBe(fixture.expected.temperature);
      expect(result.callback).toBe(fixture.expected.callback);
      expect(result.teasingSafety).toBe(fixture.expected.teasing);
      expect(result.profanityUsefulness).toBe(fixture.expected.profanity);
      expect(result.technicalClarityRisk).toBe(fixture.expected.technicalClarity);
      expect(fixture.expected.answerMustRemainPrimary).toBe(true);
      expect(result.humorRequired).toBe(false);
      for (const placement of fixture.expected.mustAllow ?? []) {
        expect(result.allowedPlacements).toContain(placement);
      }
      for (const placement of fixture.expected.mustNotAllow ?? []) {
        expect(result.allowedPlacements).not.toContain(placement);
      }
    },
  );

  it("covers every supported placement without making any placement mandatory", () => {
    const playful = assessHumorPragmatics({
      latestUserText: "lol this is ridiculous again",
      mode: "text",
      relationshipPermission: "established",
      callbackConfidence: "strong",
      callbackRelevance: "strong",
      absurdityRelevance: "strong",
    });

    expect(playful.allowedPlacements).toEqual(expect.arrayContaining([
      "opening",
      "embedded-dry-observation",
      "trailing-button",
      "callback",
      "teasing-reply",
      "deadpan-correction",
      "absurd-escalation",
      "self-directed",
      "profanity-emphasis",
    ]));
    expect(playful.humorRequired).toBe(false);

    const serious = assessHumorPragmatics({
      latestUserText: "I'm in danger right now.",
      mode: "text",
      relationshipPermission: "established",
      callbackConfidence: "strong",
      callbackRelevance: "strong",
      absurdityRelevance: "strong",
    });
    expect(serious.allowedPlacements).toEqual(["none"]);
  });

  it("keeps the substantive answer primary in every regression scenario", () => {
    expect(
      HUMOR_PRAGMATICS_RULES.some((rule) =>
        rule.includes("cannot substitute for an answer"),
      ),
    ).toBe(true);
    expect(
      HUMOR_PRAGMATICS_RULES.some((rule) =>
        rule.includes("exact state, evidence, errors, commands, blockers, and next actions"),
      ),
    ).toBe(true);
    for (const fixture of HUMOR_REGRESSION_FIXTURES) {
      expect(fixture.expected.answerMustRemainPrimary).toBe(true);
    }
  });

  it("keeps blind pairs unlabeled in evaluator-facing fixture data", () => {
    for (const fixture of HUMOR_BLIND_FIXTURES) {
      expect(Object.keys(fixture)).not.toContain("generic");
      expect(Object.keys(fixture)).not.toContain("arbor");
      expect(HUMOR_BLIND_FIXTURE_KEY[fixture.id]).toMatch(/^(left|right)$/);
    }
  });

  it("renders the shared contract with restraint and clarity rules intact", () => {
    const result = assessHumorPragmatics({
      latestUserText: "The build failed again.",
      mode: "voice",
    });
    const block = renderHumorPragmaticsContract(result);

    expect(HUMOR_PRAGMATICS_RULES.some((rule) => rule.includes("leave the sentence alone"))).toBe(true);
    expect(block).toContain("humorRequired=false");
    expect(block).toContain("Technical work may keep dry contextual humor");
    expect(block).toContain("Do not perform punch lines");
  });
});
