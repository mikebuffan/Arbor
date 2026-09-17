import { describe, expect, it } from "vitest";
import { createHypothesisResolutionCog } from "./hypothesisCog.js";
import { AdaptiveLinearInterface } from "./interface.js";
import { SubsystemBridge } from "./bridge.js";
import { createRouteLearningCog } from "./adapters.js";
import type { CogPacket, ReleaseProjection } from "./types.js";

const packet = (): CogPacket => ({ id:"p", evidence:[], hypotheses:[], unresolved:[], challenges:[], provenance:["source"], friction:0, circulation:0, metadata:{ private:"no", shared:"yes" } });
const release = (): ReleaseProjection => ({ disposition:"assert", packet:packet(), ordered:["x","y"], provenance:["source"], confidence:.9, friction:.1, reasons:["because"] });

describe("cog molecule components", () => {
  it("holds close competing hypotheses unresolved", async () => {
    const p = packet(); p.hypotheses = [
      { id:"a", value:"A", confidence:.5, support:[], contradictions:[] },
      { id:"b", value:"B", confidence:.5, support:[], contradictions:[] },
    ];
    const cog = createHypothesisResolutionCog("h", (h) => h.id === "a" ? .55 : .5);
    const result = await cog.process(p, { round:1, maxRounds:4 });
    expect(result.packet.unresolved).toContain("hypothesis:a");
  });

  it("projects only destination requested interface fields", () => {
    const iface = new AdaptiveLinearInterface(); iface.register({ destination:"writer", fields:["ordered","provenance"] });
    const projected = iface.project(release(), "writer");
    expect(projected.metadata.ordered).toEqual(["x","y"]);
    expect(projected.metadata.confidence).toBeUndefined();
  });

  it("bridges context without merging private subsystem state", () => {
    const bridge = new SubsystemBridge({ id:"arbor-annabelle", from:"arbor", to:"annabelle", allowedMetadata:["shared"] });
    const transferred = bridge.transfer(release());
    expect(transferred.metadata.shared).toBe("yes");
    expect(transferred.metadata.private).toBeUndefined();
    expect(transferred.destination).toBe("annabelle");
  });

  it("reuses existing route learning as a cog signal", async () => {
    const cog = createRouteLearningCog("route", "alternate", { routeId:"alternate", attempts:4, successes:3, failures:1, consecutiveFailures:0, lastOutcome:"success" });
    const result = await cog.process(packet(), { round:1, maxRounds:4 });
    expect((result.packet.metadata.routeLearning as { score:number }).score).toBeGreaterThan(.5);
  });
});