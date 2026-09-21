import { NextResponse } from "next/server";

// Optional Flutter Web development. Native Android does not use CORS.
export function publicCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = (process.env.ARBOR_PUBLIC_APP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin)) return { vary: "origin" };
  return {
    vary: "origin",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "600",
  };
}

export function publicJson(
  req: Request,
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: publicCorsHeaders(req),
  });
}

export function publicPreflight(req: Request): Response {
  const origin = req.headers.get("origin");
  if (!origin || !publicCorsHeaders(req)["access-control-allow-origin"]) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: publicCorsHeaders(req),
  });
}
