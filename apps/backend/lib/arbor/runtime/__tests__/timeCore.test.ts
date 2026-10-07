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

  it("uses a trusted UTC offset when a surface cannot supply an IANA timezone", () => {
    const core = buildTimeCore({
      now: new Date("2026-10-01T18:30:45.000Z"),
      utcOffsetMinutes: -420,
    });
    expect(core.timeZone).toBe("UTC-07:00");
    expect(core.utcOffsetMinutes).toBe(-420);
    expect(core.localDate).toBe("2026-10-01");
    expect(core.localTime).toBe("11:30:45");
  });

  it("fails safely to UTC for an invalid timezone", () => {
    const core = buildTimeCore({
      now: new Date("2026-10-01T18:30:45.000Z"),
      timeZone: "Not/AZone",
    });
    expect(core.timeZone).toBe("UTC");
    expect(core.localTime).toBe("18:30:45");
    expect(core.utcOffsetMinutes).toBe(0);
  });

  it("derives the actual IANA offset, not a fabricated UTC zero", () => {
    const core = buildTimeCore({
      now: new Date("2026-10-01T18:30:45.000Z"),
      timeZone: "America/Los_Angeles",
    });
    expect(core.utcOffsetMinutes).toBe(-420);
    expect(renderTimeCorePromptBlock(core)).toContain("utc_offset_minutes=-420");
    expect(renderTimeCorePromptBlock(core)).not.toContain("utc_offset_minutes=0");
  });

  it("honors DST transition and does not reuse a stale supplied offset", () => {
    const before = buildTimeCore({
      now: new Date("2026-11-01T08:30:00.000Z"),
      timeZone: "America/Los_Angeles",
      utcOffsetMinutes: -480,
    });
    const after = buildTimeCore({
      now: new Date("2026-11-01T09:30:00.000Z"),
      timeZone: "America/Los_Angeles",
      utcOffsetMinutes: -420,
    });
    expect(before.localTime).toBe("01:30:00");
    expect(after.localTime).toBe("01:30:00");
    expect(before.utcOffsetMinutes).toBe(-420);
    expect(after.utcOffsetMinutes).toBe(-480);
  });

  it("handles spring-forward without carrying the old winter offset", () => {
    const before = buildTimeCore({
      now: new Date("2026-03-08T09:30:00.000Z"),
      timeZone: "America/Los_Angeles",
    });
    const after = buildTimeCore({
      now: new Date("2026-03-08T10:30:00.000Z"),
      timeZone: "America/Los_Angeles",
    });
    expect(before.localTime).toBe("01:30:00");
    expect(before.utcOffsetMinutes).toBe(-480);
    expect(after.localTime).toBe("03:30:00");
    expect(after.utcOffsetMinutes).toBe(-420);
  });

  it("supports fractional-hour IANA offsets and explicit unknown offset rendering", () => {
    const india = buildTimeCore({
      now: new Date("2026-10-01T18:30:00.000Z"),
      timeZone: "Asia/Kolkata",
    });
    expect(india.utcOffsetMinutes).toBe(330);
    expect(india.localDate).toBe("2026-10-02");
    const unknown = renderTimeCorePromptBlock({
      ...india,
      utcOffsetMinutes: null,
    });
    expect(unknown).toContain("utc_offset_minutes=unknown");
  });

  it("projects an explicit no-inference rule", () => {
    const block = renderTimeCorePromptBlock(buildTimeCore({
      now: new Date("2026-10-01T18:30:45.000Z"),
    }));
    expect(block).toContain("AUTHORITATIVE HOST TIME");
    expect(block).toContain("Do not infer 'now'");
  });
});
