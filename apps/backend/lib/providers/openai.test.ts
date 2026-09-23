import { afterEach, describe, expect, it, vi } from "vitest";
import { openAIClientOptions } from "./openai";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("OpenAI backend request bounds", () => {
  it("imports safely without a model credential but rejects actual model use", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.resetModules();

    const provider = await import("./openai");
    expect(provider.openAIClientOptions({}).maxRetries).toBe(0);
    expect(() => provider.openai.responses).toThrow("OPENAI_API_KEY is required");
  });

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
