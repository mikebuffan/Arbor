import { describe, expect, it, vi } from "vitest";
import {
  ArborLMUnavailable,
  generateWithArborLM,
  publicModelConfig,
} from "../arborLM";

const config = {
  url: "https://inference.example.test/generate",
  token: "not-a-real-token",
  model: "arbor-lm-v0.3",
  timeoutMs: 30000,
};
const messages = [{ role: "user" as const, content: "Hi Arbor." }];

describe("public Arbor LM inference adapter", () => {
  it("rejects an unconfigured endpoint and plaintext transport", () => {
    expect(() => publicModelConfig({})).toThrowError(ArborLMUnavailable);
    expect(() => publicModelConfig({
      ARBOR_LM_INFERENCE_URL: "http://localhost:8000/generate",
      ARBOR_LM_INFERENCE_TOKEN: "test-token",
    })).toThrowError(ArborLMUnavailable);
  });

  it("requires a server token and a bounded timeout", () => {
    expect(() => publicModelConfig({
      ARBOR_LM_INFERENCE_URL: config.url,
    })).toThrowError(ArborLMUnavailable);
    expect(() => publicModelConfig({
      ARBOR_LM_INFERENCE_URL: config.url,
      ARBOR_LM_INFERENCE_TOKEN: config.token,
      ARBOR_LM_TIMEOUT_MS: "1000000",
    })).toThrowError(ArborLMUnavailable);
  });

  it("accepts a reply from the configured model", async () => {
    const request = vi.fn(async () => new Response(
      JSON.stringify({
        model: config.model,
        assistantText: "Hi. I'm here.",
      }),
      { status: 200 },
    ));
    await expect(generateWithArborLM(
      messages, config, request as typeof fetch,
    )).resolves.toBe("Hi. I'm here.");
    const [, options] = request.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(options.headers).toMatchObject({
      authorization: "Bearer " + config.token,
    });
    expect(JSON.parse(String(options.body)).model).toBe(config.model);
  });

  it("never synthesizes a reply on provider failure", async () => {
    const request = vi.fn(async () => new Response("bad gateway", {
      status: 502,
    }));
    await expect(generateWithArborLM(
      messages, config, request as typeof fetch,
    )).rejects.toMatchObject({
      code: "model_unavailable",
      httpStatus: 503,
    });
  });

  it("rejects blank, malformed and wrong-model success payloads", async () => {
    for (const body of [
      { model: config.model, assistantText: "  " },
      { model: "openai-fallback", assistantText: "Hello" },
      { model: config.model, choices: [{ text: "Hello" }] },
    ]) {
      const request = vi.fn(async () =>
        new Response(JSON.stringify(body), { status: 200 }));
      await expect(generateWithArborLM(
        messages, config, request as typeof fetch,
      )).rejects.toMatchObject({ code: "model_bad_response" });
    }
  });

  it("maps a provider 413 to context overflow", async () => {
    const request = vi.fn(async () => new Response("too long", { status: 413 }));
    await expect(generateWithArborLM(messages, config,
      request as typeof fetch)).rejects.toMatchObject({
        code: "model_context_too_long", httpStatus: 422,
      });
  });

  it("reports timeouts separately", async () => {
    const request = vi.fn(async () => {
      const error = new Error("Timed out");
      error.name = "TimeoutError";
      throw error;
    });
    await expect(generateWithArborLM(
      messages, config, request as typeof fetch,
    )).rejects.toMatchObject({
      code: "model_timeout",
      httpStatus: 504,
    });
  });
});
