import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  supabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import {
  PublicAlphaError,
  checkPublicAlphaEnvironment,
  requirePublicAlphaUser,
} from "../alphaAuth";
import { publicCorsHeaders, publicPreflight } from "../http";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

const alphaRef = "aaaaaaaaaaaaaaaaaaaa";
const alphaUrl = "https://" + alphaRef + ".supabase.co";
const confirmed = {
  id: "user-a",
  email: "tester@example.test",
  email_confirmed_at: "2026-09-21T00:00:00Z",
};

describe("separate public alpha access boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ARBOR_PUBLIC_APP_ENABLED", "true");
    vi.stubEnv("ARBOR_PUBLIC_APP_SUPABASE_REF", alphaRef);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", alphaUrl);
    vi.stubEnv("SUPABASE_URL", alphaUrl);
    vi.stubEnv("ARBOR_PUBLIC_APP_TEST_EMAILS", "tester@example.test");
    mocks.requireUser.mockResolvedValue({
      userId: "user-a",
      supabase: {
        auth: { getUser: vi.fn().mockResolvedValue({
          data: { user: confirmed }, error: null,
        }) },
      },
    });
    mocks.supabaseAdmin.mockReturnValue({ name: "isolated-alpha-db" });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("accepts a separate alpha configuration", () => {
    expect(() => checkPublicAlphaEnvironment()).not.toThrow();
  });

  it.each([
    "ncpdlyakrzfvobmwzbon",
    "tzbpjbhroxiqftqwatnb",
    "fqjqpuaoifgbweiguacf",
    "dqvrzgrmorzfjddyozqz",
  ])("refuses private project %s even when configuration matches", (ref) => {
    vi.stubEnv("ARBOR_PUBLIC_APP_SUPABASE_REF", ref);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://" + ref + ".supabase.co");
    vi.stubEnv("SUPABASE_URL", "https://" + ref + ".supabase.co");
    expect(() => checkPublicAlphaEnvironment()).toThrowError(
      PublicAlphaError,
    );
  });

  it("rejects mismatched user and admin database configuration", () => {
    vi.stubEnv("SUPABASE_URL", "https://bbbbbbbbbbbbbbbbbbbb.supabase.co");
    expect(() => checkPublicAlphaEnvironment()).toThrowError(
      PublicAlphaError,
    );
  });

  it("refuses to call auth or database when alpha is disabled", async () => {
    vi.stubEnv("ARBOR_PUBLIC_APP_ENABLED", "false");
    await expect(requirePublicAlphaUser(
      new Request("https://alpha.example.test/api/public/chat"),
    )).rejects.toMatchObject({ code: "alpha_not_configured", status: 503 });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("refuses uninvited users before giving access to admin data", async () => {
    mocks.requireUser.mockResolvedValueOnce({
      userId: "user-b",
      supabase: {
        auth: { getUser: vi.fn().mockResolvedValue({
          data: { user: {
            ...confirmed, id: "user-b", email: "other@example.test",
          } },
          error: null,
        }) },
      },
    });
    await expect(requirePublicAlphaUser(
      new Request("https://alpha.example.test/api/public/chat"),
    )).rejects.toMatchObject({ code: "alpha_access_denied", status: 403 });
    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("refuses unconfirmed emails", async () => {
    mocks.requireUser.mockResolvedValueOnce({
      userId: "user-a",
      supabase: {
        auth: { getUser: vi.fn().mockResolvedValue({
          data: { user: { ...confirmed, email_confirmed_at: undefined } },
          error: null,
        }) },
      },
    });
    await expect(requirePublicAlphaUser(
      new Request("https://alpha.example.test/api/public/chat"),
    )).rejects.toMatchObject({
      code: "email_confirmation_required", status: 403,
    });
    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("accepts a confirmed invite and only then returns admin client", async () => {
    await expect(requirePublicAlphaUser(
      new Request("https://alpha.example.test/api/public/chat"),
    )).resolves.toMatchObject({
      userId: "user-a",
      db: { name: "isolated-alpha-db" },
    });
    expect(mocks.supabaseAdmin).toHaveBeenCalledOnce();
  });
});

describe("public alpha origin allowlist", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does not echo an attacker-controlled origin", () => {
    vi.stubEnv("ARBOR_PUBLIC_APP_ALLOWED_ORIGINS",
      "https://alpha.example.test");
    const req = new Request("https://api.example.test/api/public/chat", {
      headers: { origin: "https://attacker.example.test" },
    });
    expect(publicCorsHeaders(req)["access-control-allow-origin"])
      .toBeUndefined();
    expect(publicPreflight(req).status).toBe(403);
  });

  it("permits only an exact configured web origin", () => {
    vi.stubEnv("ARBOR_PUBLIC_APP_ALLOWED_ORIGINS",
      "https://alpha.example.test");
    const req = new Request("https://api.example.test/api/public/chat", {
      headers: { origin: "https://alpha.example.test" },
    });
    expect(publicCorsHeaders(req)["access-control-allow-origin"])
      .toBe("https://alpha.example.test");
    expect(publicPreflight(req).status).toBe(204);
  });
});

describe("isolated public alpha host middleware", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("blocks legacy and administrative routes only in alpha mode", () => {
    vi.stubEnv("ARBOR_PUBLIC_APP_ENABLED", "true");
    for (const path of ["/api/chat", "/api/ark/status",
      "/api/admin/system/heartbeat", "/"]) {
      const response = middleware(new NextRequest(
        "https://alpha.example.test" + path));
      expect(response.status).toBe(404);
      expect(response.headers.get("x-middleware-next")).toBeNull();
    }
    const publicResponse = middleware(new NextRequest(
      "https://alpha.example.test/api/public/chat"));
    expect(publicResponse.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not reflect unapproved browser origins in alpha preflight", () => {
    vi.stubEnv("ARBOR_PUBLIC_APP_ENABLED", "true");
    vi.stubEnv("ARBOR_PUBLIC_APP_ALLOWED_ORIGINS",
      "https://invited.example.test");
    const preflight = (origin: string) => middleware(new NextRequest(
      "https://alpha.example.test/api/public/chat",
      { method: "OPTIONS", headers: { origin } },
    ));
    expect(preflight("https://attacker.example.test").status).toBe(403);
    const allowed = preflight("https://invited.example.test");
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://invited.example.test");
  });
});
