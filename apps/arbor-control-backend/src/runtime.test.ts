import {
  mkdtemp,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import { JsonlArborAuditSink } from "./audit.js";
import type { ArborBackendBridge } from "./backendBridge.js";
import {
  ArborControlRuntime,
  type AgencyRunner,
} from "./runtime.js";
import { JsonFileArborStateStore } from "./stateStore.js";
import type { ArborState } from "./types.js";

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanup.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

const quietBridge: ArborBackendBridge = {
  async loadState() {
    return {};
  },

  async persistTurn() {
    return;
  },
};

function createRunner(
  calls: Array<{
    userText: string;
    goal: string | null;
    subsystem: string;
    history: string[];
  }>,
): AgencyRunner {
  return async (input) => {
    calls.push({
      userText: input.userText,
      goal: input.state.goal,
      subsystem: input.state.activeSubsystem,
      history: (input.history ?? []).map(
        (message) => `${message.role}:${message.content}`,
      ),
    });

    await input.hooks?.onVerification?.({
      round: 0,
      complete: true,
      unresolvedCount: 0,
      strategyCandidate: null,
      toolCalls: 0,
      researchCalls: 0,
    });

    return {
      status: "complete",
      text:
        input.state.activeSubsystem === "annabelle"
          ? "Annabelle canonical reply."
          : "Arbor canonical reply.",
      state: {
        ...input.state,
        unresolvedWork: [],
      },
      rounds: 1,
      toolCalls: 0,
      researchCalls: 0,
    };
  };
}

async function fixture(
  runner: AgencyRunner,
  bridge: ArborBackendBridge = quietBridge,
) {
  const dir = await mkdtemp(
    join(tmpdir(), "arbor-runtime-"),
  );
  cleanup.push(dir);

  const store = new JsonFileArborStateStore(
    join(dir, "state.json"),
  );
  const audit = new JsonlArborAuditSink(
    join(dir, "audit.jsonl"),
  );
  const runtime = new ArborControlRuntime(
    store,
    bridge,
    audit,
    runner,
  );

  return {
    store,
    audit,
    runtime,
  };
}

describe("Arbor control runtime pass", () => {
  it(
    "switches Arbor -> Annabelle -> Arbor while carrying its own conversation history",
    async () => {
      const calls: Array<{
        userText: string;
        goal: string | null;
        subsystem: string;
        history: string[];
      }> = [];

      const { runtime } = await fixture(createRunner(calls));

      const first = await runtime.runTurn({
        projectId: "project-1",
        turnId: "turn-1",
        userText: "Hello Arbor.",
      });

      expect(first.subsystem).toBe("arbor");

      const second = await runtime.runTurn({
        projectId: "project-1",
        turnId: "turn-2",
        userText: "Annabelle, kitchen's yours.",
      });

      expect(second.subsystem).toBe("annabelle");
      expect(calls[1]?.history).toEqual([
        "user:Hello Arbor.",
        "assistant:Arbor canonical reply.",
      ]);

      const third = await runtime.runTurn({
        projectId: "project-1",
        turnId: "turn-3",
        userText: "Arbor, kitchen’s yours.",
      });

      expect(third.subsystem).toBe("arbor");
      expect(calls[2]?.history).toEqual([
        "user:Hello Arbor.",
        "assistant:Arbor canonical reply.",
        "user:Annabelle, kitchen's yours.",
        "assistant:Annabelle canonical reply.",
      ]);
    },
  );

  it(
    "replays the exact canonical response for the same turn id without rerunning agency",
    async () => {
      const calls: Array<{
        userText: string;
        goal: string | null;
        subsystem: string;
        history: string[];
      }> = [];

      const { runtime } = await fixture(createRunner(calls));
      const request = {
        projectId: "project-1",
        turnId: "stable-turn",
        userText: "Do the thing.",
      };

      const first = await runtime.runTurn(request);
      const replay = await runtime.runTurn(request);

      expect(replay).toEqual(first);
      expect(calls).toHaveLength(1);
    },
  );

  it(
    "rejects turn-id reuse with different request content",
    async () => {
      const { runtime } = await fixture(createRunner([]));

      await runtime.runTurn({
        projectId: "project-1",
        turnId: "same-id",
        userText: "First request.",
      });

      await expect(
        runtime.runTurn({
          projectId: "project-1",
          turnId: "same-id",
          userText: "Different request.",
        }),
      ).rejects.toThrow("turn_id_conflict");
    },
  );

  it(
    "resumes the original unresolved goal when the user says go",
    async () => {
      const calls: Array<{
        userText: string;
        goal: string | null;
        subsystem: string;
        history: string[];
      }> = [];

      const { store, runtime } = await fixture(
        createRunner(calls),
      );

      const state: ArborState = {
        activeSubsystem: "arbor",
        goal: "finish the integration",
        unresolvedWork: ["run final verification"],
        strategyNotes: [],
        acousticCorrections: [],
        voiceId: "cedar",
      };

      await store.save("project:project-1", state);

      await runtime.runTurn({
        projectId: "project-1",
        turnId: "turn-go",
        userText: "go",
      });

      expect(calls[0]?.goal).toBe("finish the integration");
      expect(calls[0]?.userText).toBe("go");
    },
  );

  it(
    "continues when the Mike/Nox read-only bridge is unavailable",
    async () => {
      const brokenBridge: ArborBackendBridge = {
        async loadState() {
          throw new Error("upstream unavailable");
        },

        async persistTurn() {
          return;
        },
      };

      const calls: Array<{
        userText: string;
        goal: string | null;
        subsystem: string;
        history: string[];
      }> = [];

      const { runtime } = await fixture(
        createRunner(calls),
        brokenBridge,
      );

      const response = await runtime.runTurn({
        projectId: "project-1",
        turnId: "turn-bridge-down",
        userText: "Still work.",
      });

      expect(response.text).toBe("Arbor canonical reply.");
      expect(calls).toHaveLength(1);
    },
  );

  it(
    "serializes simultaneous turns in the same project scope",
    async () => {
      let active = 0;
      let maxActive = 0;

      const runner: AgencyRunner = async (input) => {
        active += 1;
        maxActive = Math.max(maxActive, active);

        await new Promise((resolve) =>
          setTimeout(resolve, 20),
        );

        active -= 1;

        return {
          status: "complete",
          text: input.userText,
          state: {
            ...input.state,
            unresolvedWork: [],
          },
          rounds: 1,
          toolCalls: 0,
          researchCalls: 0,
        };
      };

      const { runtime } = await fixture(runner);

      await Promise.all([
        runtime.runTurn({
          projectId: "project-1",
          turnId: "turn-a",
          userText: "A",
        }),
        runtime.runTurn({
          projectId: "project-1",
          turnId: "turn-b",
          userText: "B",
        }),
      ]);

      expect(maxActive).toBe(1);
    },
  );

  it(
    "records generation before persistence in the audit chronology",
    async () => {
      const { runtime, audit } = await fixture(
        createRunner([]),
      );

      await runtime.runTurn({
        projectId: "project-1",
        turnId: "turn-audit",
        userText: "Audit this.",
      });

      const events = await audit.recent(50);
      const names = events.map((event) => event.event);

      expect(names).toEqual([
        "turn_started",
        "state_loaded",
        "subsystem_resolved",
        "external_context_checked",
        "completion_checked",
        "canonical_response_generated",
        "state_and_canonical_turn_persisted",
        "turn_returned",
      ]);

      expect(
        names.indexOf("canonical_response_generated"),
      ).toBeLessThan(
        names.indexOf("state_and_canonical_turn_persisted"),
      );
    },
  );
});
