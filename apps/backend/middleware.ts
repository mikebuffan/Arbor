import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  if (isStaticOrPublicPath(pathname)) {
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
