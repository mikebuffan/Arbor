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
    "carries an unfinished goal through an ordinary follow-up without a magic continuation phrase",
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
        goal: "repair longitudinal memory",
        unresolvedWork: [
          "verify Text to Voice continuity",
        ],
        strategyNotes: [],
        acousticCorrections: [],
        voiceId: "cedar",
      };

      await store.save(
        "project:project-1",
        state,
      );

      await runtime.runTurn({
        projectId: "project-1",
        turnId: "turn-follow-up",
        userText:
          "Make sure the corrections carry into voice too",
      });

      expect(
        calls[0]?.goal,
      ).toBe(
        "repair longitudinal memory",
      );
    },
  );

  it(
    "allows an explicit task switch to supersede unfinished work",
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
        goal: "repair longitudinal memory",
        unresolvedWork: [
          "verify Text to Voice continuity",
        ],
        strategyNotes: [],
        acousticCorrections: [],
        voiceId: "cedar",
      };

      await store.save(
        "project:project-1",
        state,
      );

      const newTask =
        "Switch to a new task: explain the deployment failure";

      await runtime.runTurn({
        projectId: "project-1",
        turnId: "turn-switch",
        userText: newTask,
      });

      expect(
        calls[0]?.goal,
      ).toBe(
        newTask,
      );
    },
  );

  it(
    "persists a behavioral correction before generation and projects it into Arbor context",
    async () => {
      let capturedInstructions =
        "";

      const runner:
        AgencyRunner =
        async (
          input,
        ) => {
          capturedInstructions =
            input.instructions;

          return {
            status:
              "complete",
            text:
              "Corrected.",
            state: {
              ...input.state,
              unresolvedWork:
                [],
            },
            rounds:
              1,
            toolCalls:
              0,
            researchCalls:
              0,
          };
        };

      const {
        runtime,
        store,
      } =
        await fixture(
          runner,
        );

      const correction =
        "You keep stopping. Don't wait for me; keep going.";

      await runtime.runTurn({
        projectId:
          "project-corrections",
        turnId:
          "turn-behavior-correction",
        userText:
          correction,
      });

      expect(
        capturedInstructions,
      ).toContain(
        "BEHAVIORAL CORRECTIONS:",
      );

      expect(
        capturedInstructions,
      ).toContain(
        correction,
      );

      const saved =
        await store.load(
          "project:project-corrections",
        );

      expect(
        saved
          ?.behavioralCorrections,
      ).toContain(
        correction,
      );

      expect(
        saved
          ?.acousticCorrections,
      ).not.toContain(
        correction,
      );
    },
  );

  it(
    "keeps acoustic correction turns out of behavioral state",
    async () => {
      let capturedInstructions =
        "";

      const runner:
        AgencyRunner =
        async (
          input,
        ) => {
          capturedInstructions =
            input.instructions;

          return {
            status:
              "complete",
            text:
              "Voice correction retained.",
            state: {
              ...input.state,
              unresolvedWork:
                [],
            },
            rounds:
              1,
            toolCalls:
              0,
            researchCalls:
              0,
          };
        };

      const {
        runtime,
        store,
      } =
        await fixture(
          runner,
        );

      const correction =
        "Your voice sounds British.";

      await runtime.runTurn({
        projectId:
          "project-acoustics",
        turnId:
          "turn-acoustic-correction",
        userText:
          correction,
        channel:
          "voice",
      });

      expect(
        capturedInstructions,
      ).toContain(
        "VOICE ACOUSTIC CORRECTIONS:",
      );

      const saved =
        await store.load(
          "project:project-acoustics",
        );

      expect(
        saved
          ?.acousticCorrections,
      ).toContain(
        correction,
      );

      expect(
        saved
          ?.behavioralCorrections ??
        [],
      ).not.toContain(
        correction,
      );
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
  it(
    "places behavioral corrections ahead of temporary subsystem conditioning",
    async () => {
      let capturedInstructions = "";

      const runner: AgencyRunner = async (input) => {
        capturedInstructions = input.instructions;

        return {
          status: "complete",
          text: "ok",
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

      await runtime.runTurn({
        projectId: "project-order",
        turnId: "turn-order",
        userText: "Stop making me tell you to go. Continue the work.",
      });

      const correctionIndex =
        capturedInstructions.indexOf("BEHAVIORAL CORRECTIONS:");
      const subsystemIndex =
        capturedInstructions.indexOf("SUBSYSTEM");

      expect(correctionIndex).toBeGreaterThanOrEqual(0);
      if (subsystemIndex >= 0) {
        expect(correctionIndex).toBeLessThan(subsystemIndex);
      }
    },
  );

  it(
    "ranks recovered open-loop work before unrelated unresolved notes",
    async () => {
      let capturedInstructions = "";

      const runner: AgencyRunner = async (input) => {
        capturedInstructions = input.instructions;

        return {
          status: "complete",
          text: "ok",
          state: {
            ...input.state,
            unresolvedWork: input.state.unresolvedWork,
          },
          rounds: 1,
          toolCalls: 0,
          researchCalls: 0,
        };
      };

      const { store, runtime } = await fixture(runner);

      await store.save(
        "project:project-open-loop",
        {
          activeSubsystem: "arbor",
          goal: "finish recovery",
          unresolvedWork: [
            "ordinary background note",
            "current priority: finish cognition integration",
          ],
          strategyNotes: [],
          behavioralCorrections: [],
          acousticCorrections: [],
          voiceId: "cedar",
        },
      );

      await runtime.runTurn({
        projectId: "project-open-loop",
        turnId: "turn-open-loop",
        userText: "continue",
      });

      const priorityIndex =
        capturedInstructions.indexOf(
          "- current priority: finish cognition integration",
        );
      const backgroundIndex =
        capturedInstructions.indexOf(
          "- ordinary background note",
        );

      expect(priorityIndex).toBeGreaterThanOrEqual(0);
      expect(backgroundIndex).toBeGreaterThanOrEqual(0);
      expect(priorityIndex).toBeLessThan(backgroundIndex);
    },
  );

  it(
    "projects the recovered active-goal continuation contract into generation",
    async () => {
      let capturedInstructions = "";

      const runner: AgencyRunner = async (input) => {
        capturedInstructions = input.instructions;

        return {
          status: "complete",
          text: "ok",
          state: {
            ...input.state,
            unresolvedWork: input.state.unresolvedWork,
          },
          rounds: 1,
          toolCalls: 0,
          researchCalls: 0,
        };
      };

      const { store, runtime } = await fixture(runner);

      await store.save(
        "project:project-active-goal",
        {
          activeSubsystem: "arbor",
          goal: "finish the cognition recovery",
          unresolvedWork: ["run integration verification"],
          strategyNotes: [],
          behavioralCorrections: [],
          acousticCorrections: [],
          voiceId: "cedar",
        },
      );

      await runtime.runTurn({
        projectId: "project-active-goal",
        turnId: "turn-active-goal",
        userText: "continue",
      });

      expect(capturedInstructions).toContain(
        "ACTIVE GOAL:\n- finish the cognition recovery",
      );
      expect(capturedInstructions).toContain(
        "Continue the highest-priority unresolved work without requiring another continuation prompt.",
      );
    },
  );

  it(
    "keeps current state and open loops ahead of temporary subsystem conditioning",
    async () => {
      let capturedInstructions = "";

      const runner: AgencyRunner = async (input) => {
        capturedInstructions = input.instructions;

        return {
          status: "complete",
          text: "ok",
          state: {
            ...input.state,
            unresolvedWork: input.state.unresolvedWork,
          },
          rounds: 1,
          toolCalls: 0,
          researchCalls: 0,
        };
      };

      const { store, runtime } = await fixture(runner);

      await store.save(
        "project:project-authority-order",
        {
          activeSubsystem: "annabelle",
          goal: "finish Arbor recovery",
          unresolvedWork: [
            "current priority: finish cognition integration",
          ],
          strategyNotes: [],
          behavioralCorrections: [
            "Do not make the user manage the workflow.",
          ],
          acousticCorrections: [
            "Use natural General American speech.",
          ],
          voiceId: "cedar",
        },
      );

      await runtime.runTurn({
        projectId: "project-authority-order",
        turnId: "turn-authority-order",
        userText: "continue",
      });

      const correctionIndex =
        capturedInstructions.indexOf("BEHAVIORAL CORRECTIONS:");
      const goalIndex =
        capturedInstructions.indexOf("ACTIVE GOAL:");
      const unresolvedIndex =
        capturedInstructions.indexOf("UNRESOLVED WORK:");
      const subsystemIndex =
        capturedInstructions.indexOf("SUBSYSTEM");
      const acousticIndex =
        capturedInstructions.indexOf("VOICE ACOUSTIC CORRECTIONS:");

      expect(correctionIndex).toBeGreaterThanOrEqual(0);
      expect(goalIndex).toBeGreaterThan(correctionIndex);
      expect(unresolvedIndex).toBeGreaterThan(goalIndex);

      if (subsystemIndex >= 0) {
        expect(subsystemIndex).toBeGreaterThan(unresolvedIndex);
      }

      expect(acousticIndex).toBeGreaterThan(unresolvedIndex);
    },
  );

});
