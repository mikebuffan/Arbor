import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const mocks = vi.hoisted(() => ({
  userClient: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
  upsertMemoryItems: vi.fn(),
  assertProjectOwnedByUser: vi.fn(),
}));

vi.mock("@/lib/supabase/bearer", () => ({
  supabaseFromAuthHeader: vi.fn(() => mocks.userClient),
}));

vi.mock("@/lib/memory/store", () => ({
  upsertMemoryItems: mocks.upsertMemoryItems,
}));

vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.assertProjectOwnedByUser,
}));

import { PATCH as patchMemoryItem } from "@/app/api/memory/item/[id]/route";
import {
  GET as listMemoryItems,
  POST as createMemoryItem,
} from "@/app/api/memory/items/route";

describe("memory route ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });
    mocks.upsertMemoryItems.mockResolvedValue({
      created: ["shared-key"],
      updated: [],
      locked: [],
      ignored: [],
    });
  });

  it("returns 404 when an admin-backed item mutation cannot find an owned row", async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    mocks.userClient.from.mockReturnValue(query);

    const response = await patchMemoryItem(
      new Request("https://arbor.test/api/memory/item/foreign", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "pin", pinned: true }),
      }) as never,
      { params: Promise.resolve({ id: "foreign-memory-id" }) },
    );

    expect(response.status).toBe(404);
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
  });

  it("returns 404 before listing memory for a foreign project", async () => {
    mocks.assertProjectOwnedByUser.mockRejectedValueOnce(
      new RouteAccessError(404, "project_not_found"),
    );

    const response = await listMemoryItems(
      new Request(
        "https://arbor.test/api/memory/items?projectId=00000000-0000-4000-8000-000000000002",
      ) as never,
    );

    expect(response.status).toBe(404);
    expect(mocks.userClient.from).not.toHaveBeenCalled();
  });

  it("derives memory ownership from authentication instead of request input", async () => {
    const response = await createMemoryItem(
      new Request("https://arbor.test/api/memory/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: "shared-key",
          value: { text: "safe value" },
          user_id: "user-b",
        }),
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(mocks.upsertMemoryItems).toHaveBeenCalledWith(
      "user-a",
      [expect.objectContaining({ key: "shared-key" })],
      null,
      mocks.userClient,
    );
  });
});
