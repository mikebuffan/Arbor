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

import { JsonFileArborStateStore } from "./stateStore.js";
import type {
  ArborState,
  StoredArborTurn,
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

function state(goal: string): ArborState {
  return {
    activeSubsystem: "arbor",
    goal,
    unresolvedWork: [],
    strategyNotes: [],
    acousticCorrections: [],
    voiceId: "cedar",
  };
}

function turn(input: {
  id: string;
  scope: string;
  fingerprint: string;
  userText: string;
  assistantText: string;
}): StoredArborTurn {
  return {
    turnId: input.id,
    scope: input.scope,
    requestFingerprint: input.fingerprint,
    userText: input.userText,
    createdAt: new Date().toISOString(),
    response: {
      text: input.assistantText,
      turnId: input.id,
      subsystem: "arbor",
      channel: "text",
      voice: {
        voiceId: "cedar",
        acousticCorrections: [],
      },
    },
  };
}

describe("standalone control state", () => {
  it(
    "persists state, canonical turns, and conversation history independently of Mike backend",
    async () => {
      const dir = await mkdtemp(
        join(tmpdir(), "arbor-control-"),
      );
      cleanup.push(dir);

      const file = join(dir, "state.json");
      const store = new JsonFileArborStateStore(file);
      const scope = "project:test";

      const stored = turn({
        id: "turn-1",
        scope,
        fingerprint: "fingerprint-1",
        userText: "Hello Arbor.",
        assistantText: "Exact Arbor text.\nDo not change me.",
      });

      await store.commitTurn(
        scope,
        {
          activeSubsystem: "annabelle",
          goal: "finish scene",
          unresolvedWork: ["final paragraph"],
          strategyNotes: [],
          acousticCorrections: [],
          voiceId: "cedar",
        },
        stored,
      );

      const reopened = new JsonFileArborStateStore(file);

      expect(
        await reopened.load(scope),
      ).toMatchObject({
        activeSubsystem: "annabelle",
        goal: "finish scene",
      });

      expect(
        (await reopened.loadTurn("turn-1"))?.response.text,
      ).toBe("Exact Arbor text.\nDo not change me.");

      expect(
        await reopened.recentMessages(scope),
      ).toEqual([
        {
          role: "user",
          content: "Hello Arbor.",
        },
        {
          role: "assistant",
          content: "Exact Arbor text.\nDo not change me.",
        },
      ]);
    },
  );

  it(
    "serializes concurrent commits without losing turns",
    async () => {
      const dir = await mkdtemp(
        join(tmpdir(), "arbor-control-"),
      );
      cleanup.push(dir);

      const store = new JsonFileArborStateStore(
        join(dir, "state.json"),
      );
      const scope = "project:concurrent";

      await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          store.commitTurn(
            scope,
            state(`goal-${index}`),
            turn({
              id: `turn-${index}`,
              scope,
              fingerprint: `fp-${index}`,
              userText: `user-${index}`,
              assistantText: `assistant-${index}`,
            }),
          ),
        ),
      );

      for (let index = 0; index < 20; index += 1) {
        expect(
          await store.loadTurn(`turn-${index}`),
        ).not.toBeNull();
      }

      expect(
        (await store.recentMessages(scope, 20)).length,
      ).toBe(40);
    },
  );

  it(
    "rejects reusing a turn id for a different request",
    async () => {
      const dir = await mkdtemp(
        join(tmpdir(), "arbor-control-"),
      );
      cleanup.push(dir);

      const store = new JsonFileArborStateStore(
        join(dir, "state.json"),
      );
      const scope = "project:test";

      await store.saveTurn(
        turn({
          id: "turn-1",
          scope,
          fingerprint: "fp-a",
          userText: "A",
          assistantText: "A reply",
        }),
      );

      await expect(
        store.saveTurn(
          turn({
            id: "turn-1",
            scope,
            fingerprint: "fp-b",
            userText: "B",
            assistantText: "B reply",
          }),
        ),
      ).rejects.toThrow("turn_id_conflict");
    },
  );
});
