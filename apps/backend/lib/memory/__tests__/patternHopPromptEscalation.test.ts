import { describe, expect, it } from "vitest";
import { routeContextCodex } from "@/lib/memory/contextCodex";

describe("Pattern Hop prompt escalation routing", () => {
  it("escalates sparse app continuity cues", () => {
    const routed = routeContextCodex("What am I moving into the app?");
    expect(routed.routes).toContain("project");
    expect(routed.query.toLowerCase()).toContain("arbor");
  });

  it("escalates provenance claims for verification", () => {
    const routed = routeContextCodex("You invented Pattern Hop.");
    expect(routed.requiresVerification).toBe(true);
    expect(routed.routes).toContain("provenance");
  });

  it("does not escalate unrelated ordinary chat", () => {
    const routed = routeContextCodex("What should we eat tonight?");
    expect(routed.requiresVerification).toBe(false);
    expect(routed.routes).not.toContain("project");
    expect(routed.routes).not.toContain("provenance");
  });
});
