import type {
  IdentityEvidence,
  IdentityEvidenceIssuer,
  SensitiveCapability,
} from "./identityAssurance";

export type StepUpMethod =
  | "passkey"
  | "hardware_key"
  | "device_biometric"
  | "spontaneous_language";

export type StepUpChallengeContract = {
  challengeId: string;
  nonce: string;
  capability: SensitiveCapability;
  method: StepUpMethod;
  expiresAt: string;
};

export type StepUpVerificationResult = {
  challengeId: string;
  method: StepUpMethod;
  verified: boolean;
  issuer: Exclude<IdentityEvidenceIssuer, "user_claim" | "unknown">;
  observedAt: string;
  evidenceRef?: string;
};

export function stepUpResultToIdentityEvidence(
  result: StepUpVerificationResult,
): IdentityEvidence[] {
  if (!result.verified) return [];

  const common = {
    issuer: result.issuer,
    verified: true,
    observedAt: result.observedAt,
    evidenceRef: result.evidenceRef,
  } as const;

  switch (result.method) {
    case "passkey":
    case "hardware_key":
      return [
        {
          id: result.challengeId + ":passkey",
          kind: "passkey_assertion",
          polarity: "supports_owner",
          ...common,
        },
        {
          id: result.challengeId + ":step-up",
          kind: "step_up_assertion",
          polarity: "supports_owner",
          ...common,
        },
      ];
    case "device_biometric":
      return [
        {
          id: result.challengeId + ":biometric",
          kind: "biometric_attestation",
          polarity: "supports_owner",
          ...common,
        },
        {
          id: result.challengeId + ":step-up",
          kind: "step_up_assertion",
          polarity: "supports_owner",
          ...common,
        },
      ];
    case "spontaneous_language":
      return [
        {
          id: result.challengeId + ":behavior",
          kind: "behavioral_sequence_match",
          polarity: "supports_owner",
          ...common,
        },
      ];
  }
}

export function validateStepUpChallenge(
  challenge: StepUpChallengeContract,
  nowIso: string,
): { valid: boolean; reason: string } {
  const now = Date.parse(nowIso);
  const expires = Date.parse(challenge.expiresAt);

  if (
    !challenge.challengeId.trim() ||
    !challenge.nonce.trim() ||
    !Number.isFinite(now) ||
    !Number.isFinite(expires)
  ) {
    return { valid: false, reason: "invalid_step_up_contract" };
  }

  if (expires <= now) {
    return { valid: false, reason: "step_up_challenge_expired" };
  }

  return { valid: true, reason: "step_up_challenge_valid" };
}
