import { describe, expect, it } from "vitest";
import {
  buildTimeCore,
  renderTimeCorePromptBlock,
} from "../timeCore";

describe("Arbor Time Core", () => {
  it("uses a caller-supplied host instant as the single source of truth", () => {
    const core = buildTimeCore({
      now: new Date("2026-10-01T18:30:45.000Z"),
      timeZone: "America/Los_Angeles",
    });
    expect(core.isoNow).toBe("2026-10-01T18:30:45.000Z");
    expect(core.utcDate).toBe("2026-10-01");
    expect(core.localDate).toBe("2026-10-01");
    expect(core.localTime).toBe("11:30:45");
    expect(core.authoritative).toBe(true);
  });

  it("fails safely to UTC for an invalid timezone", () => {
    const core = buildTimeCore({
      now: new Date("2026-10-01T18:30:45.000Z"),
      timeZone: "Not/AZone",
    });
    expect(core.timeZone).toBe("UTC");
    expect(core.localTime).toBe("18:30:45");
  });

  it("projects an explicit no-inference rule", () => {
    const block = renderTimeCorePromptBlock(buildTimeCore({
      now: new Date("2026-10-01T18:30:45.000Z"),
    }));
    expect(block).toContain("AUTHORITATIVE HOST TIME");
    expect(block).toContain("Do not infer 'now'");
  });
});
