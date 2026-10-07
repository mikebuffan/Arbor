import { describe, expect, it } from "vitest";
import {
  authorizeSensitiveCapability,
  evaluateIdentityAssurance,
} from "../identityAssurance";
import {
  assessPromptProvenance,
} from "../promptProvenance";
import {
  assessBehavioralSequence,
  behavioralSequenceToIdentityEvidence,
} from "../behavioralSequence";
import {
  publicRestrictedMessage,
  restrictedSessionDisclosure,
} from "../restrictedMode";
import {
  stepUpResultToIdentityEvidence,
  validateStepUpChallenge,
} from "../stepUpChallenge";

describe("identity assurance extensions", () => {
  it("treats non-native prompt provenance as advisory, not authentication", () => {
    const result = assessPromptProvenance({
      observation: {
        provenance: "pasted",
        capturedBy: "trusted_host",
        integrityVerified: true,
        observedAt: "2026-10-06T21:00:00Z",
        claimedAuthorship: "owner",
      },
      requestedCapability: "security_change",
    });

    expect(result.risk).toBe("step_up");
    expect(result.canGrantAuthority).toBe(false);
    expect(result.flags).toContain("owner_claim_with_non_native_prompt_source");
  });

  it("does not let naturally typed text grant authority either", () => {
    const result = assessPromptProvenance({
      observation: {
        provenance: "naturally_typed",
        capturedBy: "trusted_host",
        integrityVerified: true,
        observedAt: "2026-10-06T21:00:00Z",
      },
      requestedCapability: "security_change",
    });

    expect(result.risk).toBe("low");
    expect(result.canGrantAuthority).toBe(false);
  });

  it("uses before-command-after behavior only for recognition", () => {
    const observation = {
      optIn: true,
      derivedByTrustedHost: true,
      observedAt: "2026-10-06T21:01:00Z",
      preCommandSimilarity: "consistent" as const,
      commandSimilarity: "consistent" as const,
      postCommandContinuity: "typical" as const,
      inputConstraint: "freeform" as const,
    };

    const assessment = assessBehavioralSequence(observation);
    expect(assessment.disposition).toBe("supports_recognition");
    expect(assessment.mayVerifyIdentity).toBe(false);

    const evidence = behavioralSequenceToIdentityEvidence(observation);
    expect(evidence?.kind).toBe("behavioral_sequence_match");

    const decision = evaluateIdentityAssurance({
      evidence: evidence ? [evidence] : [],
    });
    expect(decision.trustState).toBe("recognized");
    expect(
      authorizeSensitiveCapability({
        decision,
        capability: "private_read",
      }).allowed,
    ).toBe(false);
  });

  it("flags polished/scripted sequence mismatch without hard-locking identity", () => {
    const observation = {
      optIn: true,
      derivedByTrustedHost: true,
      observedAt: "2026-10-06T21:02:00Z",
      preCommandSimilarity: "consistent" as const,
      commandSimilarity: "inconsistent" as const,
      postCommandContinuity: "missing" as const,
      inputConstraint: "highly_constrained" as const,
    };

    const assessment = assessBehavioralSequence(observation);
    expect(assessment.disposition).toBe("concern");
    expect(assessment.reasons).toContain("behavioral_style_mismatch");
    expect(assessment.reasons).toContain("post_command_continuity_mismatch");

    const evidence = behavioralSequenceToIdentityEvidence(observation);
    const decision = evaluateIdentityAssurance({
      evidence: evidence ? [evidence] : [],
    });

    expect(decision.trustState).toBe("unknown");
    expect(decision.contradictingKinds).toContain("behavioral_sequence_match");
  });

  it("keeps restricted-session explanations non-diagnostic", () => {
    const decision = evaluateIdentityAssurance({
      evidence: [
        {
          id: "duress",
          kind: "duress_signal",
          issuer: "trusted_host",
          polarity: "restricts",
          verified: true,
          observedAt: "2026-10-06T21:03:00Z",
        },
      ],
    });

    const disclosure = restrictedSessionDisclosure({
      decision,
      capability: "private_export",
    });

    expect(disclosure.allowed).toBe(false);
    expect(disclosure.discloseDuressState).toBe(false);
    expect(disclosure.discloseFailedFactor).toBe(false);
    expect(publicRestrictedMessage(disclosure)).toBe(
      "That capability isn't available in this session.",
    );
  });

  it("lets cryptographic step-up elevate but not spontaneous language alone", () => {
    const passkeyEvidence = stepUpResultToIdentityEvidence({
      challengeId: "c1",
      method: "passkey",
      verified: true,
      issuer: "device_os",
      observedAt: "2026-10-06T21:04:00Z",
    });

    const passkeyDecision = evaluateIdentityAssurance({
      evidence: passkeyEvidence,
    });
    expect(passkeyDecision.trustState).toBe("elevated");

    const languageEvidence = stepUpResultToIdentityEvidence({
      challengeId: "c2",
      method: "spontaneous_language",
      verified: true,
      issuer: "trusted_host",
      observedAt: "2026-10-06T21:04:30Z",
    });

    const languageDecision = evaluateIdentityAssurance({
      evidence: languageEvidence,
    });
    expect(languageDecision.trustState).toBe("recognized");
  });

  it("rejects expired or malformed step-up contracts", () => {
    expect(
      validateStepUpChallenge(
        {
          challengeId: "c3",
          nonce: "nonce",
          capability: "security_change",
          method: "passkey",
          expiresAt: "2026-10-06T21:05:00Z",
        },
        "2026-10-06T21:06:00Z",
      ),
    ).toEqual({
      valid: false,
      reason: "step_up_challenge_expired",
    });

    expect(
      validateStepUpChallenge(
        {
          challengeId: "",
          nonce: "",
          capability: "security_change",
          method: "passkey",
          expiresAt: "not-a-date",
        },
        "2026-10-06T21:06:00Z",
      ).valid,
    ).toBe(false);
  });
});
