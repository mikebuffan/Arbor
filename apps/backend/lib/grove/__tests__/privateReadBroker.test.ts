import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  assertProjectOwnedByUser: vi.fn(),
  assertConversationOwnedByUser: vi.fn(),
  readArkProjectSnapshot: vi.fn(),
  getUser: vi.fn(),
  clients: [] as Array<{ url: string; key: string; options: unknown }>,
  lookup: new Map<string, { data: unknown; error: unknown }>(),
  fromCalls: [] as string[],
  queryFilters: [] as Array<{ table: string; key: string; value: unknown }>,
  queryOrders: [] as Array<{ table: string; key: string; ascending: boolean }>,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.assertProjectOwnedByUser,
  assertConversationOwnedByUser: mocks.assertConversationOwnedByUser,
}));
vi.mock("@/lib/ark/readModel", () => ({
  readArkProjectSnapshot: mocks.readArkProjectSnapshot,
}));

import {
  groveTokenClaimsMatch,
  privateGroveReadConfig,
  readPrivateGroveArk,
  readPrivateGroveProjects,
  readPrivateGroveConversations,
  authorizePrivateGroveConversation,
} from "@/lib/grove/privateReadBroker";
import { GET } from "@/app/api/grove/ark/status/route";
import { GET as GET_PROJECTS } from "@/app/api/grove/ark/projects/route";

const groveUrl = "https://fqjqpuaoifgbweiguacf.supabase.co";
const fireflyUrl = "https://ncpdlyakrzfvobmwzbon.supabase.co";
const origin = "https://grove-private.example.org";
const groveOwner = "00000000-0000-4000-8000-000000000001";
const fireflyOwner = "00000000-0000-4000-8000-000000000002";
const projectId = "00000000-0000-4000-8000-000000000003";
const conversationId = "00000000-0000-4000-8000-000000000004";
const now = Math.floor(Date.now() / 1000);

function jwt(changes: Record<string, unknown> = {}) {
  const header = Buffer.from(JSON.stringify({ alg: "ES256" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: `${groveUrl}/auth/v1`,
    aud: "authenticated",
    role: "authenticated",
    sub: groveOwner,
    exp: now + 3600,
    ...changes,
  })).toString("base64url");
  return `${header}.${payload}.synthetic-not-a-signature`;
}

