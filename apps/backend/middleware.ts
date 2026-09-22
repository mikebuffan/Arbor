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

  if (process.env.ARBOR_PUBLIC_APP_ENABLED === "true") {
    if (!pathname.startsWith("/api/public/")) {
      return new NextResponse(null, { status: 404 });
    }
    if (req.method === "OPTIONS") {
      const origin = req.headers.get("origin") ?? "";
      const allowed = (process.env.ARBOR_PUBLIC_APP_ALLOWED_ORIGINS ?? "")
        .split(",").map((item) => item.trim());
      if (!origin || !allowed.includes(origin)) {
        return new NextResponse(null, { status: 403 });
      }
      return new NextResponse(null, {
        status: 204,
        headers: {
          vary: "origin",
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
          "access-control-allow-headers": "content-type, authorization",
          "access-control-max-age": "600",
        },
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
