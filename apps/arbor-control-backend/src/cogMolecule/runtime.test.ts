import { describe, expect, it } from "vitest";
import { CogMoleculeRuntime } from "./runtime.js";
import type { Cog, CogPacket } from "./types.js";

const packet = (): CogPacket => ({
  id: "p1",
  evidence: [],
  hypotheses: [],
  unresolved: ["late evidence"],
  provenance: ["test"],
  friction: 1,
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
        const before = next.friction;
        next.friction = context.round >= 2 ? 0 : 0.5;
        return {
          packet: next,
          frictionDelta: next.friction - before,
          reasons: [context.round >= 2 ? "resolved" : "still live"],
        };
      },
    };

    const runtime = new CogMoleculeRuntime({
      cogs: [cog],
      convergenceEpsilon: 1,
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
    expect(result.rounds).toBeGreaterThanOrEqual(2);
  });

  it("does not confuse convergence with validity", async () => {
    const cog: Cog = {
      id: "stable-wrong",
      async process(current) {
        return {
          packet: { ...current, unresolved: [], friction: 0 },
          frictionDelta: 0,
          reasons: ["stable"],
        };
      },
    };

    const runtime = new CogMoleculeRuntime({
      cogs: [cog],
      maxRounds: 2,
      convergenceEpsilon: 1,
      validate: async () => ({ valid: false, reasons: ["constraint violated"] }),
      project: async () => { throw new Error("must_not_release"); },
    });

    const result = await runtime.run(packet());
    expect(result.disposition).toBe("abstain");
    expect(result.reasons).toContain("constraint violated");
  });

  it("seeks instead of asserting when validation identifies missing information", async () => {
    const cog: Cog = {
      id: "quiet",
      async process(current) {
        return {
          packet: { ...current, unresolved: [], friction: 0 },
          frictionDelta: 0,
          reasons: [],
        };
      },
    };

    const runtime = new CogMoleculeRuntime({
      cogs: [cog],
      convergenceEpsilon: 1,
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
  });
});