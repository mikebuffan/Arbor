import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  assertProjectOwnedByUser: vi.fn(),
  readArkProjectSnapshot: vi.fn(),
  getUser: vi.fn(),
  clients: [] as Array<{ url: string; key: string; options: unknown }>,
  lookup: new Map<string, { data: unknown; error: unknown }>(),
  fromCalls: [] as string[],
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.assertProjectOwnedByUser,
}));
vi.mock("@/lib/ark/readModel", () => ({
  readArkProjectSnapshot: mocks.readArkProjectSnapshot,
}));

import {
  groveTokenClaimsMatch,
  privateGroveReadConfig,
  readPrivateGroveArk,
} from "@/lib/grove/privateReadBroker";
import { GET } from "@/app/api/grove/ark/status/route";

const groveUrl = "https://fqjqpuaoifgbweiguacf.supabase.co";
const fireflyUrl = "https://ncpdlyakrzfvobmwzbon.supabase.co";
const origin = "https://grove-private.example.org";
const groveOwner = "00000000-0000-4000-8000-000000000001";
const fireflyOwner = "00000000-0000-4000-8000-000000000002";
const projectId = "00000000-0000-4000-8000-000000000003";
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
    maybeSingle: vi.fn(async () => mocks.lookup.get(table) ?? {
      data: null, error: null,
    }),
  };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.is.mockReturnValue(q);
  return q;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.clients.length = 0;
  mocks.fromCalls.length = 0;
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
