import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const agentSource = readFileSync(resolve(here, "../openaiAgent.ts"), "utf8");

describe("sustained agency contract", () => {
  it("continues internally when completion verification says work remains", () => {
    expect(agentSource).toContain("Continue the work now. Use available tools/research when useful.");
    expect(agentSource).toContain("Do not merely report what remains if it can be completed with an available reversible action.");
    expect(agentSource).toMatch(/if\s*\(\s*verification\.complete\s*&&\s*behaviorClean\s*\)/);
  });

  it("reserves user blocking for real risk boundaries", () => {
    expect(agentSource).toContain("toolNeedsUserBoundary");
    expect(agentSource).toContain("irreversible_action");
    expect(agentSource).toContain("high_consequence_fork");
  });

  it("keeps successful capability execution as evidence instead of treating it as goal completion", () => {
    expect(agentSource).toContain("actionEvidence.push");
    expect(agentSource).toContain("capability ${tool.name} completed successfully");
    expect(agentSource).toContain("verifyAgencyCompletion");
  });
});
