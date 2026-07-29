import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  supabaseAdmin: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import {
  flushMemoryLogs,
  logMemoryEvent,
} from "@/lib/memory/logger";

describe("memory_pending logger contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.insert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.supabaseAdmin.mockReturnValue({ from: mocks.from });
  });

  afterEach(async () => {
    await flushMemoryLogs();
    vi.useRealTimers();
  });

  it("inserts only verified live columns and redacts private payload fields", async () => {
    await logMemoryEvent("chat_completed", {
      userId: "00000000-0000-4000-8000-000000000001",
      projectId: "00000000-0000-4000-8000-000000000002",
      conversationId: "00000000-0000-4000-8000-000000000003",
      tokenLength: 42,
      success: true,
      text: "private transcript",
      prompt: "private prompt",
      bearerToken: "secret-token",
      summary: "private memory",
    });
    await flushMemoryLogs();

    expect(mocks.from).toHaveBeenCalledWith("memory_pending");
    expect(mocks.insert).toHaveBeenCalledOnce();

    const [rows] = mocks.insert.mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      user_id: "00000000-0000-4000-8000-000000000001",
      project_id: "00000000-0000-4000-8000-000000000002",
      question: "",
      ops: {},
      memory_key: null,
      event_type: "chat_completed",
      payload: {
        level: "info",
        duration_ms: null,
        success: true,
      },
      created_at: expect.any(String),
    });
  });

  it("does not write a global event into user-owned memory_pending", async () => {
    await logMemoryEvent("system_heartbeat", {
      processedProjects: 2,
    });
    await flushMemoryLogs();

    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
