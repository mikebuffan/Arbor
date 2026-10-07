import { describe, expect, it } from "vitest";
import {
  buildOperationalReceipt,
  publicOperationalReceipt,
  validateOperationalReceipt,
  type OperationalReceipt,
} from "../operationalReceipt";

function base(
  partial: Partial<OperationalReceipt> = {},
): OperationalReceipt {
  return {
    receiptId: "receipt:1",
    occurredAt: "2026-10-07T05:00:00Z",
    kind: "action",
    scope: { projectId: "project:1", turnId: "turn:1" },
    subsystem: "agency",
    action: "run_capability",
    capability: "example.read",
    idempotencyKey: "turn:1:example.read",
    authorization: {
      state: "allowed",
      evidenceRefs: ["auth:session:verified"],
    },
    evidenceRefs: ["tool:result:1"],
    result: {
      state: "completed",
      resultRef: "result:1",
      reasonCode: "verified_result",
    },
    ...partial,
  };
}

describe("operational receipt envelope", () => {
  it("accepts a bounded evidence-backed completed action", () => {
    const receipt = buildOperationalReceipt(base());
    expect(receipt.result.state).toBe("completed");
    expect(receipt.evidenceRefs).toEqual(["tool:result:1"]);
  });

  it("requires evidence for completion or verification", () => {
    expect(() =>
      validateOperationalReceipt(
        base({ evidenceRefs: [], result: { state: "completed" } }),
      ),
    ).toThrow("operational_receipt_completion_evidence_required");
  });

  it("requires authorization evidence when authority affected the operation", () => {
    expect(() =>
      validateOperationalReceipt(
        base({
          authorization: {
            state: "allowed",
            evidenceRefs: [],
          },
        }),
      ),
    ).toThrow("operational_receipt_authorization_evidence_required");
  });

  it("requires a scoped referent instead of a free-floating receipt", () => {
    expect(() =>
      validateOperationalReceipt(base({ scope: {} })),
    ).toThrow("operational_receipt_scope_required");
  });

  it("keeps security restriction distinct from ordinary denial", () => {
    const restricted = validateOperationalReceipt(
      base({
        kind: "security_restriction",
        authorization: {
          state: "restricted",
          evidenceRefs: ["security:decision:opaque"],
        },
        result: {
          state: "blocked",
          reasonCode: "sensitive_capability_unavailable",
        },
        evidenceRefs: [],
      }),
    );
    expect(restricted.authorization.state).toBe("restricted");

    expect(() =>
      validateOperationalReceipt(
        base({
          kind: "security_restriction",
          authorization: {
            state: "denied",
            evidenceRefs: ["security:decision:opaque"],
          },
          result: { state: "blocked", reasonCode: "denied" },
          evidenceRefs: [],
        }),
      ),
    ).toThrow("operational_receipt_security_restriction_mismatch");
  });

  it("uses machine reason codes instead of unrestricted narrative reasoning", () => {
    expect(() =>
      validateOperationalReceipt(
        base({
          result: {
            state: "blocked",
            reasonCode: "I thought about the user's psychology and decided this was suspicious.",
          },
        }),
      ),
    ).toThrow("invalid_operational_receipt_reason_code");
  });

  it("public projection contains no arbitrary detail or reasoning field", () => {
    const visible = publicOperationalReceipt(base());
    expect(Object.keys(visible)).not.toContain("detail");
    expect(Object.keys(visible)).not.toContain("reasoning");
    expect(Object.keys(visible)).not.toContain("prompt");
    expect(Object.keys(visible)).not.toContain("biometricFactors");
  });

  it("supports supersession without deleting the prior receipt", () => {
    const receipt = validateOperationalReceipt(
      base({
        receiptId: "receipt:2",
        kind: "correction",
        action: "supersede_prior_correction",
        supersedesReceiptId: "receipt:1",
        result: { state: "superseded", reasonCode: "newer_valid_correction" },
        evidenceRefs: ["correction:2"],
      }),
    );
    expect(receipt.supersedesReceiptId).toBe("receipt:1");
  });
});
