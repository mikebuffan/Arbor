import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { JsonFileArborStateStore } from "./stateStore.js";

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanup.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
});

describe("standalone control state", () => {
  it("persists state and exact canonical turns independently of Mike backend", async () => {
    const dir = await mkdtemp(join(tmpdir(), "arbor-control-"));
    cleanup.push(dir);

    const file = join(dir, "state.json");
    const store = new JsonFileArborStateStore(file);

    await store.save("project:test", {
      activeSubsystem: "annabelle",
      goal: "finish scene",
      unresolvedWork: ["final paragraph"],
      strategyNotes: [],
      acousticCorrections: [],
      voiceId: "cedar",
    });

    await store.saveTurn({
      text: "Exact Arbor text.\nDo not change me.",
      projectId: "test",
      turnId: "turn-1",
      subsystem: "annabelle",
      channel: "voice",
    });

    const reopened = new JsonFileArborStateStore(file);

    expect(
      await reopened.load("project:test"),
    ).toMatchObject({
      activeSubsystem: "annabelle",
      goal: "finish scene",
    });

    expect(
      (await reopened.loadTurn("turn-1"))?.text,
    ).toBe("Exact Arbor text.\nDo not change me.");
  });
});
