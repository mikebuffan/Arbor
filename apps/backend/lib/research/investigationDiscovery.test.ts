import { describe, expect, it } from "vitest";
import {
  discoverInvestigationLeads,
  discoveryLeadToPatternHopSeeds,
  type InvestigationObservation,
} from "./investigationDiscovery";

function obs(
  evidenceRef: string,
  lineageKey: string,
  documentFamily: string,
  occurredAt: string,
  entities: Array<{ id: string; label: string; kind: "person" | "company" | "address" | "other" }>,
  eventTags: string[] = [],
): InvestigationObservation {
  return {
    evidenceRef,
    lineageKey,
    documentFamily,
    occurredAt,
    entities,
    eventTags,
  };
}

describe("investigation discovery engine", () => {
  it("finds a bridge node across independent lineages and document families without calling it conduct", () => {
    const bridge = { id: "entity:bridge", label: "Bridge Entity", kind: "company" as const };
    const result = discoverInvestigationLeads({
      observations: [
        obs("e1", "lineage:a", "calendar", "2026-01-01T10:00:00Z", [bridge], ["meeting"]),
        obs("e2", "lineage:b", "property", "2026-01-02T10:00:00Z", [bridge], ["ownership"]),
        obs("e3", "lineage:c", "payment", "2026-01-03T10:00:00Z", [bridge], ["payment"]),
      ],
    });

    const lead = result.leads.find((item) => item.kind === "bridge_node");
    expect(lead).toMatchObject({
      entityIds: ["entity:bridge"],
      status: "hypothesis",
      confidenceCeiling: 0.49,
      independentLineages: ["lineage:a", "lineage:b", "lineage:c"],
    });
    expect(lead?.hypothesis).toContain("may be a bridge node");
    expect(lead?.rationale).toContain("lead, not evidence of conduct");
    expect(result.rules.associationIsNotConduct).toBe(true);
    expect(result.rules.leadIsNotFinding).toBe(true);
  });

  it("does not mistake repeated copies in one lineage for independent corroboration", () => {
    const recurring = { id: "entity:x", label: "Entity X", kind: "person" as const };
    const result = discoverInvestigationLeads({
      observations: [
        obs("e1", "wire:one", "news-a", "2026-01-01T10:00:00Z", [recurring]),
        obs("e2", "wire:one", "news-b", "2026-01-01T11:00:00Z", [recurring]),
        obs("e3", "wire:one", "news-c", "2026-01-01T12:00:00Z", [recurring]),
      ],
    });

    expect(result.observedLineageCount).toBe(1);
    expect(result.leads.filter((item) =>
      item.kind === "bridge_node" ||
      item.kind === "cross_family_recurrence" ||
      item.kind === "temporal_convergence"
    )).toEqual([]);
  });

  it("flags narrow temporal convergence but preserves alternative explanations", () => {
    const person = { id: "person:1", label: "Person One", kind: "person" as const };
    const result = discoverInvestigationLeads({
      observations: [
        obs("e1", "lineage:a", "calendar", "2026-02-10T10:00:00Z", [person]),
        obs("e2", "lineage:b", "travel", "2026-02-11T08:00:00Z", [person]),
      ],
    });

    const lead = result.leads.find((item) => item.kind === "temporal_convergence");
    expect(lead?.hypothesis).toContain("may reflect one underlying event");
    expect(lead?.rationale).toContain(
      "Temporal proximity alone does not establish coordination",
    );
    expect(lead?.falsifiers).toContain(
      "The overlap is routine recurring activity with no shared event.",
    );
  });

  it("generates expected-footprint gaps as search leads, never absence findings", () => {
    const result = discoverInvestigationLeads({
      observations: [
        obs(
          "e1",
          "lineage:a",
          "calendar",
          "2026-03-01T10:00:00Z",
          [{ id: "person:a", label: "Person A", kind: "person" }],
          ["scheduled"],
        ),
      ],
      expectations: [{
        hypothesisKey: "travel-event-a",
        description: "Person A traveled to the scheduled event",
        expectedDocumentFamilies: ["calendar", "travel", "payment"],
        expectedEventTags: ["scheduled", "arrival"],
        relatedEntityIds: ["person:a"],
      }],
    });

    const gap = result.leads.find((item) => item.kind === "expected_footprint_gap");
    expect(gap?.rationale).toContain(
      "Expected-but-not-yet-observed is a search lead, not proof of absence",
    );
    expect(gap?.predictedFootprints).toEqual(expect.arrayContaining([
      "Look for document family: travel",
      "Look for document family: payment",
      "Look for event tag: arrival",
    ]));
  });

  it("creates reverse-path tests for independently observed relationships", () => {
    const a = { id: "person:a", label: "Person A", kind: "person" as const };
    const b = { id: "company:b", label: "Company B", kind: "company" as const };
    const result = discoverInvestigationLeads({
      observations: [
        obs("e1", "lineage:a", "filing", "2026-04-01T10:00:00Z", [a, b]),
        obs("e2", "lineage:b", "property", "2026-04-10T10:00:00Z", [a, b]),
      ],
    });

    const reverse = result.leads.find((item) => item.kind === "reverse_path_check");
    expect(reverse?.hypothesis).toContain("survive a reverse search");
    expect(reverse?.predictedFootprints).toEqual(expect.arrayContaining([
      "Starting from Person A should independently recover Company B.",
      "Starting from Company B should independently recover Person A.",
    ]));
  });

  it("converts a discovery lead into bounded Pattern Hop searches that explicitly seek disconfirmation", () => {
    const entity = { id: "entity:bridge", label: "Bridge Entity", kind: "company" as const };
    const result = discoverInvestigationLeads({
      observations: [
        obs("e1", "lineage:a", "calendar", "2026-05-01T10:00:00Z", [entity]),
        obs("e2", "lineage:b", "payment", "2026-05-02T10:00:00Z", [entity]),
        obs("e3", "lineage:c", "property", "2026-05-03T10:00:00Z", [entity]),
      ],
    });
    const lead = result.leads.find((item) => item.kind === "bridge_node");
    expect(lead).toBeTruthy();

    const seeds = discoveryLeadToPatternHopSeeds(lead!);
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds[0]).toMatchObject({
      maxDepth: 2,
      maxHopsPerAttempt: 4,
    });
    expect(seeds[0].objective).toContain("counterevidence");
    expect(seeds[0].objective).toContain("The lead is not a finding");
  });
});
