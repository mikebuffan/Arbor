import { describe, expect, it } from "vitest";
import {
  assertInvestigationFindingPromotable,
  countIndependentLineages,
  evaluateInvestigationIntegrity,
  primarySourceLeads,
  type InvestigationEvidenceAtom,
  type InvestigationFindingDraft,
} from "./investigationIntegrity";

function evidence(
  overrides: Partial<InvestigationEvidenceAtom> = {},
): InvestigationEvidenceAtom {
  return {
    id: "evidence-1",
    evidenceClass: "PRIMARY_RECORD",
    sourceRef: "court:exhibit-1",
    lineageKey: "court:exhibit-1",
    content: "Synthetic primary-source content.",
    contentSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    supports: ["established_act"],
    ...overrides,
  };
}

function draft(
  overrides: Partial<InvestigationFindingDraft> = {},
): InvestigationFindingDraft {
  return {
    claimId: "claim-1",
    claimText: "Synthetic act occurred.",
    assertionKind: "established_act",
    support: [evidence()],
    counterEvidenceRefs: [],
    unresolvedContradictionIds: [],
    falsificationAttempts: [{
      id: "break-1",
      hypothesis: "The act did not occur as claimed.",
      result: "claim_survived",
      evidenceRefs: ["court:exhibit-2"],
    }],
    negativeEvidence: null,
    ...overrides,
  };
}

