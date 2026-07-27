import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  heartbeat: vi.fn(),
  supabaseAdmin: vi.fn(),
  generateWithOpenAI: vi.fn(),
  debugChatCreate: vi.fn(),
}));

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/system/loop", () => ({
  fireflyHeartbeat: mocks.heartbeat,
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

vi.mock("@/lib/providers/openai", () => ({
  generateWithOpenAI: mocks.generateWithOpenAI,
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mocks.debugChatCreate } };
  },
}));

import {
  GET as heartbeatGet,
  POST as heartbeatPost,
} from "@/app/api/admin/system/heartbeat/route";
import { POST as decayPost } from "@/app/api/admin/memory/decay/route";
import { POST as debugChatPost } from "@/app/api/debug/chat/route";
import { GET as debugOpenAIGet } from "@/app/api/debug/openai/route";

describe("Milestone 1A route security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ARBOR_ADMIN_TOKEN", "admin-secret");
    vi.stubEnv("CRON_SECRET", "machine-secret");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    mocks.requireUser.mockResolvedValue({ userId: "user-1", supabase: {} });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides debug endpoints in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const chat = await debugChatPost(
      new Request("https://arbor.test/api/debug/chat", { method: "POST" }) as never,
    );
    const openai = await debugOpenAIGet(
      new Request("https://arbor.test/api/debug/openai"),
    );

    expect(chat.status).toBe(404);
    expect(openai.status).toBe(404);
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it("requires authentication and admin authorization for development debug access", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.requireUser.mockRejectedValueOnce(
      new RouteAccessError(401, "auth_required"),
    );

    const missingBearer = await debugOpenAIGet(
      new Request("https://arbor.test/api/debug/openai"),
    );
    expect(missingBearer.status).toBe(401);

    const ordinaryUser = await debugOpenAIGet(
      new Request("https://arbor.test/api/debug/openai", {
        headers: { authorization: "Bearer user-token" },
      }),
    );
    expect(ordinaryUser.status).toBe(403);
  });

  it("allows authenticated admin access to both debug endpoints outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.generateWithOpenAI.mockResolvedValue("OpenAI OK");
    mocks.debugChatCreate.mockResolvedValue({
      id: "response-1",
      model: "gpt-5",
      choices: [{ message: { content: "Chat OK" } }],
      usage: null,
    });
    const headers = {
      authorization: "Bearer user-token",
      "x-admin-token": "admin-secret",
    };

    const openai = await debugOpenAIGet(
      new Request("https://arbor.test/api/debug/openai", { headers }),
    );
    const chat = await debugChatPost(
      new Request("https://arbor.test/api/debug/chat", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      }) as never,
    );

    expect(openai.status).toBe(200);
    expect(await openai.json()).toEqual({ ok: true, text: "OpenAI OK" });
    expect(chat.status).toBe(200);
    expect(await chat.json()).toMatchObject({
      ok: true,
      model: "gpt-5",
      reply: "Chat OK",
      raw_id: "response-1",
    });
  });

  it("rejects a GET heartbeat without machine authorization", async () => {
    const response = await heartbeatGet(
      new Request("https://arbor.test/api/admin/system/heartbeat"),
    );

    expect(response.status).toBe(401);
    expect(mocks.heartbeat).not.toHaveBeenCalled();
  });

  it("rejects a GET heartbeat with an invalid machine credential", async () => {
    const response = await heartbeatGet(
      new Request("https://arbor.test/api/admin/system/heartbeat", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.heartbeat).not.toHaveBeenCalled();
  });

  it("allows a valid machine-authenticated GET heartbeat", async () => {
    const response = await heartbeatGet(
      new Request("https://arbor.test/api/admin/system/heartbeat", {
        headers: { authorization: "Bearer machine-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.heartbeat).toHaveBeenCalledOnce();
  });

  it("fails a GET heartbeat closed when machine authentication is unconfigured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await heartbeatGet(
      new Request("https://arbor.test/api/admin/system/heartbeat", {
        headers: { authorization: "Bearer machine-secret" },
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: "machine_auth_not_configured",
    });
    expect(mocks.heartbeat).not.toHaveBeenCalled();
  });

  it("retains secured POST compatibility through the shared heartbeat handler", async () => {
    const response = await heartbeatPost(
      new Request("https://arbor.test/api/admin/system/heartbeat", {
        method: "POST",
        headers: { authorization: "Bearer machine-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.heartbeat).toHaveBeenCalledOnce();
  });

  it("rejects an ordinary authenticated user from global decay", async () => {
    const response = await decayPost(
      new Request("https://arbor.test/api/admin/memory/decay", {
        method: "POST",
        headers: { authorization: "Bearer user-token" },
      }) as never,
    );

    expect(response.status).toBe(403);
    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("allows authenticated admin access to global decay", async () => {
    const query = {
      select: vi.fn(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    query.select.mockReturnValue(query);
    mocks.supabaseAdmin.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });

    const response = await decayPost(
      new Request("https://arbor.test/api/admin/memory/decay", {
        method: "POST",
        headers: {
          authorization: "Bearer user-token",
          "x-admin-token": "admin-secret",
        },
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, processed: 0 });
  });
});
