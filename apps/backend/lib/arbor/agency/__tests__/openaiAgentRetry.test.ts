import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("@/lib/providers/openai", () => ({
  openai: { responses: { create: mocks.create } },
}));

import { runOpenAIAgencyAgent } from "@/lib/arbor/agency/openaiAgent";

const tools = {
  openAIToolDefinitions: () => [],
  get: vi.fn(),
};

const input = {
  instructions: "Synthetic system instruction.",
  goal: "Answer the synthetic question.",
  messages: [{ role: "user" as const, content: "Synthetic question." }],
  tools: tools as never,
  context: {
    userId: "00000000-0000-4000-8000-000000000001",
    projectId: "00000000-0000-4000-8000-000000000002",
    conversationId: "00000000-0000-4000-8000-000000000003",
    turnId: "00000000-0000-4000-8000-000000000004",
  },
  verifyCompletion: false,
};

describe("OpenAI agency request retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries a provider throttle and returns the successful response", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.create
      .mockRejectedValueOnce(
        Object.assign(new Error("SENTINEL_PRIVATE_PROVIDER_BODY"), {
          status: 429,
          code: "SENTINEL_PRIVATE_CODE",
        }),
      )
      .mockResolvedValueOnce({
        id: "response-1",
        output: [],
        output_text: "Synthetic answer.",
      });

    const pending = runOpenAIAgencyAgent(input);
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual({
      status: "complete",
      text: "Synthetic answer.",
      responseId: "response-1",
      toolCalls: 0,
    });
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith("[agency] model request retrying", {
      subsystem: "chat",
      operation: "model_agency",
      code: "provider_rate_limited",
      attempt: 1,
      maxAttempts: 5,
      nextDelayMs: 2_000,
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("SENTINEL_PRIVATE");
    warn.mockRestore();
  });

  it("does not retry a non-retryable provider request rejection", async () => {
    const error = Object.assign(new Error("invalid request"), { status: 400 });
    mocks.create.mockRejectedValue(error);

    await expect(runOpenAIAgencyAgent(input)).rejects.toBe(error);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("bounds retries and rethrows the final provider failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = Object.assign(new Error("rate limited"), { status: 429 });
    mocks.create.mockRejectedValue(error);

    const pending = runOpenAIAgencyAgent(input);
    const rejection = expect(pending).rejects.toBe(error);
    await vi.runAllTimersAsync();
    await rejection;

    expect(mocks.create).toHaveBeenCalledTimes(5);
    expect(warn).toHaveBeenCalledTimes(4);
    warn.mockRestore();
  });

  it("honors bounded provider reset guidance without logging header values", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const headers = new Headers({
      "x-ratelimit-reset-requests": "4s",
      "x-ratelimit-reset-tokens": "SENTINEL_PRIVATE_RESET",
    });
    mocks.create
      .mockRejectedValueOnce(
        Object.assign(new Error("rate limited"), { status: 429, headers }),
      )
      .mockResolvedValueOnce({
        id: "response-reset",
        output: [],
        output_text: "Synthetic answer.",
      });

    const pending = runOpenAIAgencyAgent(input);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({
      status: "complete",
      responseId: "response-reset",
    });

    expect(warn).toHaveBeenCalledWith(
      "[agency] model request retrying",
      expect.objectContaining({ nextDelayMs: 4_250 }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("SENTINEL_PRIVATE");
    warn.mockRestore();
  });
});
