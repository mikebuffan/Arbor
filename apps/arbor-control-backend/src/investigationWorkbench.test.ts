import { describe, expect, it } from "vitest";

import type {
  CoverageEntry,
  EntityCandidate,
  EvidenceGraph,
  EvidencePacket,
  Hypothesis,
  SourceRecord,
} from "./investigationTypes.js";
import {
  addEvidencePacket,
  chooseInvestigationRoute,
  classifySourceFamilies,
  createFindingSnapshot,
  emptyEvidenceGraph,
  evidenceReviewFlags,
  exportFindingPacket,
  independentSourceCount,
  negativeEvidenceConclusion,
  resolveEntity,
  reviewHighStakesTransformation,
  roundTripEvidencePacket,
  supersedeFinding,
  traceClaimEvidence,
  updateHypothesis,
} from "./investigationWorkbench.js";

function packet(overrides: Partial<EvidencePacket> = {}): EvidencePacket {
  return {
    schemaVersion: "1.0",
    evidenceId: "ev-1",
    documentId: "doc-1",
    locator: {
      documentId: "doc-1",
      page: 12,
      nativeLocator: "EFTA00000001.pdf#page=12",
    },
    provenance: {
      sourceId: "source-1",
      sourceFamilyId: "family-1",
      originalSource: "official record",
      acquisitionMethod: "public disclosure",
      acquiredAt: "2026-09-17T00:00:00Z",
      contentHash: "hash-a",
      fileFamilyHash: "file-family-a",
      originId: "origin-a",
    },
    dates: {
      documentDate: "2005-01-01",
      eventDate: "2004-12-20",
      publicationDate: "2026-01-30",
      ingestionDate: "2026-09-17T00:00:00Z",
    },
    atomicClaim: "A scheduler recorded an appointment.",
    kind: "fact",
    confidence: 0.98,
    entities: [],
    counterevidence: [],
    sourceIndependence: "independent",
    context: "appointment log",
    hopHistory: [
      {
        at: "2026-09-17T00:00:00Z",
        reason: "appointment chain",
        triggeringEvidenceIds: [],
      },
    ],
    activeObjective: "reconstruct appointment workflow",
    ...overrides,
  };
}

describe("Epstein investigation evidence packet", () => {
  it("survives a serialize-route-deserialize round trip without semantic loss", () => {
    expect(roundTripEvidencePacket(packet())).toEqual(packet());
  });

  it("rejects locator/document drift", () => {
    expect(() =>
      roundTripEvidencePacket(
        packet({
          locator: { documentId: "different-doc", page: 12 },
        }),
      )
    ).toThrow("evidence_locator_document_mismatch");
  });
});

describe("source independence torture cases", () => {
  it("treats ten copies of one source as one non-independent family", () => {
    const sources: SourceRecord[] = Array.from(
      { length: 10 },
      (_, index) => ({
        sourceId: `copy-${index}`,
        sourceFamilyId: "one-family",
        contentHash: "same-hash",
        originId: "same-origin",
      }),
    );

    const families = classifySourceFamilies(sources);
    expect(families).toHaveLength(1);
    expect(families[0]?.status).toBe("duplicate");
    expect(independentSourceCount(sources)).toBe(0);
  });

  it("does not inflate shared-origin reporting into corroboration", () => {
    const sources: SourceRecord[] = [
      {
        sourceId: "article-a",
        sourceFamilyId: "wire-story",
        contentHash: "a",
        originId: "wire-1",
      },
      {
        sourceId: "article-b",
        sourceFamilyId: "wire-story",
        contentHash: "b",
        originId: "wire-1",
      },
    ];

    expect(classifySourceFamilies(sources)[0]?.status).toBe("shared_origin");
  });

  it("recognizes genuinely independent source families", () => {
    const sources: SourceRecord[] = [
      {
        sourceId: "official-record",
        sourceFamilyId: "court",
        contentHash: "a",
        originId: "court",
      },
      {
        sourceId: "firsthand-testimony",
        sourceFamilyId: "witness",
        contentHash: "b",
        originId: "witness",
      },
    ];

    expect(independentSourceCount(sources)).toBe(2);
  });
});

