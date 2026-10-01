import { describe, expect, it } from "vitest";
import {
  analyzeClaimGenealogy,
  type InvestigationClaimTransmission,
} from "./investigationClaimGenealogy";

function transmission(
  overrides: Partial<InvestigationClaimTransmission> = {},
): InvestigationClaimTransmission {
  return {
    id: "source-1",
    claimKey: "claim:a",
    sourceRef: "source:1",
    sourceKind: "primary_record",
    parentTransmissionIds: [],
    provenanceStatus: "known",
    ...overrides,
  };
}

describe("claim narrative genealogy", () => {
  it("shows that many repetitions descending from one root still represent one known origin", () => {
    const result = analyzeClaimGenealogy({
      claimKey: "claim:a",
      transmissions: [
        transmission(),
        transmission({
          id: "source-2",
          sourceRef: "news:2",
          sourceKind: "news",
          parentTransmissionIds: ["source-1"],
        }),
        transmission({
          id: "source-3",
          sourceRef: "podcast:3",
          sourceKind: "podcast",
          parentTransmissionIds: ["source-2"],
        }),
        transmission({
          id: "source-4",
          sourceRef: "book:4",
          sourceKind: "book",
          parentTransmissionIds: ["source-1"],
        }),
      ],
    });

    expect(result).toMatchObject({
      transmissions: 4,
      apparentRepetitionCount: 4,
      independentOriginCount: 1,
      status: "single_known_origin",
      rootTransmissionIds: ["source-1"],
    });
    expect(result.note).toContain("not independent corroboration");
  });

  it("distinguishes two known independent roots from syndication", () => {
    const result = analyzeClaimGenealogy({
      claimKey: "claim:a",
      transmissions: [
        transmission(),
        transmission({
          id: "source-independent",
          sourceRef: "testimony:independent",
          sourceKind: "sworn_testimony",
          parentTransmissionIds: [],
        }),
        transmission({
          id: "source-copy",
          sourceRef: "news:copy",
          sourceKind: "news",
          parentTransmissionIds: ["source-1"],
        }),
      ],
    });

    expect(result.status).toBe("multiple_known_origins");
    expect(result.independentOriginCount).toBe(2);
    expect(result.rootTransmissionIds).toEqual([
      "source-1",
      "source-independent",
    ]);
  });

  it("refuses to calculate independent origins when provenance is incomplete", () => {
    const result = analyzeClaimGenealogy({
      claimKey: "claim:a",
      transmissions: [
        transmission({
          provenanceStatus: "partial",
        }),
        transmission({
          id: "source-2",
          sourceRef: "news:2",
          sourceKind: "news",
          parentTransmissionIds: ["missing-parent"],
          provenanceStatus: "partial",
        }),
      ],
    });

    expect(result).toMatchObject({
      status: "provenance_incomplete",
      independentOriginCount: null,
      unresolvedParentRefs: ["missing-parent"],
    });
  });

  it("rejects a circular source story rather than pretending it has an origin", () => {
    expect(() => analyzeClaimGenealogy({
      claimKey: "claim:a",
      transmissions: [
        transmission({
          id: "source-1",
          parentTransmissionIds: ["source-2"],
        }),
        transmission({
          id: "source-2",
          sourceRef: "news:2",
          sourceKind: "news",
          parentTransmissionIds: ["source-1"],
        }),
      ],
    })).toThrow("claim_genealogy_cycle_detected");
  });

  it("rejects transmissions that quietly switch to a different claim", () => {
    expect(() => analyzeClaimGenealogy({
      claimKey: "claim:a",
      transmissions: [
        transmission(),
        transmission({
          id: "source-2",
          claimKey: "claim:b",
          sourceRef: "news:2",
          sourceKind: "news",
        }),
      ],
    })).toThrow("claim_genealogy_claim_mismatch");
  });
});
