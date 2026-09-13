import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  setAttribute: vi.fn(),
  setStatus: vi.fn(),
  startSpan: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
  startSpan: mocks.startSpan,
}));

import {
  classifyChatSynchronousFailure,
  reportChatSynchronousFailure,
} from "@/lib/chat/synchronousDiagnostics";

describe("chat synchronous diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.startSpan.mockImplementation((_options, callback) =>
      callback({
        setAttribute: mocks.setAttribute,
        setStatus: mocks.setStatus,
      }),
    );
  });

  it("classifies allowlisted provider failures without exporting raw payloads", () => {
    expect(
      classifyChatSynchronousFailure("model_agency", {
        status: 400,
        code: "untrusted_provider_code",
        message: "SENTINEL_PRIVATE_PROMPT",
        response: { body: "SENTINEL_PRIVATE_RESPONSE" },
      }),
    ).toEqual({
      subsystem: "chat",
      stage: "model_agency",
      category: "provider",
      code: "provider_request_rejected",
      status: 400,
    });
  });

  it("classifies provider SDK connection failures without raw provider text", () => {
    expect(
      classifyChatSynchronousFailure("model_agency", {
        name: "APIConnectionError",
        message: "SENTINEL_PRIVATE_PROVIDER_DETAIL",
      }),
    ).toEqual({
      subsystem: "chat",
      stage: "model_agency",
      category: "provider",
      code: "provider_connection_failed",
      status: null,
    });
  });

  it("classifies known local agency failures as application failures", () => {
    expect(
      classifyChatSynchronousFailure(
        "model_agency",
        new Error("agency_tool_arguments_invalid"),
      ),
    ).toEqual({
      subsystem: "chat",
      stage: "model_agency",
      category: "application",
      code: "agency_tool_arguments_invalid",
      status: null,
    });
  });

  it("classifies safe database failures without exporting raw payloads", () => {
    expect(
      classifyChatSynchronousFailure("agency_finalize", {
        code: "23514",
        message: "SENTINEL_PRIVATE_DATABASE_DETAIL",
      }),
    ).toEqual({
      subsystem: "chat",
      stage: "agency_finalize",
      category: "database",
      code: "check_violation",
      status: null,
    });
  });

  it("keeps sentinel exception data out of console, Sentry, and span metadata", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sentinel = "SENTINEL_SECRET_AUTH_PROMPT_CONTENT";

    reportChatSynchronousFailure({
      stage: "model_agency",
      error: Object.assign(new Error(sentinel), {
        status: 500,
        code: "untrusted_private_code",
        stack: sentinel,
        payload: { authorization: sentinel },
      }),
    });

    expect(warn).toHaveBeenCalledWith("[chat] synchronous request failed", {
      subsystem: "chat",
      stage: "model_agency",
      category: "provider",
      code: "provider_unavailable",
      status: 500,
    });
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "chat_synchronous_failure",
      expect.objectContaining({
        tags: expect.objectContaining({
          subsystem: "chat",
          stage: "model_agency",
          error_category: "provider",
          error_code: "provider_unavailable",
          error_status: "500",
        }),
      }),
    );
    expect(mocks.setAttribute).toHaveBeenCalled();
    expect(
      JSON.stringify([
        warn.mock.calls,
        mocks.captureMessage.mock.calls,
        mocks.startSpan.mock.calls,
        mocks.setAttribute.mock.calls,
        mocks.setStatus.mock.calls,
      ]),
    ).not.toContain(sentinel);
    warn.mockRestore();
  });

  it("wires the model stage before invocation and reports the final fixed stage", () => {
    const route = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/chat/route.ts"),
      "utf8",
    );
    const modelStage = route.indexOf('stage = "model_agency"');
    const modelInvocation = route.indexOf("await runOpenAIAgencyAgent({");

    expect(modelStage).toBeGreaterThan(-1);
    expect(modelInvocation).toBeGreaterThan(modelStage);
    expect(route).toContain(
      "reportChatSynchronousFailure({ stage, error });",
    );
  });
});
