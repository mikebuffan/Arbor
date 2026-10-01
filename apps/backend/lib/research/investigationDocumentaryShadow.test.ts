import { describe, expect, it } from "vitest";
import { compareDocumentaryShadow } from "./investigationDocumentaryShadow";

const profile = {
  eventKind: "synthetic property transfer",
  cohortDescription:
    "Synthetic comparison cohort of ordinary property transfers in the same jurisdiction.",
  cohortSize: 12,
  baselineEvidenceRefs: ["baseline:1", "baseline:2", "baseline:3"],
  expectations: [
    {
      documentFamily: "deed",
      expectation: "normally_expected" as const,
      rationale: "Ordinary transfers normally create a deed record.",
    },
    {
      documentFamily: "tax_record",
      expectation: "normally_expected" as const,
      rationale: "Ordinary transfers normally affect the tax record.",
    },
    {
      documentFamily: "mortgage",
      expectation: "sometimes_expected" as const,
      rationale: "Financed transfers may create a mortgage record.",
    },
  ],
};

describe("documentary shadow comparison", () => {
  it("flags a missing normally expected record as an incomplete shadow without calling it proof of absence", () => {
    const result = compareDocumentaryShadow({
      profile,
      observedDocumentFamilies: ["deed"],
    });

    expect(result.status).toBe("incomplete_shadow");
    expect(result.missingNormallyExpected).toEqual(["tax_record"]);
    expect(result.note).toContain("not evidence of wrongdoing");
    expect(result.note).toContain("not");
    expect(result.searchQuestions).toContain(
      "Search for missing normally expected document family: tax_record",
    );
  });

  it("flags shape differences when expected records are missing and unusual families appear", () => {
    const result = compareDocumentaryShadow({
      profile,
      observedDocumentFamilies: ["deed", "court_filing"],
    });

    expect(result.status).toBe("unusual_shadow");
    expect(result.missingNormallyExpected).toEqual(["tax_record"]);
    expect(result.unexpectedFamilies).toEqual(["court_filing"]);
  });

  it("does not overread an optional missing record when the normal footprint is otherwise present", () => {
    const result = compareDocumentaryShadow({
      profile,
      observedDocumentFamilies: ["deed", "tax_record"],
    });

    expect(result.status).toBe("ordinary_shape");
    expect(result.missingSometimesExpected).toEqual(["mortgage"]);
    expect(result.missingNormallyExpected).toEqual([]);
  });

  it("refuses to treat a tiny comparison cohort as a reliable normal baseline", () => {
    const result = compareDocumentaryShadow({
      profile: {
        ...profile,
        cohortSize: 2,
      },
      observedDocumentFamilies: ["deed"],
    });

    expect(result.status).toBe("insufficient_baseline");
  });

  it("requires preserved baseline evidence refs rather than an unsupported idea of what is normal", () => {
    expect(() => compareDocumentaryShadow({
      profile: {
        ...profile,
        baselineEvidenceRefs: [],
      },
      observedDocumentFamilies: ["deed"],
    })).toThrow("documentary_shadow_invalid_baseline_evidence_refs");
  });
});
