import { describe, expect, it } from "vitest";
import { openAIClientOptions } from "./openai";

describe("OpenAI backend request bounds", () => {
  it("uses a bounded default request timeout and disables hidden SDK retries", () => {
    expect(openAIClientOptions({})).toEqual({
      timeout: 45_000,
      maxRetries: 0,
    });
  });

  it("allows an explicit positive timeout override", () => {
    expect(
      openAIClientOptions({
        ARBOR_OPENAI_TIMEOUT_MS: "30000",
      }),
    ).toEqual({
      timeout: 30_000,
      maxRetries: 0,
    });
  });

  it("rejects invalid timeout overrides", () => {
    expect(
      openAIClientOptions({
        ARBOR_OPENAI_TIMEOUT_MS: "-1",
      }),
    ).toEqual({
      timeout: 45_000,
      maxRetries: 0,
    });
  });
});
