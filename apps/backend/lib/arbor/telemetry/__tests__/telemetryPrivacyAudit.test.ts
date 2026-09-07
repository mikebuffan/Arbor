import { describe, expect, it } from "vitest";
import { auditTelemetryPrivacy } from "@/scripts/live_acceptance/telemetryPrivacyAudit";

const safeRow = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  project_id: "33333333-3333-4333-8333-333333333333",
  thread_id: "44444444-4444-4444-8444-444444444444",
  episode_id: null,
  logic_gates_hit: [],
  proof_snapshot: {
    injected_anchor_ids: [],
    injected_memory_item_ids: [],
    safety_tier: "none",
    logic_gates_hit: [],
  },
  retrieval_latency_ms: 42,
  prompt_tokens: 120,
  completion_tokens: 45,
  created_at: "2026-09-02T04:54:53.520Z",
};

describe("live acceptance telemetry privacy audit", () => {
  it("accepts bounded prompt_tokens as a schema field, not raw prompt content", () => {
    expect(auditTelemetryPrivacy(safeRow)).toEqual([]);
  });

  it("rejects raw prompt, message, and content fields", () => {
    expect(
      auditTelemetryPrivacy({
        ...safeRow,
        prompt: "raw system prompt",
        messages: ["private user message"],
        proof_snapshot: {
          ...safeRow.proof_snapshot,
          content: "private assistant content",
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        { path: "prompt", reason: "forbidden_field" },
        { path: "messages", reason: "forbidden_field" },
        {
          path: "proof_snapshot.content",
          reason: "forbidden_field",
        },
      ]),
    );
  });

  it("rejects known private values even under an otherwise allowed field", () => {
    const privateText = "private transcript value";
    expect(
      auditTelemetryPrivacy(
        {
          ...safeRow,
          logic_gates_hit: [privateText],
        },
        [privateText],
      ),
    ).toContainEqual({
      path: "logic_gates_hit[0]",
      reason: "forbidden_value",
    });
  });

  it("does not turn the prompt_tokens exception into a blanket prompt allow", () => {
    expect(
      auditTelemetryPrivacy({
        ...safeRow,
        prompt_token_details: { raw_prompt: "private" },
      }),
    ).toContainEqual({
      path: "prompt_token_details",
      reason: "unexpected_field",
    });
  });
});