describe("investigation integrity gate", () => {
  it("does not turn an attributed statement into a direct confession", () => {
    const result = evaluateInvestigationIntegrity(draft({
      assertionKind: "direct_confession",
      claimText: "Subject confessed.",
      support: [evidence({
        evidenceClass: "ATTRIBUTED_STATEMENT",
        sourceRef: "witness:testimony",
        lineageKey: "witness:testimony",
        content: "Witness testified that Subject told them a voice said to do X.",
        supports: ["attributed_statement"],
      })],
      falsificationAttempts: [],
    }));

    expect(result.status).toBe("hold");
    expect(result.reasons).toContain(
      "direct_admission_requires_primary_or_recorded_support",
    );
    expect(result.reasons).toContain(
      "support_does_not_match_assertion_kind",
    );
  });

  it("does not treat a procedural litigation position as a defendant admission", () => {
    const procedural = evidence({
      evidenceClass: "PROCEDURAL_LITIGATION_POSITION",
      sourceRef: "court:defense-motion",
      lineageKey: "court:defense-motion",
      content:
        "Counsel offers to stipulate to conduct for a bifurcated proceeding.",
      supports: ["procedural_position"],
    });

    const result = evaluateInvestigationIntegrity(draft({
      assertionKind: "direct_admission",
      claimText: "Defendant personally admitted the act.",
      support: [procedural],
      falsificationAttempts: [],
    }));

    expect(result.status).toBe("hold");
    expect(result.reasons).toContain(
      "direct_admission_requires_primary_or_recorded_support",
    );
    expect(result.reasons).toContain(
      "support_does_not_match_assertion_kind",
    );
  });

  it("counts repeated reporting from one lineage only once", () => {
    expect(countIndependentLineages([
      evidence({
        id: "article-a",
        evidenceClass: "MEDIA_SUMMARY",
        sourceRef: "news:a",
        lineageKey: "wire:original",
        supports: ["attributed_statement"],
      }),
      evidence({
        id: "article-b",
        evidenceClass: "MEDIA_SUMMARY",
        sourceRef: "news:b",
        lineageKey: "wire:original",
        supports: ["attributed_statement"],
      }),
      evidence({
        id: "transcript-c",
        evidenceClass: "SWORN_FIRSTHAND",
        sourceRef: "court:transcript-c",
        lineageKey: "court:transcript-c",
        supports: ["established_act"],
      }),
    ])).toBe(2);
  });

  it("creates a primary-source lead for secondary evidence with no underlying object", () => {
    expect(primarySourceLeads([
      evidence({
        evidenceClass: "MEDIA_SUMMARY",
        sourceRef: "news:summary",
        lineageKey: "news:summary",
        supports: ["attributed_statement"],
        underlyingSourceRef: null,
      }),
    ])).toEqual([
      "Locate the underlying primary source for news:summary before using it to promote a finding.",
    ]);
  });

  it("keeps a contradiction unresolved until evidence actually resolves it", () => {
    const result = evaluateInvestigationIntegrity(draft({
      unresolvedContradictionIds: ["contradiction-1"],
    }));

    expect(result.status).toBe("hold");
    expect(result.reasons).toContain("unresolved_contradictions_present");
  });

  it("does not ignore counterevidence that has not been explicitly tested", () => {
    const result = evaluateInvestigationIntegrity(draft({
      counterEvidenceRefs: ["counter-1"],
      falsificationAttempts: [{
        id: "break-other",
        hypothesis: "A different challenge.",
        result: "claim_survived",
        evidenceRefs: ["other-evidence"],
      }],
    }));

    expect(result.status).toBe("hold");
    expect(result.reasons).toContain(
      "counterevidence_requires_explicit_resolution",
    );
  });

  it("allows counterevidence to be carried through a survived falsification attempt", () => {
    const result = evaluateInvestigationIntegrity(draft({
      counterEvidenceRefs: ["counter-1"],
      falsificationAttempts: [{
        id: "break-counter-1",
        hypothesis: "Counterevidence defeats the claim.",
        result: "claim_survived",
        evidenceRefs: ["counter-1"],
      }],
    }));

    expect(result.status).toBe("promotable");
  });

  it("blocks promotion when an adversarial test defeats the current claim", () => {
    const result = evaluateInvestigationIntegrity(draft({
      falsificationAttempts: [{
        id: "break-failed",
        hypothesis: "Alternative explanation defeats the current claim.",
        result: "claim_failed",
        evidenceRefs: ["counter-failure"],
      }],
    }));

    expect(result.status).toBe("hold");
    expect(result.reasons).toContain("falsification_failed_claim");
  });

  it("keeps inconclusive falsification work unresolved", () => {
    const result = evaluateInvestigationIntegrity(draft({
      falsificationAttempts: [{
        id: "break-inconclusive",
        hypothesis: "Alternative explanation remains plausible.",
        result: "inconclusive",
        evidenceRefs: ["counter-open"],
      }],
    }));

    expect(result.status).toBe("hold");
    expect(result.reasons).toContain("falsification_inconclusive");
  });

  it("requires an attempt to break an established-act hypothesis before promotion", () => {
    const result = evaluateInvestigationIntegrity(draft({
      falsificationAttempts: [],
    }));

    expect(result.status).toBe("hold");
    expect(result.reasons).toContain("falsification_attempt_required");
  });

  it("does not convert not-found-in-scope into proven absence", () => {
    const result = evaluateInvestigationIntegrity(draft({
      assertionKind: "absence",
      claimText: "The record does not exist.",
      support: [evidence({
        supports: ["absence"],
      })],
      falsificationAttempts: [],
      negativeEvidence: {
        state: "NOT_FOUND_IN_SEARCHED_SCOPE",
        scope: "searched docket entries through page 10",
      },
    }));

    expect(result.status).toBe("hold");
    expect(result.reasons).toContain("absence_claim_not_proven");
  });

  it("permits an absence claim only with explicit proof of absence", () => {
    const result = evaluateInvestigationIntegrity(draft({
      assertionKind: "absence",
      claimText: "The registry certifies that no filing exists in the stated scope.",
      support: [evidence({
        supports: ["absence"],
      })],
      falsificationAttempts: [],
      negativeEvidence: {
        state: "PROVEN_ABSENT",
        scope: "official certified registry scope",
        proofRef: "registry:certificate-1",
      },
    }));

    expect(result.status).toBe("promotable");
  });

  it("promotes a primary-source finding only after contradiction and falsification gates pass", () => {
    const value = draft();

    expect(evaluateInvestigationIntegrity(value)).toEqual({
      status: "promotable",
      reasons: [],
      independentLineages: 1,
      primarySourceLeads: [],
    });
    expect(() => assertInvestigationFindingPromotable(value)).not.toThrow();
  });

  it("fails closed when only media summaries support an established act", () => {
    const result = evaluateInvestigationIntegrity(draft({
      support: [evidence({
        evidenceClass: "MEDIA_SUMMARY",
        sourceRef: "news:summary",
        lineageKey: "wire:one",
        supports: ["established_act"],
      })],
    }));

    expect(result.status).toBe("hold");
    expect(result.reasons).toContain(
      "established_act_requires_primary_direct_or_sworn_firsthand_support",
    );
    expect(result.reasons).toContain(
      "secondary_only_support_cannot_promote_direct_fact",
    );
  });
});
