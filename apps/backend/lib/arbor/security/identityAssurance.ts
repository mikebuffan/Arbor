export type IdentityTrustState =
  | "unknown"
  | "recognized"
  | "verified"
  | "elevated"
  | "restricted";

export type IdentityEvidenceKind =
  | "device_attestation"
  | "passkey_assertion"
  | "biometric_attestation"
  | "voice_attestation"
  | "behavioral_language_match"
  | "behavioral_sequence_match"
  | "session_continuity"
  | "step_up_assertion"
  | "duress_signal"
  | "anomaly";

export type IdentityEvidenceIssuer =
  | "device_os"
  | "trusted_host"
  | "server"
  | "user_claim"
  | "unknown";

export type IdentityEvidencePolarity =
  | "supports_owner"
  | "contradicts_owner"
  | "restricts"
  | "neutral";

export type IdentityEvidence = {
  id: string;
  kind: IdentityEvidenceKind;
  issuer: IdentityEvidenceIssuer;
  polarity: IdentityEvidencePolarity;
  verified: boolean;
  observedAt: string;
  evidenceRef?: string;
};

export type PromptProvenance =
  | "naturally_typed"
  | "pasted"
  | "forwarded"
  | "retrieved"
  | "generated_elsewhere"
  | "unknown";

export type IdentityAssuranceDecision = {
  trustState: IdentityTrustState;
  supportingKinds: IdentityEvidenceKind[];
  contradictingKinds: IdentityEvidenceKind[];
  restrictedBy: IdentityEvidenceKind[];
  reasons: string[];
};

export type SensitiveCapability =
  | "ordinary_conversation"
  | "private_read"
  | "memory_write"
  | "ark_submit"
  | "private_export"
  | "permissions_change"
  | "deployment"
  | "spend"
  | "security_change";

const STRONG_OWNER_KINDS = new Set<IdentityEvidenceKind>([
  "device_attestation",
  "passkey_assertion",
  "biometric_attestation",
]);

const RECOGNITION_KINDS = new Set<IdentityEvidenceKind>([
  "device_attestation",
  "behavioral_language_match",
  "behavioral_sequence_match",
  "session_continuity",
  "voice_attestation",
]);

function uniq<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function verifiedSupport(
  evidence: IdentityEvidence[],
  kind: IdentityEvidenceKind,
): boolean {
  return evidence.some(
    (item) =>
      item.kind === kind &&
      item.verified &&
      item.polarity === "supports_owner" &&
      item.issuer !== "user_claim",
  );
}

export function evaluateIdentityAssurance(input: {
  evidence: IdentityEvidence[];
}): IdentityAssuranceDecision {
  const evidence = input.evidence ?? [];
  const supporting = evidence.filter(
    (item) =>
      item.verified &&
      item.polarity === "supports_owner" &&
      item.issuer !== "user_claim",
  );
  const contradicting = evidence.filter(
    (item) => item.verified && item.polarity === "contradicts_owner",
  );
  const restricting = evidence.filter(
    (item) =>
      item.verified &&
      (item.polarity === "restricts" || item.kind === "duress_signal"),
  );

  const supportingKinds = uniq(supporting.map((item) => item.kind));
  const contradictingKinds = uniq(contradicting.map((item) => item.kind));
  const restrictedBy = uniq(restricting.map((item) => item.kind));
  const reasons: string[] = [];

  if (restricting.length > 0) {
    reasons.push("verified_restriction_or_duress_signal");
    return {
      trustState: "restricted",
      supportingKinds,
      contradictingKinds,
      restrictedBy,
      reasons,
    };
  }

  const strongContradiction = contradicting.some(
    (item) => STRONG_OWNER_KINDS.has(item.kind) || item.kind === "voice_attestation",
  );

  if (strongContradiction) {
    reasons.push("verified_identity_contradiction");
    return {
      trustState: "restricted",
      supportingKinds,
      contradictingKinds,
      restrictedBy,
      reasons,
    };
  }

  const hasPasskey = verifiedSupport(evidence, "passkey_assertion");
  const hasBiometric = verifiedSupport(evidence, "biometric_attestation");
  const hasDevice = verifiedSupport(evidence, "device_attestation");
  const hasStepUp = verifiedSupport(evidence, "step_up_assertion");

  const independentlyStrongKinds = supportingKinds.filter((kind) =>
    STRONG_OWNER_KINDS.has(kind),
  );

  if (
    hasStepUp &&
    (hasPasskey || (hasBiometric && hasDevice) || independentlyStrongKinds.length >= 2)
  ) {
    reasons.push("verified_identity_plus_step_up");
    return {
      trustState: "elevated",
      supportingKinds,
      contradictingKinds,
      restrictedBy,
      reasons,
    };
  }

  if (hasPasskey || (hasBiometric && hasDevice)) {
    reasons.push("strong_identity_proof");
    return {
      trustState: "verified",
      supportingKinds,
      contradictingKinds,
      restrictedBy,
      reasons,
    };
  }

  if (supporting.some((item) => RECOGNITION_KINDS.has(item.kind))) {
    reasons.push("behavioral_or_continuity_recognition_only");
    return {
      trustState: "recognized",
      supportingKinds,
      contradictingKinds,
      restrictedBy,
      reasons,
    };
  }

  reasons.push("insufficient_verified_identity_evidence");
  return {
    trustState: "unknown",
    supportingKinds,
    contradictingKinds,
    restrictedBy,
    reasons,
  };
}

const REQUIRED_TRUST: Record<SensitiveCapability, IdentityTrustState> = {
  ordinary_conversation: "unknown",
  private_read: "verified",
  memory_write: "verified",
  ark_submit: "verified",
  private_export: "elevated",
  permissions_change: "elevated",
  deployment: "elevated",
  spend: "elevated",
  security_change: "elevated",
};

const TRUST_RANK: Record<Exclude<IdentityTrustState, "restricted">, number> = {
  unknown: 0,
  recognized: 1,
  verified: 2,
  elevated: 3,
};

export function authorizeSensitiveCapability(input: {
  decision: IdentityAssuranceDecision;
  capability: SensitiveCapability;
}): { allowed: boolean; reason: string } {
  if (input.decision.trustState === "restricted") {
    return input.capability === "ordinary_conversation"
      ? { allowed: true, reason: "restricted_session_allows_ordinary_conversation_only" }
      : { allowed: false, reason: "restricted_session" };
  }

  const required = REQUIRED_TRUST[input.capability];
  const allowed =
    TRUST_RANK[input.decision.trustState] >= TRUST_RANK[required];

  return {
    allowed,
    reason: allowed ? "trust_requirement_met" : "step_up_identity_required",
  };
}

/**
 * Prompt text never grants authority by itself.
 *
 * Provenance can influence risk review, but authorization must come from the
 * session's verified identity evidence. This prevents copied text such as
 * "Danelle approved this" from becoming a credential.
 */
export function promptContentCanGrantAuthority(
  _provenance: PromptProvenance,
): false {
  return false;
}