describe("entity resolution torture cases", () => {
  it("keeps same-name people separate when identity evidence is insufficient", () => {
    const candidates: EntityCandidate[] = [
      {
        entityId: "person-a",
        canonicalName: "Alex Smith",
        aliases: [],
        temporalCompatibility: "compatible",
        geographicCompatibility: "compatible",
        contradictoryEvidenceIds: [],
        confidence: 0.8,
      },
      {
        entityId: "person-b",
        canonicalName: "Alex Smith",
        aliases: [],
        temporalCompatibility: "compatible",
        geographicCompatibility: "compatible",
        contradictoryEvidenceIds: [],
        confidence: 0.81,
      },
    ];

    expect(resolveEntity("Alex Smith", candidates).status).toBe("ambiguous");
  });

  it("resolves an alias only when compatibility and confidence support it", () => {
    const candidates: EntityCandidate[] = [
      {
        entityId: "person-a",
        canonicalName: "Alexandra Smith",
        aliases: ["A. Smith"],
        temporalCompatibility: "compatible",
        geographicCompatibility: "compatible",
        contradictoryEvidenceIds: [],
        confidence: 0.97,
      },
    ];

    expect(resolveEntity("A. Smith", candidates)).toMatchObject({
      entityId: "person-a",
      status: "confirmed",
    });
  });

  it("does not force a merge through contradictory identity evidence", () => {
    const candidates: EntityCandidate[] = [
      {
        entityId: "person-a",
        canonicalName: "A. Smith",
        aliases: [],
        temporalCompatibility: "compatible",
        geographicCompatibility: "compatible",
        contradictoryEvidenceIds: ["ev-contradiction"],
        confidence: 0.99,
      },
    ];

    expect(resolveEntity("A. Smith", candidates).status).toBe("unresolved");
  });
});

describe("atomic evidence graph", () => {
  it("walks every material claim back to exact evidence and locator", () => {
    const graph: EvidenceGraph = {
      ...emptyEvidenceGraph(),
      claims: {
        "claim-1": {
          claimId: "claim-1",
          text: "An appointment was recorded.",
          kind: "fact",
        },
      },
    };

    const next = addEvidencePacket(graph, "claim-1", packet());

    expect(traceClaimEvidence(next, "claim-1")[0]?.locator).toEqual(
      packet().locator,
    );
  });
});

describe("coverage, negative evidence, and hypotheses", () => {
  it("never turns a scoped search miss into proof an event did not happen", () => {
    const coverage: CoverageEntry = {
      scopeId: "phone-book-jan",
      description: "January phone book",
      status: "searched",
      sourceFamiliesChecked: ["phone-book"],
      notFound: ["specific message"],
    };

    expect(negativeEvidenceConclusion(coverage)).toBe(
      "not_found_in_searched_scope",
    );
  });

  it("keeps a favored hypothesis separate from fact and tracks disconfirmation", () => {
    const hypothesis: Hypothesis = {
      hypothesisId: "h-1",
      statement: "A recurring appointment pattern existed.",
      status: "open",
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
      missingEvidence: ["calendar match"],
      alternativeExplanations: ["scheduler batching"],
      predictions: ["matching calendar entries"],
      disconfirmingSearches: [],
    };

    const next = updateHypothesis(hypothesis, {
      contradictingEvidenceIds: ["ev-no-calendar"],
      disconfirmingSearches: ["calendar search complete"],
    });

    expect(next.status).toBe("weakened");
    expect(next.statement).toBe(hypothesis.statement);
  });
});

