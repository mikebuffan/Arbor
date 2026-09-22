import { describe, expect, it } from "vitest";
import type { ArborAuditEvent, ArborAuditSink } from "../audit.js";
import type { ArborState } from "../types.js";
import { auditMoleculeRun } from "./auditAdapter.js";
import { applyMoleculeResultToCarrier, carrierStateToPacket } from "./carrierAdapter.js";
import type { MoleculeRunResult } from "./molecule.js";
import type { MoleculeResult } from "./types.js";

function state(): ArborState {
  return {
    activeSubsystem: "arbor",
    goal: "finish molecule runtime",
    unresolvedWork: ["attach memory", "verify CI"],
    strategyNotes: ["preserve local repair"],
    behavioralCorrections: ["do not erase identity"],
    acousticCorrections: [],
    voiceId: "default",
    selfModel: {
      version: "v1",
      checksum: "abc",
      sourceDigest: "source",
      sourceQuestionCount: 1,
      promotedPatternIds: ["p1"],
      initializedAt: "2026-01-01T00:00:00.000Z",
      verifiedAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

function result(unresolved: string[], disposition: MoleculeResult["disposition"] = "circulate"): MoleculeResult {
  return {
    disposition,
    packet: {
      id: "p",
      evidence: [],
      hypotheses: [],
      unresolved,
      challenges: [],
      provenance: [],
      friction: 0,
      circulation: 1,
      metadata: {},
    },
    rounds: 1,
    reasons: [],
    computeSpent: 1,
  };
}

describe("carrier and audit adapters", () => {
  it("injects active work without flattening identity into mutable packet state", () => {
    const original = state();
    const packet = carrierStateToPacket(original, "carrier-test");
    expect(packet.unresolved).toContain("goal:finish molecule runtime");
    expect(packet.unresolved).toContain("open:attach memory");
    expect(packet.metadata.selfModelVersion).toBe("v1");
    expect(packet.evidence.some((item) => item.id === "carrier:corrections")).toBe(true);
  });

  it("updates active work while preserving host-owned self model and corrections", () => {
    const original = state();
    const next = applyMoleculeResultToCarrier(original, result(["goal:finish molecule runtime", "open:verify CI"]));
    expect(next.unresolvedWork).toEqual(["verify CI"]);
    expect(next.selfModel).toEqual(original.selfModel);
    expect(next.behavioralCorrections).toEqual(original.behavioralCorrections);
  });

  it("records node and completion events through the existing audit sink", async () => {
    const events: Array<Omit<ArborAuditEvent, "id" | "at">> = [];
    const sink: ArborAuditSink = {
      async record(event) { events.push(event); },
      async recent() { return []; },
    };
    const nodeResult = result([]);
    const run: MoleculeRunResult = {
      result: nodeResult,
      trace: [{ node: "reasoning", result: nodeResult, kind: "forward" }],
      computeSpent: 1,
      repairs: 0,
    };
    await auditMoleculeRun({ sink, turnId: "turn-1", run });
    expect(events.map((event) => event.event)).toEqual(["cog_molecule_node", "cog_molecule_complete"]);
  });
});