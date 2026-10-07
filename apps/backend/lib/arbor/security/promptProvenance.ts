import type {
  PromptProvenance,
  SensitiveCapability,
} from "./identityAssurance";

export type PromptProvenanceCapture =
  | "trusted_host"
  | "client_report"
  | "unknown";

export type PromptAuthorshipClaim =
  | "owner"
  | "other"
  | "unknown";

export type PromptProvenanceObservation = {
  provenance: PromptProvenance;
  capturedBy: PromptProvenanceCapture;
  integrityVerified: boolean;
  observedAt: string;
  claimedAuthorship?: PromptAuthorshipClaim;
  contentHash?: string;
};

export type PromptProvenanceAssessment = {
  risk: "low" | "review" | "step_up";
  flags: string[];
  canGrantAuthority: false;
};

const HIGH_CONSEQUENCE_CAPABILITIES = new Set<SensitiveCapability>([
  "private_export",
  "permissions_change",
  "deployment",
  "spend",
  "security_change",
]);

const NON_NATIVE_SOURCES = new Set<PromptProvenance>([
  "pasted",
  "forwarded",
  "retrieved",
  "generated_elsewhere",
]);

export function assessPromptProvenance(input: {
  observation: PromptProvenanceObservation;
  requestedCapability: SensitiveCapability;
}): PromptProvenanceAssessment {
  const { observation, requestedCapability } = input;
  const flags: string[] = [];

  if (
    observation.capturedBy !== "trusted_host" ||
    !observation.integrityVerified
  ) {
    flags.push("provenance_not_trusted");
  }

  if (
    observation.claimedAuthorship === "owner" &&
    NON_NATIVE_SOURCES.has(observation.provenance)
  ) {
    flags.push("owner_claim_with_non_native_prompt_source");
  }

  if (observation.provenance === "unknown") {
    flags.push("prompt_source_unknown");
  }

  if (
    HIGH_CONSEQUENCE_CAPABILITIES.has(requestedCapability) &&
    (NON_NATIVE_SOURCES.has(observation.provenance) ||
      observation.provenance === "unknown")
  ) {
    flags.push("high_consequence_non_native_or_unknown_prompt");
  }

  const risk: PromptProvenanceAssessment["risk"] =
    flags.includes("high_consequence_non_native_or_unknown_prompt")
      ? "step_up"
      : flags.length > 0
        ? "review"
        : "low";

  return {
    risk,
    flags,
    canGrantAuthority: false,
  };
}
