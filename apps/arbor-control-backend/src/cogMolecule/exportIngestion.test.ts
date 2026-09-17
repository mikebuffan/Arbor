import { describe, expect, it } from "vitest";
import { exportRecordToCogPacket } from "./exportIngestion.js";

describe("structured export ingestion", () => {
  it("preserves facts, provenance, unresolved state, relationships, and contests without resolving them", () => {
    const packet = exportRecordToCogPacket({
      id: "export:1",
      facts: [
        { id: "fact:a", value: "A", source: "conversation:10", confidence: 0.95, unresolved: ["date-unknown"] },
        { id: "fact:b", value: "B", source: "conversation:11", confidence: 0.7 },
      ],
      relationships: [{ id: "rel:1", from: "A", to: "B", relation: "precedes", source: "conversation:12", confidence: 0.8, contestedBy: ["conversation:13"] }],
      unresolved: ["speaker-ambiguous"],
      provenance: ["export:file:001"],
      metadata: { schemaVersion: "test" },
    });
    expect(packet.evidence.map((e) => e.id)).toEqual(["fact:a", "fact:b", "relationship:rel:1"]);
    expect(packet.provenance).toEqual(expect.arrayContaining(["export:file:001", "conversation:10", "conversation:11", "conversation:12"]));
    expect(packet.unresolved).toEqual(expect.arrayContaining(["speaker-ambiguous", "date-unknown"]));
    expect(packet.challenges).toHaveLength(1);
    expect(packet.challenges[0]?.resolved).toBe(false);
    expect(packet.hypotheses[0]?.contradictions).toEqual(["conversation:13"]);
    expect(packet.metadata.sourceKind).toBe("structured-export");
  });

  it("does not invent certainty, provenance, or relationships for sparse records", () => {
    const packet = exportRecordToCogPacket({ id: "sparse" });
    expect(packet.evidence).toEqual([]);
    expect(packet.hypotheses).toEqual([]);
    expect(packet.challenges).toEqual([]);
    expect(packet.provenance).toEqual([]);
    expect(packet.unresolved).toEqual([]);
  });
});
