import {beforeEach, describe, expect, it, vi} from "vitest";
import {RouteAccessError} from "@/lib/auth/routeAuthorization";
const mocks = vi.hoisted(() => ({
  client: {auth: {getUser: vi.fn()}, from: vi.fn()},
  project: vi.fn(),
  conversation: vi.fn(),
}));
vi.mock("@/lib/supabase/bearer", () => ({supabaseFromAuthHeader: () => mocks.client}));
vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.project,
  assertConversationOwnedByUser: mocks.conversation,
}));
vi.mock("@/lib/memory/store", () => ({upsertMemoryItems: vi.fn()}));
import {GET} from "@/app/api/memory/items/route";

const P = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const C = "00000000-0000-4000-8000-000000000003";
const C2 = "00000000-0000-4000-8000-000000000004";
const MID = (n: number) => "00000000-0000-4000-8000-" + n.toString(16).padStart(12, "0");

function harness(rows: Record<string, unknown>[], error: unknown = null) {
  const q: Record<string, any> = {};
  for (const method of ["select", "eq", "is", "neq", "order", "limit", "or"]) q[method] = vi.fn(() => q);
  q.then = (resolve: (value: unknown) => unknown) => Promise.resolve({data: rows, error}).then(resolve);
  mocks.client.from.mockReturnValue(q);
  return q;
}
function entry(n: number) {
  return {id: MID(n), updated_at: "2026-10-07T20:00:00.123456+00:00", key: "example", value: {text: "synthetic"}};
}
function call(query = "") {
  return GET(new Request("https://arbor.test/api/memory/items?view=shelf&projectId=" + P + query) as never);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.auth.getUser.mockResolvedValue({data: {user: {id: "owner-a"}}, error: null});
  mocks.project.mockResolvedValue(undefined);
  mocks.conversation.mockResolvedValue(undefined);
});

describe("owner-only paged Grove memory shelf read", () => {
  it("denies missing project, discarded override and malformed conversation before reading data", async () => {
    expect((await GET(new Request("https://arbor.test/api/memory/items?view=shelf") as never)).status).toBe(400);
    expect((await call("&includeDiscarded=true")).status).toBe(400);
    expect((await call("&conversationId=bad,inject")).status).toBe(400);
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
  it("enforces owner/project and conversation checks before memory query", async () => {
    mocks.project.mockRejectedValueOnce(new RouteAccessError(404, "project_not_found"));
    expect((await call()).status).toBe(404);
    expect(mocks.client.from).not.toHaveBeenCalled();
    mocks.conversation.mockRejectedValueOnce(new RouteAccessError(404, "conversation_not_found"));
    expect((await call("&conversationId=" + C)).status).toBe(404);
    expect(mocks.conversation).toHaveBeenCalledWith(expect.objectContaining({userId: "owner-a", projectId: P, conversationId: C}));
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
  it("applies all reveal/scope constraints before page limit", async () => {
    const q = harness([entry(1)]);
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).nextCursor).toBeNull();
    expect(q.eq).toHaveBeenCalledWith("user_id", "owner-a");
    expect(q.eq).toHaveBeenCalledWith("project_id", P);
    expect(q.eq).toHaveBeenCalledWith("excluded_from_memory", false);
    expect(q.eq).toHaveBeenCalledWith("user_trigger_only", false);
    expect(q.eq).toHaveBeenCalledWith("status", "active");
    expect(q.neq).toHaveBeenCalledWith("tier", "sensitive");
    expect(q.is).toHaveBeenCalledWith("deleted_at", null);
    expect(q.is).toHaveBeenCalledWith("conversation_id", null);
    expect(q.eq).toHaveBeenCalledWith("scope", "project");
    expect(q.limit).toHaveBeenCalledWith(101);
    expect(q.order.mock.calls).toContainEqual(["updated_at", {ascending: false}]);
    expect(q.order.mock.calls).toContainEqual(["id", {ascending: false}]);
  });
  it("paginates 100+1 in stable timestamp/id order without mixing owner or project cursors", async () => {
    harness(Array.from({length: 101}, (_, i) => entry(i + 1)));
    const initial = await call();
    expect(initial.status).toBe(200);
    const body = await initial.json();
    expect(body.items).toHaveLength(100);
    expect(typeof body.nextCursor).toBe("string");
    const q = harness([entry(101)]);
    expect((await call("&after=" + body.nextCursor)).status).toBe(200);
    expect(q.or.mock.calls[0][0]).toContain("updated_at.eq.2026-10-07T20:00:00.123456+00:00");
    expect(q.or.mock.calls[0][0]).toContain("id.lt." + MID(100));
    expect((await call("&after=" + Buffer.from(JSON.stringify({v:1,u:"foreign",p:P,c:null,t:"2026-10-07T20:00:00Z",id:MID(1)})).toString("base64url"))).status).toBe(400);
    expect((await GET(new Request("https://arbor.test/api/memory/items?view=shelf&projectId=" + OTHER + "&after=" + body.nextCursor) as never)).status).toBe(400);
    expect((await call("&conversationId=" + C + "&after=" + body.nextCursor)).status).toBe(400);
  });
  it("includes only matching selected conversation in its SQL scope and cursor", async () => {
    const q = harness([entry(1)]);
    const response = await call("&conversationId=" + C);
    expect(response.status).toBe(200);
    expect(q.or.mock.calls[0][0]).toContain("conversation_id.eq." + C);
    expect(q.or.mock.calls[0][0]).toContain("scope.eq.project,conversation_id.is.null");
    expect(q.or.mock.calls[0][0]).not.toContain(C2);
  });
  it("fails closed on unpageable rows, unsupported view and missing owner", async () => {
    harness([...Array.from({length: 100}, (_, i) => entry(i + 1)), {...entry(101), updated_at: null}]);
    // 100th row is page cursor; the 101st row is not returned as source content.
    expect((await call()).status).toBe(200);
    harness([...Array.from({length: 99}, (_, i) => entry(i + 1)), {...entry(100), updated_at: null}, entry(101)]);
    expect((await call()).status).toBe(500);
    expect((await GET(new Request("https://arbor.test/api/memory/items?view=unapproved") as never)).status).toBe(400);
    mocks.client.auth.getUser.mockResolvedValueOnce({data: {user: null}, error: null});
    expect((await call()).status).toBe(401);
  });
  it("does not leak database error messages from shelf read", async () => {
    harness([], {message: "synthetic-secret"});
    const response = await call();
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("synthetic-secret");
  });
});
