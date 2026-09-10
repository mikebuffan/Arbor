import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  from: vi.fn(),
  supabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import { buildTelemetry } from "@/lib/arbor/telemetry/buildTelemetry";

const payload = {
  traceId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  projectId: "33333333-3333-4333-8333-333333333333",
  threadId: "44444444-4444-4444-8444-444444444444",
  episodeId: "55555555-5555-4555-8555-555555555555",
  retrievalLatencyMs: 37,
  logicGatesHit: ["safety_preface"],
};

describe("bounded telemetry writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.supabaseAdmin.mockReturnValue({ from: mocks.from });
  });

  it("uses the server writer and persists only allowlisted proof fields", async () => {
    mocks.insert.mockResolvedValue({ error: null });

    const result = await buildTelemetry(payload, {
      injected_anchor_ids: ["66666666-6666-4666-8666-666666666666"],
      injected_memory_item_ids: ["77777777-7777-4777-8777-777777777777"],
      safety_tier: "low",
      logic_gates_hit: ["safe_gate"],
      memory_debug: [{ key: "private-memory-value" }],
      prompt: "private prompt",
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.supabaseAdmin).toHaveBeenCalledTimes(1);
    const inserted = mocks.insert.mock.calls[0][0];
    expect(inserted.proof_snapshot).toEqual({
      injected_anchor_ids: ["66666666-6666-4666-8666-666666666666"],
      injected_memory_item_ids: ["77777777-7777-4777-8777-777777777777"],
      safety_tier: "low",
      logic_gates_hit: ["safe_gate"],
    });
    expect(JSON.stringify(inserted)).not.toContain("private-memory-value");
    expect(JSON.stringify(inserted)).not.toContain("private prompt");
  });

  it("keeps telemetry failure non-fatal, observable, and redacted", async () => {
    mocks.insert.mockResolvedValue({
      error: {
        code: "42501",
        message: "private prompt and authorization token must not escape",
        details: { memory: "private memory" },
      },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await buildTelemetry(payload, {});

    expect(result).toEqual({ ok: false, code: "42501" });
    expect(warn).toHaveBeenCalledWith(
      "[telemetry] write failed",
      expect.objectContaining({
        subsystem: "telemetry",
        operation: "trace_logs_insert",
        code: "42501",
      }),
    );
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain("private prompt");
    expect(logged).not.toContain("authorization token");
    expect(logged).not.toContain("private memory");
    warn.mockRestore();
  });

  it("runs telemetry behind the supported post-response lifecycle boundary", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/chat/route.ts"),
      "utf8",
    );

    expect(source).toContain("scheduleChatPostResponseWork({");
    expect(source).toContain("telemetry: async () =>");
    expect(source).toContain("await buildTelemetry(");
    expect(source).not.toContain("runBg(");
  });
});
