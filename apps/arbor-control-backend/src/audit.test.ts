import {
  mkdtemp,
  readFile,
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

import {
  JsonlArborAuditSink,
} from "./audit.js";

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

describe("control audit timeline", () => {
  it("preserves event order and strips unapproved sensitive detail", async () => {
    const dir = await mkdtemp(
      join(tmpdir(), "arbor-audit-"),
    );
    cleanup.push(dir);

    const file = join(dir, "audit.jsonl");
    const audit = new JsonlArborAuditSink(file);

    await audit.record({
      turnId: "turn-1",
      projectId: "project-1",
      phase: "input",
      event: "turn_started",
      detail: {
        channel: "text",
        authorization: "Bearer secret",
        rawUserText: "private conversation text",
      },
    });

    await audit.record({
      turnId: "turn-1",
      projectId: "project-1",
      phase: "complete",
      event: "turn_completed",
      detail: {
        toolCalls: 2,
      },
    });

    const events = await audit.recent(10);

    expect(
      events.map((event) => event.event),
    ).toEqual([
      "turn_started",
      "turn_completed",
    ]);

    expect(events[0]?.detail).toEqual({
      channel: "text",
    });

    const raw = await readFile(file, "utf8");

    expect(raw).not.toContain("Bearer secret");
    expect(raw).not.toContain("private conversation text");
  });

  it("returns only the requested recent tail", async () => {
    const dir = await mkdtemp(
      join(tmpdir(), "arbor-audit-"),
    );
    cleanup.push(dir);

    const audit = new JsonlArborAuditSink(
      join(dir, "audit.jsonl"),
    );

    for (let index = 0; index < 5; index += 1) {
      await audit.record({
        turnId: `turn-${index}`,
        phase: "complete",
        event: `event-${index}`,
      });
    }

    const events = await audit.recent(2);

    expect(
      events.map((event) => event.event),
    ).toEqual([
      "event-3",
      "event-4",
    ]);
  });
});
