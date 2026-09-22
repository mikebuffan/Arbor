import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function request(path: string, method = "GET") {
  return new NextRequest(`https://private-grove.example.org${path}`, {
    method,
    headers: { origin: "https://untrusted.example.org" },
  });
}

afterEach(() => vi.unstubAllEnvs());

describe("private Grove host isolation", () => {
  it("fails closed for the Firefly ARK endpoint", () => {
    vi.stubEnv("GROVE_API_ENABLED", "true");
    const response = middleware(request("/api/ark/status"));
    expect(response.status).toBe(404);
    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("blocks original Firefly chat, admin heartbeat and public home", () => {
    vi.stubEnv("GROVE_API_ENABLED", "true");
    for (const path of [
      "/api/chat",
      "/api/chat/attachments/access",
      "/api/admin/system/heartbeat",
      "/",
      "/api/grove/ark/status/other",
    ]) {
      const response = middleware(request(path));
      expect(response.status).toBe(404);
      expect(response.headers.get("x-middleware-next")).toBeNull();
    }
  });

  it("allows only the separately authorized private status route", () => {
    vi.stubEnv("GROVE_API_ENABLED", "true");
    for (const route of ["/api/grove/ark/status", "/api/grove/ark/projects"]) {
      const response = middleware(request(route));
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    }
  });

  it("never exposes permissive public CORS preflight in Grove mode", () => {
    vi.stubEnv("GROVE_API_ENABLED", "true");
    const response = middleware(request("/api/grove/ark/status", "OPTIONS"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("original Firefly behavior is untouched when Grove mode is disabled", () => {
    vi.stubEnv("GROVE_API_ENABLED", "");
    const response = middleware(request("/api/ark/status"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://untrusted.example.org",
    );
  });
});
