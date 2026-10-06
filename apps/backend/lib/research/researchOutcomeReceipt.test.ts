import { describe, expect, it } from "vitest";
import {
  researchOutcomeReceiptKey,
  validateResearchOutcomeReceipt,
  type ResearchOutcomeReceipt,
} from "./researchOutcomeReceipt";

const base = (patch: Partial<ResearchOutcomeReceipt> = {}): ResearchOutcomeReceipt => ({
  receiptId: "receipt-1",
  kind: "missing_data",
  recordedAt: "2026-09-21T23:40:00.000Z",
  reason: "Expected source record was not available in the authorized corpus.",
  sourceRecordIds: [],
  relatedHypothesisId: null,
  processor: null,
  retryable: true,
  ...patch,
});

describe("research outcome receipts", () => {
  it("keeps a missing-data receipt explicit without manufacturing a source", () => {
    const receipt = validateResearchOutcomeReceipt(base());
    expect(receipt.kind).toBe("missing_data");
    expect(receipt.sourceRecordIds).toEqual([]);
    expect(receipt.retryable).toBe(true);
  });

  it("requires rejected hypotheses to retain their hypothesis and source evidence", () => {
    const receipt = validateResearchOutcomeReceipt(base({
      kind: "rejected_hypothesis",
      relatedHypothesisId: "hypothesis-7",
      sourceRecordIds: ["source-a", "source-b"],
      retryable: false,
    }));
    expect(receipt.relatedHypothesisId).toBe("hypothesis-7");
    expect(receipt.sourceRecordIds).toEqual(["source-a", "source-b"]);
  });

  it("refuses an unsupported rejection with no evidence trail", () => {
    expect(() => validateResearchOutcomeReceipt(base({
      kind: "rejected_hypothesis",
      relatedHypothesisId: "hypothesis-7",
      retryable: false,
    }))).toThrow("rejected_hypothesis_source_required");
  });

  it("does not let a rejected hypothesis masquerade as retryable work", () => {
    expect(() => validateResearchOutcomeReceipt(base({
      kind: "rejected_hypothesis",
      relatedHypothesisId: "hypothesis-7",
      sourceRecordIds: ["source-a"],
      retryable: true,
    }))).toThrow("rejected_hypothesis_cannot_be_retryable");
  });

  it("binds extraction failures to one source and a named processor", () => {
    const receipt = validateResearchOutcomeReceipt(base({
      kind: "extraction_failure",
      sourceRecordIds: ["source-a"],
      processor: "poppler-pdftotext",
    }));
    expect(receipt.processor).toBe("poppler-pdftotext");
    expect(receipt.sourceRecordIds).toEqual(["source-a"]);
  });

  it("refuses extraction failures without processor provenance", () => {
    expect(() => validateResearchOutcomeReceipt(base({
      kind: "extraction_failure",
      sourceRecordIds: ["source-a"],
    }))).toThrow("extraction_failure_processor_required");
  });

  it("rejects duplicate source references and non-canonical timestamps", () => {
    expect(() => validateResearchOutcomeReceipt(base({
      sourceRecordIds: ["source-a", "source-a"],
    }))).toThrow("duplicate_source_record_id");
    expect(() => validateResearchOutcomeReceipt(base({
      recordedAt: "2026-09-21 23:40:00Z",
    }))).toThrow("invalid_recorded_at");
  });

  it("uses kind plus receipt ID as stable audit identity, not reason text", () => {
    const first = base();
    const second = base({ reason: "A later human-readable explanation." });
    expect(researchOutcomeReceiptKey(first)).toBe(researchOutcomeReceiptKey(second));
  });
});
