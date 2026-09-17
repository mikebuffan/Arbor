import { describe, expect, it } from "vitest";
import type { ArborAuditSink } from "../audit.js";
import type { ArborBackendBridge } from "../backendBridge.js";
import { ArborCapabilityRegistry } from "../capabilities.js";
import type { ArborStateStore } from "../stateStore.js";
import type { ArborState } from "../types.js";
import { ArborMoleculeIntegration } from "./integration.js";
import { MoleculeRuntime } from "./molecule.js";
import { CogMoleculeRuntime } from "./runtime.js";

function state(): ArborState {
  return {
    activeSubsystem: "arbor",
    goal: null,
    unresolvedWork: [],
    strategyNotes: ["preserve provenance"],
    behavioralCorrections: ["do not invent"],
    acousticCorrections: [],
    voiceId: "test",
    selfModel: {
      version: "identity-v1",
      checksum: "checksum",
      sourceDigest: "digest",
      sourceQuestionCount: 1,
      promotedPatternIds: [],
      initializedAt: "2026-01-01T00:00:00.000Z",
      verifiedAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

describe("ArborMoleculeIntegration", () => {
  it("runs carrier retrieval capabilities persistence and audit without mutating identity", async () => {
    let saved = state();
    const originalIdentity = structuredClone(saved.selfModel);
    const store = {
      load: async () => structuredClone(saved),
      save: async (_scope: string, next: ArborState) => { saved = structuredClone(next); },
      recentMessages: async () => [
        { role: "user" as const, content: "earlier question" },
        { role: "assistant" as const, content: "earlier answer" },
      ],
    } as unknown as ArborStateStore;

    const bridge: ArborBackendBridge = {
      async loadState() {
        return { memory: [{ key: "m1", value: "remembered", confidence: 0.9 }] };
      },
      async persistTurn() {},
    };

    const capabilities = new ArborCapabilityRegistry().register({
      name: "read_example",
      description: "read an example",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      risk: "read",
      async execute() { return { result: "ok" }; },
    });

    const auditEvents: Array<{ event: string }> = [];
    const audit = {
      async record(event: { event: string }) { auditEvents.push({ event: event.event }); },
      async recent() { return []; },
    } as unknown as ArborAuditSink;

    const circle = new CogMoleculeRuntime({
      cogs: [{ id: "noop", async process(packet) { return { packet, reasons: ["observed"] }; } }],
      validate: async () => ({ valid: true, reasons: ["valid"] }),
      project: async (packet, reasons) => ({
        disposition: "assert",
        packet,
        ordered: packet.evidence.map((item) => item.id),
        provenance: packet.provenance,
        confidence: 1,
        friction: packet.friction,
        reasons,
      }),
    });

    const integration = new ArborMoleculeIntegration(
      new MoleculeRuntime([{ id: "reason", runtime: circle }], []),
      store,
      bridge,
      capabilities,
      audit,
    );

    const run = await integration.run({ startNode: "reason", packetId: "p1", turnId: "t1" });
    const evidenceIds = run.result.packet.evidence.map((item) => item.id);

    expect(run.result.disposition).toBe("assert");
    expect(evidenceIds).toContain("memory:m1");
    expect(evidenceIds).toContain("capability:read_example");
    expect(evidenceIds.some((id) => id.startsWith("history:"))).toBe(true);
    expect(saved.selfModel).toEqual(originalIdentity);
    expect(saved.behavioralCorrections).toEqual(["do not invent"]);
    expect(auditEvents.some((event) => event.event === "cog_molecule_complete")).toBe(true);
  });
});
