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
  patternId:
    string;

  label:
    string;

  status:
    PatternHopStatus;

  supportingDomains:
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
):
  PatternHopResult {
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

  const sources =
    new Set(
      preserveEvidence.map(
        (item) =>
          item.source,
      ),
    );

  const declaredDomains =
    new Set<
      SelfModelDomain
    >(
      pattern.domains,
    );

  const evidenceWithinDeclaredDomains =
    supportingDomains.every(
      (domain) =>
        declaredDomains.has(
          domain,
        ),
    );

  const crossBankSupport =
    sources.size >= 2;

  const crossDomainSupport =
    supportingDomains.length >=
      pattern.minimumHopDomains;

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
    preserveEvidence.length === 0 ||
    !evidenceWithinDeclaredDomains
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

  const untestedDomains =
    pattern.domains.filter(
      (domain) =>
        !supportingDomains.includes(
          domain,
        ),
    );

  return {
    patternId:
      pattern.id,

    label:
      pattern.label,

    status,

    supportingDomains,

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
):
  number {
  return Math.round(
    value * 10,
  ) / 10;
}
