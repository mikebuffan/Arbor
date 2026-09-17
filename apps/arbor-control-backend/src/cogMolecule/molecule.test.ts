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
      const next = structuredClone(packet);
      if (next.metadata.reopenedTarget) {
        next.unresolved = next.unresolved.filter((item) => item !== next.metadata.reopenedTarget);
        next.challenges = next.challenges.map((challenge) => ({ ...challenge, resolved: true }));
        next.metadata.repaired = true;
      }
      return { packet: next, reasons: [`${label} processed`] };
    },
  };

  return new CogMoleculeRuntime({
    cogs: [cog],
    validate: async () => ({ valid: true, reasons: [`${label} validated`] }),
    project: async (packet, reasons) => ({
      disposition: "assert",
      packet,
      ordered: [label, packet.metadata.repaired ? "corrected" : "original"],
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
      evidence: [{ id: "resolved-a", value: release.ordered, provenance: release.provenance, confidence: release.confidence }],
      provenance: release.provenance,
      metadata: { sourceProjection: release.ordered },
    }));

    const molecule = new MoleculeRuntime([{ id: "a", runtime: a }, { id: "b", runtime: b }], [arm]);
    const run = await molecule.run("a", basePacket("start"));
    expect(run.trace.map((entry) => entry.node)).toEqual(["a", "b"]);
    expect(run.computeSpent).toBeGreaterThan(0);
    expect(run.trace[1].result.packet.provenance).toContain("arm:a-to-b");
    expect(run.trace[1].result.packet.evidence[0].value).toEqual(["a", "original"]);
  });

  it("reopens only the targeted upstream relation when downstream challenges it", () => {
    const molecule = new MoleculeRuntime([], []);
    const upstream = basePacket("upstream");
    upstream.unresolved = ["unrelated-open-loop"];
    const challenge: CogChallenge = {
      id: "challenge-1", source: "downstream-b", target: "relationship:a->x",
      reason: "late evidence conflicts with projection", provenance: ["evidence:late-7"], resolved: false,
    };
    const reopened = molecule.reopen(upstream, challenge);
    expect(reopened.unresolved).toContain("relationship:a->x");
    expect(reopened.unresolved).toContain("unrelated-open-loop");
    expect(reopened.metadata.reopenedTarget).toBe("relationship:a->x");
    expect(reopened.challenges).toHaveLength(1);
  });

  it("routes a downstream challenge back to its upstream node and forwards the correction", async () => {
    const a = releasingRuntime("a");
    const b = releasingRuntime("b");
    const arm = createLinearArm("a-to-b", "a", "b", (release, destination) => ({
      ...basePacket("from-a"), destination,
      evidence: [{ id: "a-projection", value: release.ordered, provenance: release.provenance, confidence: 1 }],
      provenance: release.provenance,
      metadata: { sourceProjection: release.ordered },
    }));
    const molecule = new MoleculeRuntime([{ id: "a", runtime: a }, { id: "b", runtime: b }], [arm]);
    let challenged = false;
    const run = await molecule.run("a", basePacket("start"), {
      maxRepairs: 2,
      selectChallenge(node) {
        if (node !== "b" || challenged) return undefined;
        challenged = true;
        return {
          id: "late-conflict", source: "b", target: "a:relationship-x",
          reason: "late evidence conflicts", provenance: ["late-evidence"], resolved: false,
        };
      },
    });
    expect(run.repairs).toBe(1);
    expect(run.trace.map((entry) => entry.node)).toEqual(["a", "b", "a", "b"]);
    expect(run.trace[2].result.projection?.ordered).toEqual(["a", "corrected"]);
    expect(run.trace[3].result.packet.evidence[0].value).toEqual(["a", "corrected"]);
  });
});