function req(token: string | null = jwt(), id = projectId, at = origin) {
  return new Request(`${at}/api/grove/ark/status?projectId=${id}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function query(table: string) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(async () => mocks.lookup.get(table) ?? {
      data: null, error: null,
    }),
    limit: vi.fn(async () => mocks.lookup.get(table + ":list") ?? {
      data: [], error: null,
    }),
  };
  q.select.mockReturnValue(q);
  q.eq.mockImplementation((key: string, value: unknown) => {
    mocks.queryFilters.push({ table, key, value });
    return q;
  });
  q.is.mockReturnValue(q);
  q.order.mockImplementation((key: string, options: {ascending: boolean}) => {
    mocks.queryOrders.push({table, key, ascending: options.ascending});
    return q;
  });
  return q;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.clients.length = 0;
  mocks.fromCalls.length = 0;
  mocks.queryFilters.length = 0;
  mocks.queryOrders.length = 0;
  mocks.lookup.clear();
  vi.stubEnv("GROVE_API_ENABLED", "true");
  vi.stubEnv("GROVE_SUPABASE_URL", groveUrl);
  vi.stubEnv("GROVE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_grove_test");
  vi.stubEnv("GROVE_SERVICE_ROLE_KEY", "grove-private-server-test-key");
  vi.stubEnv("GROVE_FIREFLY_SUPABASE_URL", fireflyUrl);
  vi.stubEnv("GROVE_FIREFLY_SERVICE_ROLE_KEY", "firefly-private-server-test-key");
  vi.stubEnv("GROVE_PUBLIC_API_ORIGIN", origin);
  mocks.createClient.mockImplementation((url, key, options) => {
    mocks.clients.push({ url, key, options });
    return {
      auth: { getUser: mocks.getUser },
      from: (table: string) => {
        mocks.fromCalls.push(table);
        return query(table);
      },
    };
  });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: groveOwner } }, error: null,
  });
  mocks.lookup.set("grove_private_owner_access", {
    data: { user_id: groveOwner, revoked_at: null }, error: null,
  });
  mocks.lookup.set("grove_private_firefly_bridge", {
    data: { grove_user_id: groveOwner, firefly_user_id: fireflyOwner },
    error: null,
  });
  mocks.lookup.set("grove_private_ark_project_grants", {
    data: { grove_user_id: groveOwner, firefly_project_id: projectId },
    error: null,
  });
  mocks.assertProjectOwnedByUser.mockResolvedValue(undefined);
  mocks.assertConversationOwnedByUser.mockResolvedValue(undefined);
  mocks.readArkProjectSnapshot.mockResolvedValue({
    available: true, objectives: [], tasks: [],
    checkpoints: [], events: [], capturedAt: "2026-09-22T04:00:00Z",
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("private Grove provider and token boundaries", () => {
  it("requires explicit private deployment enablement", () => {
    vi.stubEnv("GROVE_API_ENABLED", "");
    expect(() => privateGroveReadConfig()).toThrowError("grove_api_not_enabled");
  });

  it("rejects existing Firefly realm in place of Grove", () => {
    vi.stubEnv("GROVE_SUPABASE_URL", fireflyUrl);
    expect(() => privateGroveReadConfig()).toThrowError("grove_api_not_configured");
  });

  it("rejects unknown Firefly realm in the cross-provider bridge", () => {
    vi.stubEnv("GROVE_FIREFLY_SUPABASE_URL", "https://another.supabase.co");
    expect(() => privateGroveReadConfig()).toThrowError("grove_api_not_configured");
  });

  it("rejects unconfigured service keys and old Firefly API domain", () => {
    vi.stubEnv("GROVE_SERVICE_ROLE_KEY", "");
    expect(() => privateGroveReadConfig()).toThrowError("grove_api_not_configured");
    vi.stubEnv("GROVE_SERVICE_ROLE_KEY", "grove-private-server-test-key");
    vi.stubEnv("GROVE_PUBLIC_API_ORIGIN", "https://firefly-coral.vercel.app");
    expect(() => privateGroveReadConfig()).toThrowError("grove_api_not_configured");
  });

  it("canonicalizes root-slash provider origins before issuer/origin checks", async () => {
    vi.stubEnv("GROVE_SUPABASE_URL", groveUrl + "/");
    vi.stubEnv("GROVE_FIREFLY_SUPABASE_URL", fireflyUrl + "/");
    vi.stubEnv("GROVE_PUBLIC_API_ORIGIN", origin + "/");
    const config = privateGroveReadConfig();
    expect(config.groveUrl).toBe(groveUrl);
    expect(config.fireflyUrl).toBe(fireflyUrl);
    expect(config.apiOrigin).toBe(origin);
    expect((await readPrivateGroveArk(req(), projectId)).available).toBe(true);
    expect(mocks.clients.map(c => c.url))
      .toEqual([groveUrl, groveUrl, fireflyUrl]);
  });

  it("fails closed on malformed not-before claims", () => {
    for (const nbf of [null, "0", 0.5, now + 3600]) {
      expect(groveTokenClaimsMatch(
        jwt({nbf}), groveOwner, groveUrl, now,
      )).toBe(false);
    }
  });

  it("requires expected issuer, audience, role, subject and unexpired time", () => {
    expect(groveTokenClaimsMatch(jwt(), groveOwner, groveUrl)).toBe(true);
    for (const changes of [
      { iss: `${fireflyUrl}/auth/v1` },
      { aud: "public" }, { role: "service_role" },
      { sub: fireflyOwner }, { exp: now - 100 },
      { nbf: now + 3600 },
    ]) {
      expect(groveTokenClaimsMatch(jwt(changes), groveOwner, groveUrl)).toBe(false);
    }
  });

  it("rejects malformed tokens before trusting claims", () => {
    expect(groveTokenClaimsMatch("bad.token", groveOwner, groveUrl)).toBe(false);
    expect(groveTokenClaimsMatch("", groveOwner, groveUrl)).toBe(false);
  });
});

describe("private Grove read broker", () => {
  it("denies an absent bearer before touching any provider", async () => {
    await expect(readPrivateGroveArk(req(null), projectId))
      .rejects.toMatchObject({ status: 401, code: "grove_auth_required" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("denies a token rejected by Grove Auth before querying grants", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null }, error: new Error("unverified"),
    });
    await expect(readPrivateGroveArk(req(), projectId))
      .rejects.toMatchObject({ status: 401, code: "grove_invalid_token" });
    expect(mocks.fromCalls).toEqual([]);
  });

  it("denies a Firefly token even if mock auth claims the owner", async () => {
    await expect(readPrivateGroveArk(
      req(jwt({ iss: `${fireflyUrl}/auth/v1` })), projectId,
    )).rejects.toMatchObject({ status: 401, code: "grove_invalid_token" });
    expect(mocks.fromCalls).toEqual([]);
  });

  it("denies missing invitation without creating an admin client", async () => {
    mocks.lookup.set("grove_private_owner_access", {
      data: null, error: null,
    });
    await expect(readPrivateGroveArk(req(), projectId))
      .rejects.toMatchObject({ status: 403, code: "grove_not_invited" });
    expect(mocks.clients).toHaveLength(1);
  });

  it("denies missing or revoked bridge before accessing Firefly", async () => {
    mocks.lookup.set("grove_private_firefly_bridge", {
      data: null, error: null,
    });
    await expect(readPrivateGroveArk(req(), projectId))
      .rejects.toMatchObject({ status: 403, code: "grove_bridge_not_granted" });
    expect(mocks.clients).toHaveLength(2);
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
  });

  it("denies an unapproved project without querying Firefly", async () => {
    mocks.lookup.set("grove_private_ark_project_grants", {
      data: null, error: null,
    });
    await expect(readPrivateGroveArk(req(), projectId))
      .rejects.toMatchObject({ status: 404, code: "project_not_found" });
    expect(mocks.clients).toHaveLength(2);
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
  });

  it("rejects mismatching grants without querying Firefly", async () => {
    mocks.lookup.set("grove_private_ark_project_grants", {
      data: { grove_user_id: fireflyOwner, firefly_project_id: projectId },
      error: null,
    });
    await expect(readPrivateGroveArk(req(), projectId))
      .rejects.toMatchObject({ status: 404, code: "project_not_found" });
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
  });

  it("asserts Firefly ownership before returning scoped ARK data", async () => {
    const result = await readPrivateGroveArk(req(), projectId);
    expect(result.available).toBe(true);
    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledWith(
      expect.anything(), fireflyOwner, projectId,
    );
    expect(mocks.readArkProjectSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: fireflyOwner, projectId, objectiveLimit: 20, eventLimit: 100,
      }),
    );
    expect(mocks.clients.map(c => c.url))
      .toEqual([groveUrl, groveUrl, fireflyUrl]);
  });

  it("never reads ARK if Firefly ownership denies access", async () => {
    mocks.assertProjectOwnedByUser.mockRejectedValue(
      new Error("project_not_found"),
    );
    await expect(readPrivateGroveArk(req(), projectId)).rejects.toThrow();
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
  });

  it("rejects requests targeting the wrong backend origin", async () => {
    await expect(readPrivateGroveArk(req(jwt(), projectId,
      "https://firefly-coral.vercel.app"), projectId))
      .rejects.toMatchObject({ status: 404, code: "grove_route_not_found" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});

describe("private Grove status route", () => {
  it("returns only scoped snapshot with no-store cache", async () => {
    const response = await GET(req());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).ok).toBe(true);
  });

  it("rejects invalid project UUID before broker reads", async () => {
    const response = await GET(req(jwt(), "invalid"));
    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("does not leak underlying provider errors", async () => {
    mocks.getUser.mockRejectedValue(new Error("private-credential-secret"));
    const response = await GET(req());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json()))
      .not.toContain("private-credential-secret");
  });

  it("fails closed on forbidden projects", async () => {
    mocks.lookup.set("grove_private_ark_project_grants", {
      data: null, error: null,
    });
    const response = await GET(req());
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("project_not_found");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("private Grove authorized project discovery", () => {
  const granted = (id = projectId) => ({
    grove_user_id: groveOwner, firefly_project_id: id,
  });

  it("rejects anonymous discovery before contacting Grove Auth", async () => {
    await expect(readPrivateGroveProjects(req(null)))
      .rejects.toMatchObject({status: 401, code: "grove_auth_required"});
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("does not list any grant without verified owner invitation", async () => {
    mocks.lookup.set("grove_private_owner_access", {
      data: null, error: null,
    });
    await expect(GET_PROJECTS(req())).resolves.toMatchObject({status: 403});
    expect(mocks.clients).toHaveLength(1);
    expect(mocks.assertProjectOwnedByUser).not.toHaveBeenCalled();
  });

  it("returns empty for invited owner with no project grants", async () => {
    const response = await GET_PROJECTS(req());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ok: true, projects: []});
    expect(mocks.clients.map(c => c.url)).toEqual([groveUrl, groveUrl]);
  });

  it("lists only explicitly granted and Firefly-owned projects", async () => {
    mocks.lookup.set("grove_private_ark_project_grants:list", {
      data: [granted(projectId)], error: null,
    });
    const response = await GET_PROJECTS(req());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ok: true, projects: [projectId]});
    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledWith(
      expect.anything(), fireflyOwner, projectId,
    );
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
    expect(mocks.clients.map(c => c.url)).toEqual([
      groveUrl, groveUrl, fireflyUrl,
    ]);
  });

  it("fails closed if an old grant outlives Firefly ownership", async () => {
    mocks.lookup.set("grove_private_ark_project_grants:list", {
      data: [granted()], error: null,
    });
    mocks.assertProjectOwnedByUser.mockRejectedValue(
      new Error("ownership changed"),
    );
    const response = await GET_PROJECTS(req());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json()))
      .not.toContain("ownership changed");
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
  });

  it("rejects injected foreign grant and bad project identifiers", async () => {
    for (const value of [
      [{grove_user_id: fireflyOwner, firefly_project_id: projectId}],
      [granted("not-a-uuid")],
      [granted(), granted()],
      Array.from({length: 51}, () => granted()),
    ]) {
      mocks.lookup.set("grove_private_ark_project_grants:list", {
        data: value, error: null,
      });
      const response = await GET_PROJECTS(req());
      expect(response.status).toBe(500);
      expect((await response.json()).ok).toBe(false);
      expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
      mocks.assertProjectOwnedByUser.mockClear();
    }
  });

  it("rejects wrong Grove host before creating provider clients", async () => {
    await expect(readPrivateGroveProjects(
      req(jwt(), projectId, "https://firefly-coral.vercel.app"),
    )).rejects.toMatchObject({status: 404, code: "grove_route_not_found"});
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});

describe("future private Grove conversation scope (NO chat route)", () => {
  it("binds Grove invitation, grant, Firefly project AND conversation before any model call", async () => {
    const bound = await authorizePrivateGroveConversation(
      req(), projectId, conversationId,
    );
    expect(bound).toMatchObject({
      groveUserId: groveOwner, fireflyUserId: fireflyOwner,
      projectId, conversationId, access: "read-only",
    });
    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledWith(
      expect.anything(), fireflyOwner, projectId,
    );
    expect(mocks.assertConversationOwnedByUser).toHaveBeenCalledWith({
      supabase: expect.anything(), userId: fireflyOwner,
      projectId, conversationId,
    });
    expect(mocks.clients.map(x => x.url)).toEqual([
      groveUrl, groveUrl, fireflyUrl,
    ]);
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
  });

  it("rejects malformed project and conversation IDs before any client/lookup", async () => {
    for (const [project, conversation] of [
      ["bad", conversationId], [projectId, "bad"], ["", ""],
    ]) {
      await expect(authorizePrivateGroveConversation(
        req(), project, conversation,
      )).rejects.toMatchObject({
        status: 404, code: "grove_invalid_conversation_scope",
      });
    }
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.assertConversationOwnedByUser).not.toHaveBeenCalled();
  });

  it("rejects missing/revoked owner invite before touching Firefly conversation", async () => {
    mocks.lookup.set("grove_private_owner_access", {
      data: null, error: null,
    });
    await expect(authorizePrivateGroveConversation(
      req(), projectId, conversationId,
    )).rejects.toMatchObject({status: 403, code: "grove_not_invited"});
    expect(mocks.clients).toHaveLength(1);
    expect(mocks.assertConversationOwnedByUser).not.toHaveBeenCalled();
  });

  it("rejects wrong project grant before Firefly conversation read", async () => {
    mocks.lookup.set("grove_private_ark_project_grants", {
      data: null, error: null,
    });
    await expect(authorizePrivateGroveConversation(
      req(), projectId, conversationId,
    )).rejects.toMatchObject({status: 404, code: "project_not_found"});
    expect(mocks.assertProjectOwnedByUser).not.toHaveBeenCalled();
    expect(mocks.assertConversationOwnedByUser).not.toHaveBeenCalled();
  });

  it("denies a foreign project even when a stale grant exists", async () => {
    mocks.assertProjectOwnedByUser.mockRejectedValue(
      new Error("foreign project"),
    );
    await expect(authorizePrivateGroveConversation(
      req(), projectId, conversationId,
    )).rejects.toThrow("foreign project");
    expect(mocks.assertConversationOwnedByUser).not.toHaveBeenCalled();
  });

  it("denies another owner's or project's conversation before Layer/LM", async () => {
    mocks.assertConversationOwnedByUser.mockRejectedValue(
      new Error("conversation_not_found"),
    );
    await expect(authorizePrivateGroveConversation(
      req(), projectId, conversationId,
    )).rejects.toThrow("conversation_not_found");
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
  });

  it("rejects Firefly JWT and wrong Grove host without Firefly reads", async () => {
    await expect(authorizePrivateGroveConversation(
      req(jwt({iss: `${fireflyUrl}/auth/v1`}), projectId), projectId, conversationId,
    )).rejects.toMatchObject({status: 401, code: "grove_invalid_token"});
    await expect(authorizePrivateGroveConversation(
      req(jwt(), projectId, "https://firefly-coral.vercel.app"),
      projectId, conversationId,
    )).rejects.toMatchObject({
      status: 404, code: "grove_route_not_found",
    });
    expect(mocks.assertConversationOwnedByUser).not.toHaveBeenCalled();
  });
});


const ownedConversation = (id = conversationId, overrides: Record<string, unknown> = {}) => ({
  id, user_id: fireflyOwner, project_id: projectId,
  created_at: "2026-09-23T00:00:00Z",
  updated_at: "2026-09-23T01:00:00Z",
  ...overrides,
});

describe("existing private Grove conversation discovery", () => {
  it("reads only existing owner-and-project-scoped Firefly conversation IDs", async () => {
    mocks.lookup.set("conversations:list", {
      data: [ownedConversation()], error: null,
    });
    const result = await readPrivateGroveConversations(req(), projectId);
    expect(result).toEqual({
      projectId, mayBeTruncated: false,
      conversations: [{
        conversationId, createdAt: "2026-09-23T00:00:00Z",
        updatedAt: "2026-09-23T01:00:00Z",
      }],
    });
    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledWith(
      expect.anything(), fireflyOwner, projectId,
    );
    expect(mocks.queryFilters).toEqual(expect.arrayContaining([
      { table: "conversations", key: "user_id", value: fireflyOwner },
      { table: "conversations", key: "project_id", value: projectId },
    ]));
    expect(mocks.queryOrders).toEqual(expect.arrayContaining([
      { table: "conversations", key: "updated_at", ascending: false },
      { table: "conversations", key: "id", ascending: false },
    ]));
    expect(mocks.assertConversationOwnedByUser).not.toHaveBeenCalled();
  });

  it("cannot list Firefly conversations before an active Grove grant", async () => {
    mocks.lookup.set("grove_private_ark_project_grants", {
      data: null, error: null,
    });
    await expect(readPrivateGroveConversations(req(), projectId))
      .rejects.toMatchObject({ status: 404, code: "project_not_found" });
    expect(mocks.fromCalls).not.toContain("conversations");
  });

  it("cannot use an expired owner, foreign project or invalid identifier", async () => {
    await expect(readPrivateGroveConversations(req(), "bad"))
      .rejects.toMatchObject({status: 404, code: "grove_invalid_project_scope"});
    expect(mocks.fromCalls).not.toContain("conversations");
    mocks.assertProjectOwnedByUser.mockRejectedValueOnce(
      new Error("foreign Firefly project"),
    );
    await expect(readPrivateGroveConversations(req(), projectId))
      .rejects.toThrow("foreign Firefly project");
    expect(mocks.fromCalls).not.toContain("conversations");
  });

  it("rejects service-role rows that do not match EXACT verified scope", async () => {
    for (const list of [
      [ownedConversation(conversationId, {user_id: groveOwner})],
      [ownedConversation(conversationId, {project_id: groveOwner})],
      [ownedConversation("bad-uuid")],
      [ownedConversation(), ownedConversation()],
      [ownedConversation(conversationId, {created_at: "bad"})],
      Array.from({length: 22}, () => ownedConversation()),
    ]) {
      mocks.lookup.set("conversations:list", {data: list, error: null});
      await expect(readPrivateGroveConversations(req(), projectId))
        .rejects.toMatchObject({
          status: 500, code: "grove_private_conversations_unavailable",
        });
    }
  });

  it("withholds conversation IDs when Firefly ownership changes during discovery", async () => {
    mocks.lookup.set("conversations:list", {
      data: [ownedConversation()], error: null,
    });
    mocks.assertProjectOwnedByUser
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("grant_or_ownership_revoked"));
    await expect(readPrivateGroveConversations(req(), projectId))
      .rejects.toThrow("grant_or_ownership_revoked");
    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledTimes(2);
    expect(mocks.fromCalls).toContain("conversations");
  });

  it("treats no existing conversation as EMPTY, never as a synthetic chat ID", async () => {
    mocks.lookup.set("conversations:list", {data: [], error: null});
    const result = await readPrivateGroveConversations(req(), projectId);
    expect(result.conversations).toEqual([]);
    expect(result.mayBeTruncated).toBe(false);
  });

  it("indicates a 20-result window instead of claiming a complete archive", async () => {
    const choices = Array.from({length: 21}, (_, i) =>
      ownedConversation(
        "00000000-0000-4000-8000-" + (i + 100).toString().padStart(12, "0"),
      ));
    mocks.lookup.set("conversations:list", {data: choices, error: null});
    const result = await readPrivateGroveConversations(req(), projectId);
    expect(result.conversations).toHaveLength(20);
    expect(result.mayBeTruncated).toBe(true);
  });
});
