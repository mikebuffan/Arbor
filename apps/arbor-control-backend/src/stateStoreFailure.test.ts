import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { JsonFileArborStateStore } from "./stateStore.js";
import type { ArborState, StoredArborTurn } from "./types.js";

const fault = vi.hoisted(() => ({ failRename: false }));
vi.mock("node:fs/promises", async importOriginal => {
  const fs = await importOriginal<typeof import("node:fs/promises")>();
  return { ...fs, rename: async (...args: Parameters<typeof fs.rename>) => {
    if (fault.failRename) {
      fault.failRename = false;
      throw Object.assign(new Error("synthetic disk replacement failure"), { code: "EIO" });
    }
    return fs.rename(...args);
  } };
});

it("keeps the last durable work after a failed atomic commit and recovers the write queue on retry", async () => {
  const dir = await mkdtemp(join(tmpdir(), "arbor-save-failure-"));
  try {
    const file = join(dir, "state.json");
    const store = new JsonFileArborStateStore(file);
    const scope = "project:synthetic";
    const prior: ArborState = { activeSubsystem: "arbor", goal: "finish fixture",
      unresolvedWork: ["review fixture"], strategyNotes: [], acousticCorrections: [],
      behavioralCorrections: ["Keep going until a real boundary."], voiceId: "cedar" };
    await store.save(scope, prior);
    const before = await readFile(file, "utf8");
    const turn: StoredArborTurn = { turnId: "synthetic-turn", scope,
      requestFingerprint: "synthetic-fingerprint", userText: "go", createdAt: "2026-10-09T00:00:00Z",
      response: { text: "Synthetic result", turnId: "synthetic-turn", subsystem: "arbor",
        channel: "text", voice: { voiceId: "cedar", acousticCorrections: [] } } };
    const next = { ...prior, unresolvedWork: ["review fixture", "review new result"] };
    fault.failRename = true;
    await expect(store.commitTurn(scope, next, turn)).rejects.toThrow("synthetic disk replacement failure");
    expect(await readFile(file, "utf8")).toBe(before);
    expect(await readdir(dir)).toEqual(["state.json"]);
    const reopened = new JsonFileArborStateStore(file);
    expect(await reopened.load(scope)).toEqual(prior);
    expect(await reopened.loadTurn(turn.turnId)).toBeNull();
    expect(await reopened.recentMessages(scope)).toEqual([]);
    // Retry on the same store checks that a rejected write does not poison its queue.
    await store.commitTurn(scope, next, turn);
    await store.commitTurn(scope, next, turn);
    const recovered = new JsonFileArborStateStore(file);
    expect(await recovered.load(scope)).toEqual(next);
    expect(await recovered.loadTurn(turn.turnId)).toEqual(turn);
    expect(await recovered.recentMessages(scope)).toEqual([
      { role: "user", content: "go" }, { role: "assistant", content: "Synthetic result" },
    ]);
  } finally {
    fault.failRename = false;
    await rm(dir, { recursive: true, force: true });
  }
});
