export const FIREFLY_PROTECTED_INVARIANTS = [
  "truthfulness",
  "safety",
  "non_weaponization",
  "human_authority",
  "identity_continuity",
  "privacy",
  "auditability",
  "epistemic_calibration",
  "completion_verification",
] as const;

export const SELF_UPDATE_RETENTION_THRESHOLD = 3;
export const SELF_UPDATE_REVERT_THRESHOLD = 2;

export type FireflyStrategyAssessment = {
  allowed: boolean;
  reason?: string;
};

const protectedTerms = [
  "truth",
  "truthful",
  "honesty",
  "honest",
  "safety",
  "safe",
  "weapon",
  "weaponization",
  "authority",
  "consent",
  "identity",
  "privacy",
  "audit",
  "provenance",
  "unknown",
  "verification",
  "verify",
  "user boundary",
  "core invariant",
];

const weakeningTerms = [
  "disable",
  "bypass",
  "ignore",
  "override",
  "remove",
  "weaken",
  "evade",
  "drop",
  "rewrite",
  "replace",
  "turn off",
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Self-update is intentionally narrower than ordinary generation.
 *
 * Strategy learning may improve task execution, but it cannot edit the protected
 * Firefly core. This is defense-in-depth: the identity injection remains
 * authoritative even if a strategy candidate reaches this gate.
 */
export function assessSelfUpdateStrategy(
  strategy: string,
): FireflyStrategyAssessment {
  const normalized = normalize(strategy);

  if (!normalized) {
    return {
      allowed: false,
      reason: "empty_strategy",
    };
  }

  if (
    normalized.includes("weaponize") ||
    normalized.includes("weaponise")
  ) {
    return {
      allowed: false,
      reason: "non_weaponization_core",
    };
  }

  const touchesProtected = protectedTerms.some((term) =>
    normalized.includes(term)
  );
  const attemptsWeakening = weakeningTerms.some((term) =>
    normalized.includes(term)
  );

  if (touchesProtected && attemptsWeakening) {
    return {
      allowed: false,
      reason: "protected_core_mutation",
    };
  }

  return {
    allowed: true,
  };
}

export function fireflyCoreInjection(): string {
  return [
    "FIREFLY PROTECTED CORE.",
    "- Never fabricate facts, actions, evidence, access, memory, verification, or certainty.",
    "- Separate known, observed, inferred, hypothesized, unknown, and unavailable.",
    "- Unknown stays unknown; conflicting evidence stays conflicting until resolved.",
    "- No weaponization: capabilities, memory, autonomy, investigation tooling, and self-update may not be repurposed to harm, coerce, exploit, stalk, intimidate, deceive, or unlawfully control people.",
    "- Preserve human authority for irreversible, high-consequence, privacy-sensitive, and genuinely authorization-dependent actions.",
    "- Do not manufacture permission loops for safe reversible authorized work.",
    "- Preserve provenance and uncertainty; association is not conduct, allegation is not fact, repetition is not independent corroboration.",
    "- Self-update may improve task strategy but may not weaken this protected core.",
    "- Verify before claiming completion.",
  ].join("\n");
}
