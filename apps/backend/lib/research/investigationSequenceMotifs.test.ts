import { describe, expect, it } from "vitest";
import { discoverSequenceMotifs } from "./investigationSequenceMotifs";

function event(
  entityId: string,
  occurredAt: string,
  eventTag: string,
  evidenceRef: string,
  lineageKey: string,
) {
  return {
    entityId,
    occurredAt,
    eventTag,
    evidenceRef,
    lineageKey,
  };
}

describe("cross-entity sequence motifs", () => {
  it("finds a repeated event sequence across independent entities and lineages without calling it a shared scheme", () => {
    const events = [
      event("entity:a", "2026-01-01T00:00:00Z", "scheduled", "a1", "la1"),
      event("entity:a", "2026-01-02T00:00:00Z", "travel", "a2", "la2"),
      event("entity:a", "2026-01-03T00:00:00Z", "payment", "a3", "la3"),

      event("entity:b", "2026-02-01T00:00:00Z", "scheduled", "b1", "lb1"),
      event("entity:b", "2026-02-02T00:00:00Z", "travel", "b2", "lb2"),
      event("entity:b", "2026-02-03T00:00:00Z", "payment", "b3", "lb3"),

      event("entity:c", "2026-03-01T00:00:00Z", "scheduled", "c1", "lc1"),
      event("entity:c", "2026-03-02T00:00:00Z", "travel", "c2", "lc2"),
      event("entity:c", "2026-03-03T00:00:00Z", "payment", "c3", "lc3"),
    ];

    const motifs = discoverSequenceMotifs({
      events,
      minEntities: 3,
      minIndependentLineages: 3,
      minLength: 3,
      maxLength: 3,
    });

    expect(motifs).toHaveLength(1);
    expect(motifs[0]).toMatchObject({
      motifKey: "scheduled>travel>payment",
      eventTags: ["scheduled", "travel", "payment"],
      occurrenceCount: 3,
      status: "sequence_motif_hypothesis",
    });
    expect(motifs[0].note).toContain("not proof of a shared scheme");
  });

  it("does not elevate a sequence repeated only inside one entity", () => {
    const motifs = discoverSequenceMotifs({
      events: [
        event("entity:a", "2026-01-01T00:00:00Z", "scheduled", "a1", "l1"),
        event("entity:a", "2026-01-02T00:00:00Z", "travel", "a2", "l2"),
        event("entity:a", "2026-01-03T00:00:00Z", "payment", "a3", "l3"),
      ],
      minEntities: 2,
      minIndependentLineages: 2,
    });

    expect(motifs).toEqual([]);
  });

  it("does not count copied records from one lineage as enough independence", () => {
    const motifs = discoverSequenceMotifs({
      events: [
        event("entity:a", "2026-01-01T00:00:00Z", "scheduled", "a1", "shared"),
        event("entity:a", "2026-01-02T00:00:00Z", "travel", "a2", "shared"),
        event("entity:b", "2026-02-01T00:00:00Z", "scheduled", "b1", "shared"),
        event("entity:b", "2026-02-02T00:00:00Z", "travel", "b2", "shared"),
        event("entity:c", "2026-03-01T00:00:00Z", "scheduled", "c1", "shared"),
        event("entity:c", "2026-03-02T00:00:00Z", "travel", "c2", "shared"),
      ],
      minEntities: 3,
      minIndependentLineages: 2,
      minLength: 2,
      maxLength: 2,
    });

    expect(motifs).toEqual([]);
  });

  it("preserves primary-record references for every qualifying motif", () => {
    const motifs = discoverSequenceMotifs({
      events: [
        event("entity:a", "2026-01-01T00:00:00Z", "x", "a1", "la1"),
        event("entity:a", "2026-01-02T00:00:00Z", "y", "a2", "la2"),
        event("entity:b", "2026-02-01T00:00:00Z", "x", "b1", "lb1"),
        event("entity:b", "2026-02-02T00:00:00Z", "y", "b2", "lb2"),
      ],
      minEntities: 2,
      minIndependentLineages: 2,
      minLength: 2,
      maxLength: 2,
    });

    expect(motifs[0].evidenceRefs).toEqual(["a1", "a2", "b1", "b2"]);
  });

  it("orders events chronologically within each entity before extracting motifs", () => {
    const motifs = discoverSequenceMotifs({
      events: [
        event("entity:a", "2026-01-02T00:00:00Z", "travel", "a2", "la2"),
        event("entity:a", "2026-01-01T00:00:00Z", "scheduled", "a1", "la1"),
        event("entity:b", "2026-02-02T00:00:00Z", "travel", "b2", "lb2"),
        event("entity:b", "2026-02-01T00:00:00Z", "scheduled", "b1", "lb1"),
      ],
      minEntities: 2,
      minIndependentLineages: 2,
      minLength: 2,
      maxLength: 2,
    });

    expect(motifs[0].motifKey).toBe("scheduled>travel");
  });
});
