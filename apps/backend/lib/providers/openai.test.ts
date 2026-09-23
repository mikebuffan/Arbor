import { afterEach, describe, expect, it, vi } from "vitest";
import { openAIClientOptions, openai } from "./openai";

afterEach(() => vi.unstubAllEnvs());

describe("legacy OpenAI SDK is lazy for independent Grove builds", () => {
  it("does not construct the client on module import; fails closed on use without key", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(() => openAIClientOptions({})).not.toThrow();
    expect(() => openai.chat).toThrow("OPENAI_API_KEY is required");
    expect(() => openai.embeddings).toThrow("OPENAI_API_KEY is required");
  });

  it("constructs legacy client only when used with an explicitly configured key", () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic-not-a-real-key");
    expect(() => openai.chat).not.toThrow();
  });
});

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
