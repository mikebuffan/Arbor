import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RouteAccessError,
  requireAdminAuthorization,
  requireMachineAuthorization,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("route authorization", () => {
  it("rejects missing and invalid machine authentication", () => {
    vi.stubEnv("CRON_SECRET", "machine-secret");

    expect(() =>
      requireMachineAuthorization(new Request("https://arbor.test/heartbeat")),
    ).toThrowError(RouteAccessError);

    expect(() =>
      requireMachineAuthorization(
        new Request("https://arbor.test/heartbeat", {
          headers: { authorization: "Bearer wrong-secret" },
        }),
      ),
    ).toThrowError("machine_auth_required");
  });

  it("accepts valid bearer machine authentication", () => {
    vi.stubEnv("CRON_SECRET", "machine-secret");
    const req = new Request("https://arbor.test/heartbeat", {
      headers: { authorization: "Bearer machine-secret" },
    });

    expect(() => requireMachineAuthorization(req)).not.toThrow();
  });

  it("rejects ordinary users without server-side admin authorization", () => {
    vi.stubEnv("ARBOR_ADMIN_TOKEN", "admin-secret");

    expect(() =>
      requireAdminAuthorization(new Request("https://arbor.test/admin")),
    ).toThrowError("admin_forbidden");
  });

  it("accepts valid server-side admin authorization", () => {
    vi.stubEnv("ARBOR_ADMIN_TOKEN", "admin-secret");
    const req = new Request("https://arbor.test/admin", {
      headers: { "x-admin-token": "admin-secret" },
    });

    expect(() => requireAdminAuthorization(req)).not.toThrow();
  });

  it("maps authentication and authorization failures to their HTTP status", async () => {
    const unauthorized = routeErrorResponse(
      new RouteAccessError(401, "invalid_token"),
    );
    const forbidden = routeErrorResponse(
      new RouteAccessError(403, "admin_forbidden"),
    );

    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.json()).toEqual({ ok: false, error: "invalid_token" });
    expect(forbidden.status).toBe(403);
  });
});
