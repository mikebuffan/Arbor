import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertConversationOwnedByUser,
  assertProjectOwnedByUser,
} from "@/lib/auth/ownership";

function mockSingleResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return {
    query,
    client: {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient,
  };
}

describe("resource ownership", () => {
  it("accepts a project only when both project and authenticated user match", async () => {
    const { client, query } = mockSingleResult({ id: "project-a" });

    await expect(
      assertProjectOwnedByUser(client, "user-a", "project-a"),
    ).resolves.toBeUndefined();
    expect(query.eq).toHaveBeenCalledWith("id", "project-a");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
  });

  it("returns 404 semantics for a foreign project", async () => {
    const { client } = mockSingleResult(null);

    await expect(
      assertProjectOwnedByUser(client, "user-a", "project-b"),
    ).rejects.toMatchObject({ status: 404, code: "project_not_found" });
  });

  it("checks conversation ownership independently under the requested project", async () => {
    const { client, query } = mockSingleResult({ id: "conversation-a" });

    await expect(
      assertConversationOwnedByUser({
        supabase: client,
        userId: "user-a",
        projectId: "project-a",
        conversationId: "conversation-a",
      }),
    ).resolves.toBeUndefined();
    expect(query.eq).toHaveBeenCalledWith("id", "conversation-a");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(query.eq).toHaveBeenCalledWith("project_id", "project-a");
  });

  it("returns 404 semantics for a foreign conversation", async () => {
    const { client } = mockSingleResult(null);

    await expect(
      assertConversationOwnedByUser({
        supabase: client,
        userId: "user-a",
        projectId: "project-a",
        conversationId: "conversation-b",
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: "conversation_not_found",
    });
  });
});
