import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const attachmentBrokerPaths = new Set([
  "/api/chat/attachments/access",
  "/api/chat/attachments/delete",
]);

function cors(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
    vary: "origin",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type, authorization, apikey, x-client-info",
    "access-control-max-age": "86400",
  };
}

function isStaticOrPublicPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/next.svg" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff|woff2)$/.test(pathname)
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // This same backend source is deployed for two DIFFERENT products. The
  // dedicated Grove host is deny-by-default, even for static/public pages,
  // inherited Firefly chat/admin/attachments routes and browser CORS.
  // Individual Grove handlers independently enforce auth, active grants and
  // default-OFF chat/model/transcript/new-thread feature flags.
  if (process.env.GROVE_API_ENABLED === "true") {
    const allowed: Record<string, readonly string[]> = {
      "/api/grove/ark/status": ["GET"],
      "/api/grove/ark/projects": ["GET"],
      "/api/grove/chat/conversations": ["GET", "POST"],
      "/api/grove/chat/history": ["GET"],
      "/api/grove/chat": ["POST"],
    };
    if (!allowed[pathname]?.includes(req.method)) {
      return new NextResponse(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.next();
  }

  if (isStaticOrPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (attachmentBrokerPaths.has(pathname)) {
    return NextResponse.next();
  }

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors(req) });
  }

  const res = NextResponse.next();
  const h = cors(req);
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);

  return res;
}

export const config = {
  matcher: ["/((?!_next/).*)"],
};
