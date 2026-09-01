import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const attachmentBrokerPaths = [
  "/api/chat/attachments/access",
  "/api/chat/attachments/delete",
] as const;

function middlewareRequest(path: string, method: string) {
  return new NextRequest(`https://arbor.test${path}`, {
    method,
    headers: { origin: "https://companion.test" },
  });
}

function expectDelegatedWithoutGlobalCors(response: Response) {
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.get("access-control-allow-origin")).toBeNull();
  expect(response.headers.get("access-control-allow-methods")).toBeNull();
  expect(response.headers.get("access-control-allow-headers")).toBeNull();
  expect(response.headers.get("access-control-max-age")).toBeNull();
}

describe("attachment broker middleware CORS delegation", () => {
  it.each(attachmentBrokerPaths)(
    "delegates OPTIONS for %s instead of terminating with global CORS",
    (path) => {
      const response = middleware(middlewareRequest(path, "OPTIONS"));

      expectDelegatedWithoutGlobalCors(response);
      expect(response.status).not.toBe(204);
    },
  );

  it.each(attachmentBrokerPaths)(
    "does not inject global CORS into POST %s",
    (path) => {
      const response = middleware(middlewareRequest(path, "POST"));

      expectDelegatedWithoutGlobalCors(response);
    },
  );

  it("preserves global CORS preflight behavior for unrelated APIs", () => {
    const response = middleware(
      middlewareRequest("/api/conversations/list", "OPTIONS"),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://companion.test",
    );
    expect(response.headers.get("vary")).toBe("origin");
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "content-type, authorization, apikey, x-client-info",
    );
    expect(response.headers.get("access-control-max-age")).toBe("86400");
  });

  it("does not carve out unlisted attachment namespace paths", () => {
    const response = middleware(
      middlewareRequest("/api/chat/attachments/future", "OPTIONS"),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
  });
});
