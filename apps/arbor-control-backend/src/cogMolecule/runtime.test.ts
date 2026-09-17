import { describe, expect, it } from "vitest";
import { AdaptiveComputePolicy } from "./adaptiveCompute.js";
import { CogMoleculeRuntime } from "./runtime.js";
import type { Cog, CogPacket } from "./types.js";

const packet = (): CogPacket => ({
  id: "p1",
  evidence: [],
  hypotheses: [],
  unresolved: ["late evidence"],
  challenges: [],
  provenance: ["test"],
  friction: 999, // ignored: runtime owns friction
  circulation: 0,
  metadata: {},
});

describe("CogMoleculeRuntime", () => {
  it("keeps unresolved information live until later circulation resolves it", async () => {
    const cog: Cog = {
      id: "resolver",
      async process(current, context) {
        const next = structuredClone(current);
        if (context.round >= 2) next.unresolved = [];
        return { packet: next, reasons: [context.round >= 2 ? "resolved" : "still live"] };
      },
    };

    const runtime = new CogMoleculeRuntime({
      cogs: [cog],
      releaseFriction: 0.05,
      validate: async () => ({ valid: true, reasons: ["validated"] }),
      project: async (current, reasons) => ({
        disposition: "assert",
        packet: current,
        ordered: ["resolved"],
        provenance: current.provenance,
        confidence: 0.99,
        friction: current.friction,
        reasons,
      }),
    });

    const result = await runtime.run(packet());
    expect(result.disposition).toBe("assert");
    expect(result.packet.unresolved).toEqual([]);
    expect(result.rounds).toBeGreaterThanOrEqual(3);
    expect(result.computeSpent).toBe(result.rounds);
  });

  it("derives friction from unresolved state instead of trusting a cog supplied scalar", async () => {
    const cog: Cog = {
      id: "liar",
      async process(current) {
        return { packet: { ...current, friction: 0 }, reasons: ["claims zero friction"] };
      },
    };

    const runtime = new CogMoleculeRuntime({
      cogs: [cog],
      maxRounds: 2,
      validate: async () => ({ valid: true, reasons: [] }),
      project: async () => { throw new Error("must_not_release"); },
    });

    const result = await runtime.run(packet());
    expect(result.disposition).toBe("circulate");
    expect(result.packet.friction).toBeGreaterThan(0);
  });

  it("escalates compute when friction appears after processing begins", async () => {
    const cog: Cog = {
      id: "discover-conflict",
      async process(current, context) {
        const next = structuredClone(current);
        if (context.round === 1) {
          next.hypotheses = [{
            id: "h1",
            value: "candidate",
            confidence: 0,
            support: [],
            contradictions: ["c1", "c2", "c3", "c4", "c5"],
          }];
        }
        return { packet: next, reasons: ["processed"] };
      },
    };

    const initial = packet();
    initial.unresolved = [];
    const runtime = new CogMoleculeRuntime({
      cogs: [cog],
      maxRounds: 16,
      adaptiveCompute: new AdaptiveComputePolicy([
        { maxRounds: 2, frictionAtLeast: 0 },
        { maxRounds: 8, frictionAtLeast: 0.4 },
      ]),
      validate: async () => ({ valid: false, reasons: [] }),
      project: async () => { throw new Error("must_not_release"); },
    });

    const result = await runtime.run(initial);
    expect(result.rounds).toBe(8);
    expect(result.reasons.some((reason) => reason.startsWith("adaptive_compute_escalated:"))).toBe(true);
  });

  it("does not confuse convergence with validity and reopens a concrete challenge", async () => {
    const cog: Cog = {
      id: "stable-wrong",
      async process(current) {
        return { packet: { ...current, unresolved: [] }, reasons: ["stable"] };
      },
    };

    const runtime = new CogMoleculeRuntime({
      cogs: [cog],
      maxRounds: 3,
      validate: async () => ({ valid: false, reasons: ["constraint violated"] }),
      project: async () => { throw new Error("must_not_release"); },
    });

    const result = await runtime.run(packet());
    expect(result.disposition).toBe("circulate");
    expect(result.reasons).toContain("constraint violated");
    expect(result.packet.challenges.some((challenge) => !challenge.resolved)).toBe(true);
    expect(result.packet.friction).toBeGreaterThan(0);
  });

  it("seeks instead of asserting when validation identifies missing information", async () => {
    const cog: Cog = {
      id: "quiet",
      async process(current) {
        return { packet: { ...current, unresolved: [] }, reasons: [] };
      },
    };

    const runtime = new CogMoleculeRuntime({
      cogs: [cog],
      validate: async () => ({
        valid: false,
        reasons: ["external evidence required"],
        seek: ["source document"],
      }),
      project: async () => { throw new Error("must_not_release"); },
    });

    const result = await runtime.run(packet());
    expect(result.disposition).toBe("seek_more_information");
    expect(result.packet.unresolved).toContain("source document");
    expect(result.packet.friction).toBeGreaterThan(0);
  });
});
