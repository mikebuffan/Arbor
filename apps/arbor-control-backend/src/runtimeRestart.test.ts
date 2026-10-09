import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { JsonlArborAuditSink } from "./audit.js";
import { ArborControlRuntime, type AgencyRunner } from "./runtime.js";
import { JsonFileArborStateStore } from "./stateStore.js";
import type { ArborState } from "./types.js";

// Real runtime and disk store, synthetic turns, fake agency: no model/network.
it("preserves corrections, unfinished work and core order across disk reopen and surface/task switches", async () => {
  const dir = await mkdtemp(join(tmpdir(), "arbor-restart-integration-"));
  try {
    const file = join(dir, "state.json");
    const observed: { state: ArborState; instructions: string; history: string[] }[] = [];
    const runner: AgencyRunner = async input => {
      observed.push({ state: structuredClone(input.state), instructions: input.instructions,
        history: (input.history ?? []).map(m => m.content) });
      return { status: "blocked", text: "Synthetic boundary; work is still unfinished.",
        state: { ...input.state, goal: "finish offline fixture", unresolvedWork: ["review synthetic result"] },
        rounds: 1, toolCalls: 0, researchCalls: 0,
        blocker: "authorization_required", capability: "synthetic.review",
        requiredUserInput: "Synthetic boundary only; no real permission requested." };
    };
    const reopen = () => new ArborControlRuntime(new JsonFileArborStateStore(file),
      { loadState: async () => ({}), persistTurn: async () => {} },
      new JsonlArborAuditSink(join(dir, "audit.jsonl")), runner);
    const correction = "You keep stopping. Don't wait for me; keep going.";
    const firstRequest = { projectId: "synthetic-project", conversationId: "thread-a",
      turnId: "first", userText: correction, channel: "text" as const };
    const first = await reopen().runTurn(firstRequest);
    // A fresh store/runtime must replay the committed turn without regenerating.
    expect(await reopen().runTurn(firstRequest)).toEqual(first);
    expect(observed).toHaveLength(1);

    for (const [index, userText, channel, conversationId, subsystem] of [
      [1, "go", "voice", "thread-a", "arbor"],
      [2, "Annabelle, kitchen's yours.", "text", "thread-a", "annabelle"],
      [3, "Arbor, kitchen's yours.", "text", "thread-b", "arbor"],
    ] as const) {
      await reopen().runTurn({ projectId: "synthetic-project", conversationId,
        turnId: "restart-" + index, userText, channel });
      const seen = observed[index];
      expect(seen.state.goal).toBe("finish offline fixture");
      expect(seen.state.unresolvedWork).toContain("review synthetic result");
      expect(seen.state.behavioralCorrections).toContain(correction);
      expect(seen.state.activeSubsystem).toBe(subsystem);
      expect(seen.instructions).toContain(correction);
      const core = seen.instructions.indexOf("ONE ARBOR.");
      const anchor = seen.instructions.indexOf("ARBOR DURABLE IDENTITY ANCHOR");
      expect(core).toBeGreaterThanOrEqual(0);
      expect(anchor).toBeGreaterThan(core);
      if (subsystem === "annabelle") expect(seen.instructions.indexOf("ANNABELLE SUBSYSTEM.")).toBeGreaterThan(anchor);
    }
    expect(observed[1].history).toContain(correction);
    const saved = await new JsonFileArborStateStore(file).load("project:synthetic-project");
    expect(saved?.unresolvedWork).toEqual(["review synthetic result"]);
    expect(saved?.behavioralCorrections).toContain(correction);

    // Reusing the same disk does not make another project's history available.
    await reopen().runTurn({ projectId: "synthetic-other", conversationId: "thread-a",
      turnId: "foreign", userText: "Hello Arbor." });
    const foreign = observed[4];
    expect(foreign.state.behavioralCorrections ?? []).not.toContain(correction);
    expect(foreign.state.unresolvedWork).not.toContain("review synthetic result");
    expect(foreign.instructions).not.toContain(correction);
    expect(foreign.history).toEqual([]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
