import { describe, expect, it } from "vitest";
import { assertEvidencePacket, roundTripEvidencePacket, sha256, type EvidencePacket } from "./epsteinEvidence.js";

const packet = (): EvidencePacket => ({
  evidenceId: "ev-1", documentId: "doc-1", sourceUri: "court://docket/exhibit-1",
  acquiredAt: "2026-09-17T00:00:00Z", contentHash: sha256("original bytes"),
  fileFamilyId: "fam-1", originId: "origin-1", locator: { documentId: "doc-1", page: 12, lineStart: 3, lineEnd: 8 },
  documentDate: "2003-01-02", eventDate: "2002-12-20", publicationDate: "2026-01-01", ingestionDate: "2026-09-17T00:01:00Z",
  claim: { text: "Atomic proposition.", classification: "allegation" }, confidence: .72,
  entityResolution: { state: "ambiguous", entityIds: ["person-a", "person-b"] },
  contradiction: { state: "conflicting", evidenceIds: ["ev-2"] },
  sourceIndependence: { state: "unknown", familyIds: ["fam-1"] }, relation: "association-only",
  context: { note: "preserve context" }, causalContext: ["cause-1"], validFrom: "2002-12-20",
  hopHistory: [{ reason: "contradiction search", at: "2026-09-17T00:02:00Z", sourceId: "doc-1" }],
  activeObjective: "Epstein evidence workbench"
});

describe("Epstein evidence packet boundary", () => {
  it("survives serialization without semantic field loss", () => {
    expect(roundTripEvidencePacket(packet())).toEqual(packet());
  });
  it("rejects missing provenance/locator and invalid confidence", () => {
    expect(() => assertEvidencePacket({ ...packet(), sourceUri: "" })).toThrow();
    expect(() => assertEvidencePacket({ ...packet(), locator: { documentId: "wrong" } })).toThrow();
    expect(() => assertEvidencePacket({ ...packet(), confidence: 2 })).toThrow();
  });
  it("keeps association distinct from conduct and allegation distinct from fact", () => {
    const p = roundTripEvidencePacket(packet());
    expect(p.relation).toBe("association-only");
    expect(p.claim.classification).toBe("allegation");
  });
});
