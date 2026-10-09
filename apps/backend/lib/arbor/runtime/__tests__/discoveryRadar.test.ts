import { describe, expect, it } from "vitest";
import {
  projectDiscoveryRadar,
  type DiscoveryMetadata,
} from "../discoveryRadar";

const scope = { userId: "owner", projectId: "arbor" };
const item = (
  id: string,
  overrides: Partial<DiscoveryMetadata> = {},
): DiscoveryMetadata => ({
  ...scope, sourceFamilyId: "family-" + id,
  retrievalScore: 0.96, retrievalMethod: "fixture-only",
  evidence: {
    id, source: "fixture-source-" + id,
    evidenceType: "project-metadata",
    content: "Correction continuity runtime acceptance evidence",
    confidence: 0.96, epistemicStatus: "direct",
  },
  ...overrides,
});
const input = (candidates: DiscoveryMetadata[], overrides: Record<string, unknown> = {}) => ({
  scope, seed: item("seed"), candidates,
  authorizedProjectIds: ["arbor"],
  ...overrides,
});

describe("read-only discovery candidate routing", () => {
  it("reuses Pattern Hop and returns proposals, not verified findings or execution grants", () => {
    const out = projectDiscoveryRadar(input([item("candidate", {
      evidence: {
        ...item("candidate").evidence,
        content: "Correction continuity runtime implementation needs verification",
      },
    })]));
    expect(out.suggestions).toHaveLength(1);
    expect(out.suggestions[0]).toMatchObject({
      evidenceId: "candidate", epistemicStatus: "direct",
      corroborationVerified: false,
    });
    expect(out.suggestions[0].suggestedRoads).toContain("evidence_world_model");
    expect(out.grantsExecution).toBe(false);
    expect(out.createsTasks).toBe(false);
    expect(out.permissionVerifiedHere).toBe(false);
    expect(out.discoveryVerifiedHere).toBe(false);
  });

  it("keeps unsupported foreign projects unavailable even if the metadata is supplied", () => {
    const foreign = item("foreign", { projectId: "research" });
    expect(() => projectDiscoveryRadar(input([foreign])))
      .toThrow("discovery_radar_access_denied");
    expect(() => projectDiscoveryRadar(input([foreign], {
      authorizedProjectIds: ["arbor", "research"],
    }))).toThrow("discovery_radar_access_denied");
  });

  it("requires explicit caller-selected cross-project mode and an allowed owner/project", () => {
    const foreign = item("other", { projectId: "grove" });
    const out = projectDiscoveryRadar(input([foreign], {
      authorizedProjectIds: ["arbor", "grove"],
      crossProjectEnabled: true,
    }));
    expect(out.hasCrossProjectSuggestions).toBe(true);
    expect(out.suggestions[0].projectId).toBe("grove");
    expect(out.permissionVerifiedHere).toBe(false);
  });

  it("rejects foreign-owner metadata even if the project is on the allowlist", () => {
    const foreign = item("other", { userId: "someone-else", projectId: "grove" });
    expect(() => projectDiscoveryRadar(input([foreign], {
      authorizedProjectIds: ["arbor", "grove"], crossProjectEnabled: true,
    }))).toThrow("discovery_radar_invalid_metadata");
  });

  it("does not treat two snippets from one source family as independent corroboration", () => {
    const out = projectDiscoveryRadar(input([
      item("one", { sourceFamilyId: "shared-family", retrievalScore: 0.95 }),
      item("two", { sourceFamilyId: "shared-family", retrievalScore: 0.92 }),
    ]));
    expect(out.repeatedFamilyCount).toBe(1);
    expect(out.suggestions).toHaveLength(1);
    expect(out.suggestions[0].corroborationVerified).toBe(false);
  });

  it("stops revisiting evidence and holds low-scored suggestions rather than inventing connections", () => {
    const low = item("low", {
      retrievalScore: 0,
      evidence: { ...item("low").evidence, content: "unrelated", confidence: 0,
        epistemicStatus: "hypothesis" },
    });
    const view = projectDiscoveryRadar(input([low, item("visited")], {
      visitedEvidenceIds: ["visited"],
    }));
    expect(view.suggestions).toHaveLength(0);
  });

  it("refuses duplicates, unsafely large metadata, and invalid project grants", () => {
    expect(() => projectDiscoveryRadar(input([item("same"), item("same")])))
      .toThrow("discovery_radar_duplicate_evidence");
    expect(() => projectDiscoveryRadar(input([item("long", {
      evidence: { ...item("long").evidence, content: "x".repeat(501) },
    })]))).toThrow("discovery_radar_invalid_metadata");
    expect(() => projectDiscoveryRadar(input([item("ok")], {
      authorizedProjectIds: [],
    }))).toThrow("discovery_radar_access_denied");
    expect(() => projectDiscoveryRadar(input(Array.from({ length: 33 }, (_, index) =>
      item(String(index)))))).toThrow("discovery_radar_invalid_input");
  });

  it("keeps ranking bounded and deterministic without new records", () => {
    const many = Array.from({ length: 10 }, (_, index) => item("id-" + index));
    const result = projectDiscoveryRadar(input(many, { maxSuggestions: 2 }));
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions.every(s => s.corroborationVerified === false)).toBe(true);
    expect(() => projectDiscoveryRadar(input(many, { maxSuggestions: 30 })))
      .toThrow("discovery_radar_invalid_limit");
  });

  it("rejects truthy non-boolean cross-project flags instead of enabling foreign suggestions", () => {
    const foreign = item("other", { projectId: "grove" });
    for (const flag of ["false", "true", 1, {}, [], null]) {
      expect(() => projectDiscoveryRadar(input([foreign], {
        authorizedProjectIds: ["arbor", "grove"], crossProjectEnabled: flag,
      }) as Parameters<typeof projectDiscoveryRadar>[0]))
        .toThrow("discovery_radar_invalid_input");
    }
  });

  it("rejects malformed and duplicate project IDs before forming the authorized set", () => {
    for (const ids of [["arbor", null], ["arbor", " "], ["arbor", 12], ["arbor", "x".repeat(201)], ["arbor", "arbor"]]) {
      expect(() => projectDiscoveryRadar(input([], { authorizedProjectIds: ids }) as Parameters<typeof projectDiscoveryRadar>[0]))
        .toThrow("discovery_radar_invalid_input");
    }
  });
});
