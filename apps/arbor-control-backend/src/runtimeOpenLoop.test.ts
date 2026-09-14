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

import type {
  ArborBackendBridge,
} from "./backendBridge.js";
import {
  ArborControlRuntime,
  type AgencyRunner,
} from "./runtime.js";
import {
  JsonFileArborStateStore,
} from "./stateStore.js";
import type {
  ArborState,
} from "./types.js";

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

async function fixture(
  runner: AgencyRunner,
) {
  const dir = await mkdtemp(
    join(tmpdir(), "arbor-open-loop-runtime-"),
  );
  cleanup.push(dir);

  const store = new JsonFileArborStateStore(
    join(dir, "state.json"),
  );
  const runtime = new ArborControlRuntime(
    store,
    quietBridge,
    undefined,
    runner,
  );

  return {
    store,
    runtime,
  };
}

function priorState(): ArborState {
  return {
    activeSubsystem: "arbor",
    goal: "unzip and inspect Arbor export",
    unresolvedWork: [
      "index extracted files",
      "pattern-hop recovered code",
    ],
    strategyNotes: [],
    behavioralCorrections: [],
    acousticCorrections: [],
    voiceId: "cedar",
  };
}

describe("control runtime interrupted open-loop integration", () => {
  it("answers an unrelated foreground turn and restores the exact prior objective before commit", async () => {
    let capturedState: ArborState | null = null;
    let capturedInstructions = "";

    const runner: AgencyRunner = async (input) => {
      capturedState = structuredClone(input.state);
      capturedInstructions = input.instructions;

      return {
        status: "complete",
        text: "You are a little bossy. 😂",
        state: {
          ...input.state,
          unresolvedWork: [],
        },
        rounds: 1,
        toolCalls: 0,
        researchCalls: 0,
      };
    };

    const { store, runtime } = await fixture(runner);
    await store.save(
      "project:project-1",
      priorState(),
    );

    const response = await runtime.runTurn({
      projectId: "project-1",
      turnId: "side-question",
      userText: "Am I bossy?",
    });

    expect(response.text).toBe(
      "You are a little bossy. 😂",
    );
    expect(capturedState?.goal).toBe("Am I bossy?");
    expect(capturedState?.unresolvedWork).toEqual([
      "complete goal: Am I bossy?",
    ]);
    expect(capturedState?.suspendedOpenLoops).toHaveLength(1);
    expect(
      capturedState?.suspendedOpenLoops?.[0]?.goal,
    ).toBe("unzip and inspect Arbor export");

    // Structured host checkpoints are not dumped into provider instructions.
    expect(capturedInstructions).not.toContain(
      "suspendedOpenLoops",
    );
    expect(capturedInstructions).not.toContain(
      "control-open-loop",
    );

    const saved = await store.load(
      "project:project-1",
    );

    expect(saved?.goal).toBe(
      "unzip and inspect Arbor export",
    );
    expect(saved?.unresolvedWork).toEqual([
      "index extracted files",
      "pattern-hop recovered code",
    ]);
    expect(saved?.suspendedOpenLoops ?? []).toEqual([]);
  });

  it("keeps foreground suspension intact when agency remains incomplete", async () => {
    const runner: AgencyRunner = async (input) => ({
      status: "blocked",
      text: "Authorize the capability.",
      state: {
        ...input.state,
        unresolvedWork: [
          "requires user input: authorize capability",
        ],
      },
      rounds: 1,
      toolCalls: 0,
      researchCalls: 0,
      blocker: "authorization_required",
      capability: "example",
      requiredUserInput: "Authorize the capability.",
    });

    const { store, runtime } = await fixture(runner);
    await store.save(
      "project:project-2",
      priorState(),
    );

    await runtime.runTurn({
      projectId: "project-2",
      turnId: "blocked-side-question",
      userText: "Check something unrelated for me",
    });

    const saved = await store.load(
      "project:project-2",
    );

    expect(saved?.goal).toBe(
      "Check something unrelated for me",
    );
    expect(saved?.unresolvedWork).toEqual([
      "requires user input: authorize capability",
    ]);
    expect(saved?.suspendedOpenLoops).toHaveLength(1);
  });

  it("explicit task replacement does not resurrect the prior objective", async () => {
    let capturedState: ArborState | null = null;

    const runner: AgencyRunner = async (input) => {
      capturedState = structuredClone(input.state);
      return {
        status: "complete",
        text: "New task complete.",
        state: {
          ...input.state,
          unresolvedWork: [],
        },
        rounds: 1,
        toolCalls: 0,
        researchCalls: 0,
      };
    };

    const { store, runtime } = await fixture(runner);
    await store.save(
      "project:project-3",
      priorState(),
    );

    const newTask =
      "Switch to a new task: explain the deployment failure";

    await runtime.runTurn({
      projectId: "project-3",
      turnId: "explicit-switch",
      userText: newTask,
    });

    expect(capturedState?.goal).toBe(newTask);
    expect(capturedState?.suspendedOpenLoops ?? []).toEqual([]);

    const saved = await store.load(
      "project:project-3",
    );
    expect(saved?.goal).toBe(newTask);
    expect(saved?.unresolvedWork).toEqual([]);
    expect(saved?.suspendedOpenLoops ?? []).toEqual([]);
  });
});