describe("immutable findings and high-stakes gates", () => {
  it("supersedes rather than overwriting an earlier finding", () => {
    const first = createFindingSnapshot({
      findingId: "finding-1",
      statement: "Initial statement",
      evidenceIds: ["ev-1"],
      counterevidenceIds: [],
      entityState: "confirmed",
      confidence: 0.7,
      uncertainty: ["date range"],
    });

    const history = supersedeFinding([first], first, {
      findingId: "finding-1",
      statement: "Corrected statement",
      evidenceIds: ["ev-1", "ev-2"],
      counterevidenceIds: [],
      entityState: "confirmed",
      confidence: 0.85,
      uncertainty: [],
    });

    expect(history.map((item) => item.status)).toEqual([
      "superseded",
      "current",
    ]);
    expect(history[0]?.statement).toBe("Initial statement");
    expect(history[1]?.supersedesVersion).toBe(1);
  });

  it("blocks association from silently becoming conduct", () => {
    expect(
      reviewHighStakesTransformation("association_to_conduct", {
        directConductEvidence: false,
      }).allowed,
    ).toBe(false);
  });

  it("blocks allegation from silently becoming fact", () => {
    expect(
      reviewHighStakesTransformation("allegation_to_fact", {
        kind: "allegation",
      }).allowed,
    ).toBe(false);
  });

  it("blocks ambiguous identity from silently becoming confirmed", () => {
    expect(
      reviewHighStakesTransformation("ambiguous_to_confirmed_identity", {
        entityStatus: "ambiguous",
      }).allowed,
    ).toBe(false);
  });

  it("blocks repeated/shared-origin reporting from becoming corroboration", () => {
    expect(
      reviewHighStakesTransformation(
        "repetition_to_independent_corroboration",
        { sourceIndependence: "shared_origin" },
      ).allowed,
    ).toBe(false);
  });
});

describe("investigation routing and export", () => {
  it("routes unresolved identity before downstream findings", () => {
    const route = chooseInvestigationRoute({
      packets: [
        packet({
          entities: [
            {
              observedName: "A. Smith",
              status: "ambiguous",
              confidence: 0,
            },
          ],
        }),
      ],
      coverage: [],
      hypotheses: [],
    });

    expect(route.next).toBe("resolve_identity");
  });

  it("exports a finding with its full evidence packet and provenance", () => {
    const graph: EvidenceGraph = {
      ...emptyEvidenceGraph(),
      claims: {},
      evidence: { "ev-1": packet() },
    };

    const finding = createFindingSnapshot({
      findingId: "finding-1",
      statement: "An appointment was recorded.",
      evidenceIds: ["ev-1"],
      counterevidenceIds: [],
      entityState: "confirmed",
      confidence: 0.98,
      uncertainty: [],
    });

    const exported = JSON.parse(exportFindingPacket({ finding, graph }));

    expect(exported.evidence[0].provenance.originalSource).toBe(
      "official record",
    );
    expect(exported.evidence[0].locator.page).toBe(12);
  });

describe("extraction, partial-document, and copy-chain torture cases", () => {
  it("flags low-confidence OCR rather than silently trusting extracted text", () => {
    const reviewed = packet({
      extractionQuality: {
        method: "ocr",
        confidence: 0.61,
        warnings: ["uncertain surname on line 8"],
      },
    });

    expect(evidenceReviewFlags(reviewed)).toEqual(
      expect.arrayContaining([
        "low_extraction_confidence",
        "extraction_warning",
      ]),
    );
  });

  it("flags partial documents so missing pages cannot disappear from context", () => {
    const reviewed = packet({
      documentCompleteness: {
        status: "partial",
        missingRanges: ["13-15"],
        note: "release skips pages in the middle of the file",
      },
    });

    expect(evidenceReviewFlags(reviewed)).toContain("partial_document");
  });

  it("keeps a derived/hearsay copy chain non-independent", () => {
    const sources: SourceRecord[] = [
      {
        sourceId: "original-statement",
        sourceFamilyId: "statement-family",
        contentHash: "source-hash",
        originId: "statement-origin",
      },
      {
        sourceId: "summary-of-statement",
        sourceFamilyId: "summary-family",
        contentHash: "summary-hash",
        originId: "summary-origin",
        derivedFromSourceIds: ["original-statement"],
      },
    ];

    const families = classifySourceFamilies(sources);
    const derived = families.find(
      (family) => family.members.includes("summary-of-statement"),
    );

    expect(derived?.status).toBe("derived");
    expect(derived?.independentWeight).toBe(0);
  });

  it("preserves conflicting testimony as counterevidence instead of resolving it by preference", () => {
    const reviewed = packet({
      counterevidence: [
        {
          evidenceId: "ev-conflicting-testimony",
          relation: "contradicts",
          note: "witness gives a materially different date",
        },
      ],
    });

    expect(evidenceReviewFlags(reviewed)).toContain(
      "counterevidence_present",
    );

    const route = chooseInvestigationRoute({
      packets: [reviewed],
      coverage: [],
      hypotheses: [],
    });

    expect(route.next).toBe("resolve_contradiction");
  });
});

});
