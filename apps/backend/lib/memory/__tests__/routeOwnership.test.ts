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
  correctMemoryItem: vi.fn(),
}));

vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.assertProjectOwnedByUser,
}));

import { PATCH as patchMemoryItem } from "@/app/api/memory/item/[id]/route";
import { POST as confirmMemory } from "@/app/api/memory/confirm/route";
import { POST as deleteMemoryItem } from "@/app/api/memory/delete/route";
import {
  GET as listMemoryItems,
  POST as createMemoryItem,
} from "@/app/api/memory/items/route";

describe("memory route ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userClient.from.mockReset();
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

  it.each(["read", "write"])("redacts private database errors during memory deletion: %s", async (stage) => {
    const privateError = { message: "synthetic-private-storage-detail" };
    const read: Record<string, any> = {};
    for (const method of ["select", "eq", "is"]) read[method] = vi.fn(() => read);
    read.then = (resolve: (value: unknown) => unknown) => Promise.resolve({
      data: stage === "read" ? null : [{ id: "00000000-0000-4000-8000-000000000099", locked: false }],
      error: stage === "read" ? privateError : null,
    }).then(resolve);
    const write: Record<string, any> = {};
    for (const method of ["update", "in", "eq", "is", "select"]) write[method] = vi.fn(() => write);
    write.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: privateError }).then(resolve);
    mocks.userClient.from.mockReturnValueOnce(read).mockReturnValueOnce(write);
    const response = await deleteMemoryItem(new Request("https://arbor.test/api/memory/delete", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ memoryId: "00000000-0000-4000-8000-000000000099" }),
    }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "server_error" });
    expect(read.eq).toHaveBeenCalledWith("user_id", "user-a");
    if (stage === "read") expect(write.update).not.toHaveBeenCalled();
  });

  it.each(["read", "delete"])("redacts private confirmation errors: %s", async (stage) => {
    const privateError = { message: "synthetic-private-storage-detail" };
    const read: Record<string, any> = {};
    for (const method of ["select", "eq", "is", "neq", "order", "limit"]) read[method] = vi.fn(() => read);
    read.then = (resolve: (value: unknown) => unknown) => Promise.resolve({
      data: stage === "read" ? null : [{ id: "pending", user_id: "user-a", project_id: null,
        question: "Save this?", ops: [{ key: "preference", value: "synthetic" }], event_type: null,
        created_at: "2026-10-09T18:00:00Z" }], error: stage === "read" ? privateError : null }).then(resolve);
    const write: Record<string, any> = {};
    for (const method of ["delete", "eq", "is"]) write[method] = vi.fn(() => write);
    write.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ error: privateError }).then(resolve);
    mocks.userClient.from.mockReturnValueOnce(read).mockReturnValueOnce(write);
    const response = await confirmMemory(new Request("https://arbor.test/api/memory/confirm", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "no" }),
    }) as never);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "server_error" });
    expect(read.eq).toHaveBeenCalledWith("user_id", "user-a");
    if (stage === "read") expect(write.delete).not.toHaveBeenCalled();
    else expect(write.eq).toHaveBeenCalledWith("user_id", "user-a");
  });

  it.each(["pin", "discard", "confirmFact"])("redacts private item mutation errors: %s", async (action) => {
    const query: Record<string, any> = {};
    for (const method of ["update", "eq", "select"]) query[method] = vi.fn(() => query);
    query.maybeSingle = vi.fn().mockResolvedValue({ data: null,
      error: { message: "synthetic-private-storage-detail" } });
    mocks.userClient.from.mockReturnValue(query);
    const response = await patchMemoryItem(new Request("https://arbor.test/api/memory/item/owned", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, pinned: true }),
    }) as never, { params: Promise.resolve({ id: "owned" }) });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "server_error" });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
  });

  it("redacts private database errors in owner review", async () => {
    const query: Record<string, any> = {};
    for (const method of ["select", "eq", "is", "order", "limit"]) query[method] = vi.fn(() => query);
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null,
      error: { message: "synthetic-private-storage-detail" } }).then(resolve);
    mocks.userClient.from.mockReturnValue(query);
    const response = await listMemoryItems(new Request("https://arbor.test/api/memory/items") as never);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "server_error" });
  });

  it.each([0, 1, 2])("reports only confirmed deletion outcomes when %s of 2 selected rows change", async (changed) => {
    const ids = ["00000000-0000-4000-8000-000000000098", "00000000-0000-4000-8000-000000000099"];
    const read: Record<string, any> = {};
    for (const method of ["select", "eq", "is"]) read[method] = vi.fn(() => read);
    read.then = (resolve: (value: unknown) => unknown) => Promise.resolve({
      data: ids.map(id => ({ id, locked: false })), error: null }).then(resolve);
    const write: Record<string, any> = {};
    for (const method of ["update", "in", "eq", "is", "select"]) write[method] = vi.fn(() => write);
    write.then = (resolve: (value: unknown) => unknown) => Promise.resolve({
      data: ids.slice(0, changed).map(id => ({ id })), error: null }).then(resolve);
    mocks.userClient.from.mockReturnValueOnce(read).mockReturnValueOnce(write);
    const response = await deleteMemoryItem(new Request("https://arbor.test/api/memory/delete", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "shared-key", projectId: "00000000-0000-4000-8000-000000000002" }),
    }));
    expect(response.status).toBe(changed === 2 ? 200 : 409);
    expect(await response.json()).toEqual(changed === 2
      ? { ok: true, deletedCount: 2, ids }
      : { ok: false, error: "memory_changed_during_delete" });
    expect(write.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(write.eq).toHaveBeenCalledWith("project_id", "00000000-0000-4000-8000-000000000002");
    expect(write.eq).toHaveBeenCalledWith("locked", false);
    expect(write.is).toHaveBeenCalledWith("deleted_at", null);
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

  it("filters excluded memories before the default listing limit", async () => {
    const query: Record<string, any> = {};
    for (const method of ["select", "eq", "is", "order", "limit"]) {
      query[method] = vi.fn(() => query);
    }
    query.then = (resolve: (value: unknown) => void) =>
      Promise.resolve({ data: [{ id: "visible" }], error: null }).then(resolve);
    mocks.userClient.from.mockReturnValue(query);

    const response = await listMemoryItems(
      new Request("https://arbor.test/api/memory/items?projectId=project-a") as never,
    );
    expect(response.status).toBe(200);
    expect(query.select.mock.calls[0][0]).toContain("excluded_from_memory");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(query.eq).toHaveBeenCalledWith("project_id", "project-a");
    expect(query.eq).toHaveBeenCalledWith("excluded_from_memory", false);
    expect(query.limit).toHaveBeenCalledWith(500);
  });

  it("preserves owner-authorized discarded review without default reveal", async () => {
    const query: Record<string, any> = {};
    for (const method of ["select", "eq", "is", "order", "limit"]) {
      query[method] = vi.fn(() => query);
    }
    query.then = (resolve: (value: unknown) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    mocks.userClient.from.mockReturnValue(query);

    const response = await listMemoryItems(
      new Request("https://arbor.test/api/memory/items?includeDiscarded=true") as never,
    );
    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(query.eq).not.toHaveBeenCalledWith("excluded_from_memory", false);
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
