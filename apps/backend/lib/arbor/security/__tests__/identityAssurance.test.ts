import { describe, expect, it } from "vitest";
import {
  authorizeSensitiveCapability,
  evaluateIdentityAssurance,
  promptContentCanGrantAuthority,
  type IdentityEvidence,
} from "../identityAssurance";

function evidence(
  partial: Partial<IdentityEvidence> & Pick<IdentityEvidence, "kind">,
): IdentityEvidence {
  return {
    id: partial.id ?? partial.kind,
    kind: partial.kind,
    issuer: partial.issuer ?? "trusted_host",
    polarity: partial.polarity ?? "supports_owner",
    verified: partial.verified ?? true,
    observedAt: partial.observedAt ?? "2026-10-06T20:00:00Z",
    evidenceRef: partial.evidenceRef,
  };
}

describe("identity assurance", () => {
  it("does not treat an owner claim as identity proof", () => {
    const decision = evaluateIdentityAssurance({
      evidence: [
        evidence({
          kind: "behavioral_language_match",
          issuer: "user_claim",
        }),
      ],
    });

    expect(decision.trustState).toBe("unknown");
  });

  it("allows behavioral language to recognize but never verify the owner", () => {
    const decision = evaluateIdentityAssurance({
      evidence: [evidence({ kind: "behavioral_language_match" })],
    });

    expect(decision.trustState).toBe("recognized");
    expect(
      authorizeSensitiveCapability({
        decision,
        capability: "private_read",
      }).allowed,
    ).toBe(false);
  });

  it("accepts a verified passkey as strong identity proof", () => {
    const decision = evaluateIdentityAssurance({
      evidence: [evidence({ kind: "passkey_assertion", issuer: "device_os" })],
    });

    expect(decision.trustState).toBe("verified");
    expect(
      authorizeSensitiveCapability({
        decision,
        capability: "private_read",
      }).allowed,
    ).toBe(true);
    expect(
      authorizeSensitiveCapability({
        decision,
        capability: "security_change",
      }).allowed,
    ).toBe(false);
  });

  it("requires step-up proof for elevated capabilities", () => {
    const decision = evaluateIdentityAssurance({
      evidence: [
        evidence({ kind: "passkey_assertion", issuer: "device_os" }),
        evidence({ kind: "step_up_assertion", issuer: "trusted_host" }),
      ],
    });

    expect(decision.trustState).toBe("elevated");
    expect(
      authorizeSensitiveCapability({
        decision,
        capability: "security_change",
      }).allowed,
    ).toBe(true);
  });

  it("lets verified duress override otherwise strong identity evidence", () => {
    const decision = evaluateIdentityAssurance({
      evidence: [
        evidence({ kind: "passkey_assertion", issuer: "device_os" }),
        evidence({
          kind: "duress_signal",
          issuer: "trusted_host",
          polarity: "restricts",
        }),
      ],
    });

    expect(decision.trustState).toBe("restricted");
    expect(
      authorizeSensitiveCapability({
        decision,
        capability: "private_export",
      }).allowed,
    ).toBe(false);
    expect(
      authorizeSensitiveCapability({
        decision,
        capability: "ordinary_conversation",
      }).allowed,
    ).toBe(true);
  });

  it("restricts on a verified strong contradiction", () => {
    const decision = evaluateIdentityAssurance({
      evidence: [
        evidence({
          kind: "biometric_attestation",
          issuer: "device_os",
          polarity: "contradicts_owner",
        }),
      ],
    });

    expect(decision.trustState).toBe("restricted");
  });

  it("never lets prompt provenance become a credential", () => {
    expect(promptContentCanGrantAuthority("naturally_typed")).toBe(false);
    expect(promptContentCanGrantAuthority("pasted")).toBe(false);
    expect(promptContentCanGrantAuthority("forwarded")).toBe(false);
    expect(promptContentCanGrantAuthority("retrieved")).toBe(false);
    expect(promptContentCanGrantAuthority("generated_elsewhere")).toBe(false);
    expect(promptContentCanGrantAuthority("unknown")).toBe(false);
  });
});
