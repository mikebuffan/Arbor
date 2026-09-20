import { describe, expect, it } from "vitest";
import { isArkChatExecutionEnabled, isArkLiveExecutionUnlocked } from "../activation";

describe("ARK chat activation isolation", () => {
  it("keeps normal chat execution unchanged when all switches are absent", () => {
    expect(isArkChatExecutionEnabled({})).toBe(false);
  });

  it("keeps chat disabled even when older ARK switches are already enabled", () => {
    expect(isArkChatExecutionEnabled({
      ARBOR_ENABLE_ARK_EXECUTION: "true",
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: "true",
    })).toBe(false);
  });

  it("does not change chat execution when only the background worker is enabled", () => {
    expect(isArkChatExecutionEnabled({
      ARBOR_ARK_ENABLE_LIVE_EXECUTION: "true",
      ARBOR_ENABLE_ARK_EXECUTION: "true",
    })).toBe(false);
  });

  it("does not change chat execution with chat switch alone", () => {
    expect(isArkChatExecutionEnabled({
      ARBOR_ARK_ENABLE_LIVE_EXECUTION: "true",
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: "true",
    })).toBe(false);
  });

  it("requires exact true for all three independent activation switches", () => {
    expect(isArkChatExecutionEnabled({
      ARBOR_ARK_ENABLE_LIVE_EXECUTION: "true",
      ARBOR_ENABLE_ARK_EXECUTION: "true",
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: "true",
    })).toBe(true);
    expect(isArkChatExecutionEnabled({
      ARBOR_ARK_ENABLE_LIVE_EXECUTION: "TRUE",
      ARBOR_ENABLE_ARK_EXECUTION: "true",
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: "true",
    })).toBe(false);
    expect(isArkChatExecutionEnabled({
      ARBOR_ARK_ENABLE_LIVE_EXECUTION: "true",
      ARBOR_ENABLE_ARK_EXECUTION: "TRUE",
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: "true",
    })).toBe(false);
  });

  it("never treats missing or legacy release flags as approval", () => {
    expect(isArkLiveExecutionUnlocked(undefined)).toBe(false);
    expect(isArkLiveExecutionUnlocked("false")).toBe(false);
    expect(isArkLiveExecutionUnlocked("TRUE")).toBe(false);
    expect(isArkLiveExecutionUnlocked("true")).toBe(true);
  });
});
