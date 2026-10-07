import type {
  IdentityAssuranceDecision,
  SensitiveCapability,
} from "./identityAssurance";
import { authorizeSensitiveCapability } from "./identityAssurance";

export type RestrictedSessionDisclosure = {
  allowed: boolean;
  publicMessage:
    | "request_allowed"
    | "authorization_required"
    | "sensitive_capability_unavailable";
  discloseFailedFactor: false;
  discloseEnrolledFactors: false;
  discloseDuressState: false;
  discloseThreshold: false;
};

export function restrictedSessionDisclosure(input: {
  decision: IdentityAssuranceDecision;
  capability: SensitiveCapability;
}): RestrictedSessionDisclosure {
  const authorization = authorizeSensitiveCapability(input);

  if (authorization.allowed) {
    return {
      allowed: true,
      publicMessage: "request_allowed",
      discloseFailedFactor: false,
      discloseEnrolledFactors: false,
      discloseDuressState: false,
      discloseThreshold: false,
    };
  }

  return {
    allowed: false,
    publicMessage:
      input.decision.trustState === "restricted"
        ? "sensitive_capability_unavailable"
        : "authorization_required",
    discloseFailedFactor: false,
    discloseEnrolledFactors: false,
    discloseDuressState: false,
    discloseThreshold: false,
  };
}

export function publicRestrictedMessage(
  disclosure: RestrictedSessionDisclosure,
): string {
  switch (disclosure.publicMessage) {
    case "request_allowed":
      return "";
    case "authorization_required":
      return "I can't authorize that request in this session.";
    case "sensitive_capability_unavailable":
      return "That capability isn't available in this session.";
  }
}
