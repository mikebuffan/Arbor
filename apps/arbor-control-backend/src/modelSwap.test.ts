import {
  mkdtemp,
} from "node:fs/promises";
import {
  tmpdir,
} from "node:os";
import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  AgencyRunner,
} from "./runtime.js";
import {
  ArborControlRuntime,
} from "./runtime.js";
import {
  JsonFileArborStateStore,
} from "./stateStore.js";

describe(
  "runtime model-swap continuity",
  () => {
    it(
      "re-injects durable identity and conversation history into a fresh runner",
      async () => {
        const dir =
          await mkdtemp(
            join(
              tmpdir(),
              "arbor-model-swap-",
            ),
          );

        const store =
          new JsonFileArborStateStore(
            join(
              dir,
              "state.json",
            ),
          );

        const firstRunner:
          AgencyRunner =
          async (
            input,
          ) => ({
            status:
              "complete",
            text:
              "first model response",
            state:
              input.state,
            rounds:
              1,
            toolCalls:
              0,
            researchCalls:
              0,
          });

        const firstRuntime =
          new ArborControlRuntime(
            store,
            {
              async loadState() {
                return {};
              },
              async persistTurn() {},
            },
            undefined,
            firstRunner,
          );

        await firstRuntime.runTurn({
          userText:
            "remember this thread",
          conversationId:
            "swap-test",
        });

        let capturedInstructions =
          "";

        let capturedHistoryLength =
          0;

        const secondRunner:
          AgencyRunner =
          async (
            input,
          ) => {
            capturedInstructions =
              input.instructions;

            capturedHistoryLength =
              input.history
                ?.length ??
              0;

            return {
              status:
                "complete",
              text:
                "second model response",
              state:
                input.state,
              rounds:
                1,
              toolCalls:
                0,
              researchCalls:
                0,
            };
          };

        const secondRuntime =
          new ArborControlRuntime(
            new JsonFileArborStateStore(
              join(
                dir,
                "state.json",
              ),
            ),
            {
              async loadState() {
                return {};
              },
              async persistTurn() {},
            },
            undefined,
            secondRunner,
          );

        await secondRuntime.runTurn({
          userText:
            "continue",
          conversationId:
            "swap-test",
        });

        expect(
          capturedInstructions,
        ).toContain(
          "ARBOR DURABLE IDENTITY ANCHOR",
        );

        expect(
          capturedInstructions,
        ).toContain(
          "source_questions=1300",
        );

        expect(
          capturedInstructions,
        ).toContain(
          "1,000-QUESTION SELF-MODEL",
        );

        expect(
          capturedHistoryLength,
        ).toBe(
          2,
        );
      },
    );
  },
);
