import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function request(path: string, method = "GET") {
  return new NextRequest(`https://private-grove.example.org${path}`, {
    method, headers: { origin: "https://untrusted.example.org" },
  });
}

afterEach(() => vi.unstubAllEnvs());

describe("integrated private Grove host isolation", () => {
  it("allows only currently implemented private paths and exact methods", () => {
    vi.stubEnv("GROVE_API_ENABLED", "true");
    for (const [path, method] of [
      ["/api/grove/ark/status", "GET"],
      ["/api/grove/ark/projects", "GET"],
      ["/api/grove/chat/conversations", "GET"],
      ["/api/grove/chat/conversations", "POST"],
      ["/api/grove/chat/history", "GET"],
      ["/api/grove/chat", "POST"],
    ]) {
      const response = middleware(request(path, method));
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    }
  });

  it("denies legacy Firefly, public alpha, admin, attachments and house pages", () => {
    vi.stubEnv("GROVE_API_ENABLED", "true");
    for (const path of [
      "/api/chat", "/api/chat/attachments/access",
      "/api/ark/status", "/api/admin/system/heartbeat",
      "/api/public/chat", "/", "/favicon.ico",
      "/api/grove/ark/status/other", "/api/grove/chat/foreign",
    ]) {
      const response = middleware(request(path));
      expect(response.status).toBe(404);
      expect(response.headers.get("x-middleware-next")).toBeNull();
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("denies wrong methods and permissive browser preflight", () => {
    vi.stubEnv("GROVE_API_ENABLED", "true");
    for (const [path, method] of [
      ["/api/grove/chat", "GET"],
      ["/api/grove/chat/history", "POST"],
      ["/api/grove/ark/projects", "POST"],
      ["/api/grove/chat/conversations", "DELETE"],
      ["/api/grove/chat/conversations", "OPTIONS"],
      ["/api/grove/ark/status", "OPTIONS"],
    ]) {
      const response = middleware(request(path, method));
      expect(response.status).toBe(404);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    }
  });

  it("does not change original Firefly behavior when private host mode is OFF", () => {
    vi.stubEnv("GROVE_API_ENABLED", "");
    const response = middleware(request("/api/ark/status"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("access-control-allow-origin"))
      .toBe("https://untrusted.example.org");
    const staticAsset = middleware(request("/favicon.ico"));
    expect(staticAsset.headers.get("x-middleware-next")).toBe("1");
  });
});
