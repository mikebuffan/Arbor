import type { IdentityEvidence } from "./identityAssurance";

export type BehavioralSimilarity =
  | "consistent"
  | "uncertain"
  | "inconsistent";

export type PostCommandContinuity =
  | "typical"
  | "neutral"
  | "unusual"
  | "missing";

export type InputConstraintSignal =
  | "freeform"
  | "possibly_scripted"
  | "highly_constrained"
  | "unknown";

export type BehavioralSequenceObservation = {
  optIn: boolean;
  derivedByTrustedHost: boolean;
  observedAt: string;
  preCommandSimilarity: BehavioralSimilarity;
  commandSimilarity: BehavioralSimilarity;
  postCommandContinuity: PostCommandContinuity;
  inputConstraint: InputConstraintSignal;
  evidenceRef?: string;
};

export type BehavioralSequenceAssessment = {
  disposition: "supports_recognition" | "neutral" | "concern";
  reasons: string[];
  mayVerifyIdentity: false;
};

export function assessBehavioralSequence(
  observation: BehavioralSequenceObservation,
): BehavioralSequenceAssessment {
  const reasons: string[] = [];

  if (!observation.optIn) {
    return {
      disposition: "neutral",
      reasons: ["behavioral_identity_not_opted_in"],
      mayVerifyIdentity: false,
    };
  }

  if (!observation.derivedByTrustedHost) {
    return {
      disposition: "neutral",
      reasons: ["behavioral_signal_not_trusted"],
      mayVerifyIdentity: false,
    };
  }

  if (
    observation.inputConstraint === "possibly_scripted" ||
    observation.inputConstraint === "highly_constrained"
  ) {
    reasons.push("language_may_be_scripted_or_constrained");
  }

  if (
    observation.preCommandSimilarity === "inconsistent" ||
    observation.commandSimilarity === "inconsistent"
  ) {
    reasons.push("behavioral_style_mismatch");
  }

  if (
    observation.postCommandContinuity === "unusual" ||
    observation.postCommandContinuity === "missing"
  ) {
    reasons.push("post_command_continuity_mismatch");
  }

  if (reasons.length > 0) {
    return {
      disposition: "concern",
      reasons,
      mayVerifyIdentity: false,
    };
  }

  if (
    observation.preCommandSimilarity === "consistent" &&
    observation.commandSimilarity === "consistent" &&
    observation.postCommandContinuity === "typical" &&
    observation.inputConstraint === "freeform"
  ) {
    return {
      disposition: "supports_recognition",
      reasons: ["longitudinal_behavioral_sequence_consistent"],
      mayVerifyIdentity: false,
    };
  }

  return {
    disposition: "neutral",
    reasons: ["behavioral_sequence_inconclusive"],
    mayVerifyIdentity: false,
  };
}

export function behavioralSequenceToIdentityEvidence(
  observation: BehavioralSequenceObservation,
): IdentityEvidence | null {
  const assessment = assessBehavioralSequence(observation);

  if (
    !observation.optIn ||
    !observation.derivedByTrustedHost ||
    assessment.disposition === "neutral"
  ) {
    return null;
  }

  return {
    id: "behavioral-sequence:" + observation.observedAt,
    kind: "behavioral_sequence_match",
    issuer: "trusted_host",
    polarity:
      assessment.disposition === "supports_recognition"
        ? "supports_owner"
        : "contradicts_owner",
    verified: true,
    observedAt: observation.observedAt,
    evidenceRef: observation.evidenceRef,
  };
}
