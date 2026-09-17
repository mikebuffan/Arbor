import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { ArborBackendBridge } from "./backendBridge.js";
import { ArborControlRuntime, type AgencyRunner } from "./runtime.js";
import { JsonFileArborStateStore } from "./stateStore.js";

const quietBridge: ArborBackendBridge = {
  async loadState() {
    return {};
  },
  async persistTurn() {
    return;
  },
};

describe("Arbor runtime agency continuation wiring", () => {
  it("continues checkpointed work inside one turn and rebuilds instructions from the latest state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "arbor-runtime-continuation-"));

    try {
      const store = new JsonFileArborStateStore(join(dir, "state.json"));
      const seenInstructions: string[] = [];
      let calls = 0;

      const runner: AgencyRunner = async (input) => {
        calls += 1;
        seenInstructions.push(input.instructions);

        if (calls === 1) {
          return {
            status: "checkpointed",
            text: "checkpoint",
            state: {
              ...input.state,
              unresolvedWork: ["second step"],
            },
            rounds: 12,
            toolCalls: 1,
            researchCalls: 0,
          };
        }

        return {
          status: "complete",
          text: "done",
          state: {
            ...input.state,
            unresolvedWork: [],
          },
          rounds: 1,
          toolCalls: 0,
          researchCalls: 0,
        };
      };

      const runtime = new ArborControlRuntime(
        store,
        quietBridge,
        undefined,
        runner,
      );

      const response = await runtime.runTurn({
        projectId: "continuation-project",
        turnId: "continuation-turn",
        userText: "finish the work",
      });

      expect(calls).toBe(2);
      expect(seenInstructions[0]).not.toContain("- second step");
      expect(seenInstructions[1]).toContain("UNRESOLVED WORK:");
      expect(seenInstructions[1]).toContain("- second step");
      expect(response.text).toBe("done");

      const saved = await store.load("project:continuation-project");
      expect(saved?.unresolvedWork).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
