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

function deny() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const groveMode = process.env.GROVE_API_ENABLED === "true";
  const publicMode = process.env.ARBOR_PUBLIC_APP_ENABLED === "true";

  // These are different products and must never share one active backend realm.
  if (groveMode && publicMode) return deny();

  // The dedicated Grove host is deny-by-default, even for static/public pages,
  // inherited Firefly chat/admin/attachments routes and browser CORS.
  if (groveMode) {
    const allowed: Record<string, readonly string[]> = {
      "/api/grove/ark/status": ["GET"],
      "/api/grove/ark/projects": ["GET"],
      "/api/grove/chat/conversations": ["GET", "POST"],
      "/api/grove/chat/history": ["GET"],
      "/api/grove/chat": ["POST"],
      "/api/grove/corrections": ["POST"],
    };
    if (!allowed[pathname]?.includes(req.method)) return deny();
    return NextResponse.next();
  }

  // The public alpha backend is a third isolated product. It exposes only the
  // public API namespace and accepts preflight only from explicit origins.
  if (publicMode) {
    if (!pathname.startsWith("/api/public/")) return deny();
    if (req.method === "OPTIONS") {
      const origin = req.headers.get("origin") ?? "";
      const allowed = (process.env.ARBOR_PUBLIC_APP_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (!origin || !allowed.includes(origin)) {
        return new NextResponse(null, {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        });
      }
      return new NextResponse(null, {
        status: 204,
        headers: {
          vary: "origin",
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
          "access-control-allow-headers": "content-type, authorization",
          "access-control-max-age": "600",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.next();
  }

  if (isStaticOrPublicPath(pathname)) return NextResponse.next();
  if (attachmentBrokerPaths.has(pathname)) return NextResponse.next();

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors(req) });
  }

  const res = NextResponse.next();
  const h = cors(req);
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return res;
}

export const config = {
  // Match framework assets too: private Grove and public-alpha hosts must be
  // able to deny inherited routes, while ordinary Firefly keeps its bypasses.
  matcher: ["/:path*"],
};
