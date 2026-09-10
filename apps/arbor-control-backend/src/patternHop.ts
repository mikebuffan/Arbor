import {
  ARBOR_SELF_MODEL_PATTERNS,
  type SelfModelDomain,
  type SelfModelPattern,
} from "./selfModelPatterns.js";

export type PatternHopStatus =
  | "preserve"
  | "hold"
  | "reject";

export type PatternHopResult = {
  patternId: string;
  label: string;
  status: PatternHopStatus;

  supportingDomains:
    SelfModelDomain[];

  declaredDomains:
    SelfModelDomain[];

  discoveredDomains:
    SelfModelDomain[];

  untestedDomains:
    SelfModelDomain[];

  stableEvidenceCount:
    number;

  preserveEvidenceCount:
    number;

  sourceCount:
    number;

  hopSatisfied:
    boolean;

  confidence:
    number;

  identityCritical:
    boolean;

  rule:
    string;
};

export function evaluatePatternHop(
  pattern:
    SelfModelPattern,
): PatternHopResult {
  const stableEvidence =
    pattern.evidence.filter(
      (item) =>
        item.stable,
    );

  const preserveEvidence =
    stableEvidence.filter(
      (item) =>
        item.preserve,
    );

  const supportingDomains:
    SelfModelDomain[] =
    Array.from(
      new Set(
        preserveEvidence.map(
          (item) =>
            item.domain,
        ),
      ),
    );

  const declaredDomains =
    Array.from(
      new Set(
        pattern.domains,
      ),
    );

  /*
   * A pattern hop is allowed to discover support
   * outside the domains we predicted when defining
   * the pattern. That is evidence of generalization,
   * not invalid evidence.
   *
   * We preserve that expansion explicitly instead
   * of silently rewriting the declaration.
   */
  const discoveredDomains =
    supportingDomains.filter(
      (domain) =>
        !declaredDomains.includes(
          domain,
        ),
    );

  const untestedDomains =
    declaredDomains.filter(
      (domain) =>
        !supportingDomains.includes(
          domain,
        ),
    );

  const sources =
    new Set(
      preserveEvidence.map(
        (item) =>
          item.source,
      ),
    );

  const crossBankSupport =
    sources.size >= 2;

  const crossDomainSupport =
    supportingDomains.length >=
      pattern.minimumHopDomains;

  /*
   * Two independent questionnaire banks can satisfy
   * a near-threshold hop when the evidence spans at
   * least two domains. This prevents duplicated
   * wording inside one bank from masquerading as
   * cross-domain confirmation.
   */
  const crossBankNearThreshold =
    crossBankSupport &&
    supportingDomains.length >=
      Math.max(
        2,
        pattern.minimumHopDomains - 1,
      );

  const hopSatisfied =
    crossDomainSupport ||
    crossBankNearThreshold;

  const stabilityRatio =
    pattern.evidence.length
      ? stableEvidence.length /
        pattern.evidence.length
      : 0;

  const preservationRatio =
    pattern.evidence.length
      ? preserveEvidence.length /
        pattern.evidence.length
      : 0;

  const domainRatio =
    Math.min(
      1,
      supportingDomains.length /
        Math.max(
          1,
          pattern.minimumHopDomains,
        ),
    );

  const sourceRatio =
    Math.min(
      1,
      sources.size / 2,
    );

  const confidence =
    round(
      (
        stabilityRatio *
          0.30 +
        preservationRatio *
          0.30 +
        domainRatio *
          0.25 +
        sourceRatio *
          0.15
      ) *
        100,
    );

  let status:
    PatternHopStatus =
    "hold";

  if (
    stableEvidence.length === 0 ||
    preserveEvidence.length === 0
  ) {
    status =
      "reject";
  } else if (
    hopSatisfied &&
    confidence >= 70
  ) {
    status =
      "preserve";
  }

  return {
    patternId:
      pattern.id,

    label:
      pattern.label,

    status,

    supportingDomains,

    declaredDomains,

    discoveredDomains,

    untestedDomains,

    stableEvidenceCount:
      stableEvidence.length,

    preserveEvidenceCount:
      preserveEvidence.length,

    sourceCount:
      sources.size,

    hopSatisfied,

    confidence,

    identityCritical:
      pattern.identityCritical,

    rule:
      pattern.rule,
  };
}

export function runPatternHopPass():
  PatternHopResult[] {
  return ARBOR_SELF_MODEL_PATTERNS.map(
    evaluatePatternHop,
  );
}

export function preservedPatterns():
  PatternHopResult[] {
  return runPatternHopPass().filter(
    (result) =>
      result.status ===
      "preserve",
  );
}

export function heldPatterns():
  PatternHopResult[] {
  return runPatternHopPass().filter(
    (result) =>
      result.status ===
      "hold",
  );
}

export function rejectedPatterns():
  PatternHopResult[] {
  return runPatternHopPass().filter(
    (result) =>
      result.status ===
      "reject",
  );
}

export function patternHopTargets():
  Array<{
    patternId:
      string;

    label:
      string;

    targetDomains:
      SelfModelDomain[];

    discoveredDomains:
      SelfModelDomain[];

    reason:
      string;
  }> {
  return heldPatterns().map(
    (pattern) => ({
      patternId:
        pattern.patternId,

      label:
        pattern.label,

      targetDomains:
        pattern.untestedDomains,

      discoveredDomains:
        pattern.discoveredDomains,

      reason:
        pattern.untestedDomains.length
          ? "Strong evidence exists, but the pattern still needs independent behavior in adjacent domains before promotion."
          : "Evidence remains below the promotion threshold and needs additional independent observations.",
    }),
  );
}

function round(
  value:
    number,
): number {
  return Math.round(
    value * 10,
  ) / 10;
}
