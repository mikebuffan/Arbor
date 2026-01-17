import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/api/:path*"],
};

function cors(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
    "vary": "origin",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type, authorization, apikey, x-client-info",
    "access-control-max-age": "86400",
  };
}

export function middleware(req: NextRequest) {
  // Preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors(req) });
  }

  // For real API responses, just pass through
  const res = NextResponse.next();
  const h = cors(req);
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return res;
}
