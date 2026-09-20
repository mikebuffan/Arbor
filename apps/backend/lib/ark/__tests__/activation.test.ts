import { describe, expect, it } from "vitest";
import { isArkChatExecutionEnabled } from "../activation";

describe("ARK chat activation isolation", () => {
  it("keeps normal chat execution unchanged when both switches are absent", () => {
    expect(isArkChatExecutionEnabled({})).toBe(false);
  });

  it("does not change chat execution when only the background worker is enabled", () => {
    expect(isArkChatExecutionEnabled({
      ARBOR_ENABLE_ARK_EXECUTION: "true",
    })).toBe(false);
  });

  it("does not change chat execution with chat switch alone", () => {
    expect(isArkChatExecutionEnabled({
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: "true",
    })).toBe(false);
  });

  it("requires exact true for both separate activation switches", () => {
    expect(isArkChatExecutionEnabled({
      ARBOR_ENABLE_ARK_EXECUTION: "true",
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: "true",
    })).toBe(true);
    expect(isArkChatExecutionEnabled({
      ARBOR_ENABLE_ARK_EXECUTION: "TRUE",
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: "true",
    })).toBe(false);
  });
});
