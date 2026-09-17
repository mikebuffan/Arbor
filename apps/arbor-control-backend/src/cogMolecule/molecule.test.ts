import { describe, expect, it } from "vitest";
import { createLinearArm, MoleculeRuntime } from "./molecule.js";
import { CogMoleculeRuntime } from "./runtime.js";
import type { Cog, CogChallenge, CogPacket } from "./types.js";

function basePacket(id: string): CogPacket {
  return {
    id,
    evidence: [],
    hypotheses: [],
    unresolved: [],
    challenges: [],
    provenance: [`packet:${id}`],
    friction: 0,
    circulation: 0,
    metadata: {},
  };
}

function releasingRuntime(label: string): CogMoleculeRuntime {
  const cog: Cog = {
    id: `${label}-cog`,
    async process(packet) {
      return { packet, reasons: [`${label} processed`] };
    },
  };

  return new CogMoleculeRuntime({
    cogs: [cog],
    validate: async () => ({ valid: true, reasons: [`${label} validated`] }),
    project: async (packet, reasons) => ({
      disposition: "assert",
      packet,
      ordered: [label],
      provenance: [...packet.provenance, `release:${label}`],
      confidence: 1,
      friction: packet.friction,
      reasons,
    }),
  });
}

describe("MoleculeRuntime", () => {
  it("moves a validated projection across a destination-specific linear arm", async () => {
    const a = releasingRuntime("a");
    const b = releasingRuntime("b");
    const arm = createLinearArm("a-to-b", "a", "b", (release, destination) => ({
      ...basePacket("from-a"),
      destination,
      evidence: [{
        id: "resolved-a",
        value: release.ordered,
        provenance: release.provenance,
        confidence: release.confidence,
      }],
      provenance: release.provenance,
      metadata: { sourceProjection: release.ordered },
    }));

    const molecule = new MoleculeRuntime(
      [{ id: "a", runtime: a }, { id: "b", runtime: b }],
      [arm],
    );

    const run = await molecule.run("a", basePacket("start"));
    expect(run.trace.map((entry) => entry.node)).toEqual(["a", "b"]);
    expect(run.computeSpent).toBeGreaterThan(0);
    expect(run.trace[1].result.packet.provenance).toContain("arm:a-to-b");
    expect(run.trace[1].result.packet.evidence[0].value).toEqual(["a"]);
  });

  it("reopens only the targeted upstream relation when downstream challenges it", () => {
    const molecule = new MoleculeRuntime([], []);
    const upstream = basePacket("upstream");
    upstream.unresolved = ["unrelated-open-loop"];

    const challenge: CogChallenge = {
      id: "challenge-1",
      source: "downstream-b",
      target: "relationship:a->x",
      reason: "late evidence conflicts with projection",
      provenance: ["evidence:late-7"],
      resolved: false,
    };

    const reopened = molecule.reopen(upstream, challenge);
    expect(reopened.unresolved).toContain("relationship:a->x");
    expect(reopened.unresolved).toContain("unrelated-open-loop");
    expect(reopened.metadata.reopenedTarget).toBe("relationship:a->x");
    expect(reopened.challenges).toHaveLength(1);
  });
});