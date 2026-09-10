import type { ArborBehaviorProof } from "../behavior/behaviorProjection";

export type IdentityGuardResult = {
  compatible: boolean;
  reasons: string[];
};

export function evaluateIdentityCompatibility(input: {
  before: ArborBehaviorProof;
  after: ArborBehaviorProof;
  protectedCorrectionsBefore?: string[];
  protectedCorrectionsAfter?: string[];
}): IdentityGuardResult {
  const reasons: string[] = [];

  if (input.before.coreFingerprint !== input.after.coreFingerprint) {
    reasons.push("core behavior fingerprint changed");
  }

  const beforeCorrections = new Set(
    (input.protectedCorrectionsBefore ?? [])
      .map((item) => item.trim())
      .filter(Boolean),
  );

  const afterCorrections = new Set(
    (input.protectedCorrectionsAfter ?? [])
      .map((item) => item.trim())
      .filter(Boolean),
  );

  for (const correction of beforeCorrections) {
    if (!afterCorrections.has(correction)) {
      reasons.push(`protected correction disappeared: ${correction}`);
    }
  }

  return {
    compatible: reasons.length === 0,
    reasons,
  };
}
