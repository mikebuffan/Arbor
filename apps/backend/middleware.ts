import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { correctWorkerHostEnvironment, isWorkerOnlyDeployment, rejectWorkerOnlyRequest } from "./lib/ark/previewWorkerHost";
import { isPreviewMcpOnlyDeployment, rejectPreviewMcpOnlyPath, isCorrectPreviewMcpSupabaseEnvironment } from "./lib/mcp/previewHostRoutes";

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

  // Worker-only Preview ingress is evaluated BEFORE static, CORS and attachment exemptions.
  const workerEnv = {
    ARK_PREVIEW_WORKER_ONLY_HOST: process.env.ARK_PREVIEW_WORKER_ONLY_HOST,
    ARK_PREVIEW_MCP_READONLY_HOST: process.env.ARK_PREVIEW_MCP_READONLY_HOST,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  };
  if (isWorkerOnlyDeployment(workerEnv)) {
    if (!correctWorkerHostEnvironment(workerEnv)) return new NextResponse(null, { status: 503 });
    if (rejectWorkerOnlyRequest(pathname, req.method)) return new NextResponse(null, { status: 404 });
    return NextResponse.next(); // Route still requires machine Bearer CRON_SECRET.
  }

  // Reuse the existing #213 read-only MCP ingress for any Preview deployments of this branch.
  // Never expose full app routes merely because another project auto-deployed our worker source.
  const mcpReadOnly = isPreviewMcpOnlyDeployment(process.env.ARK_PREVIEW_MCP_READONLY_HOST);
  if (mcpReadOnly) {
    if (!isCorrectPreviewMcpSupabaseEnvironment({
      SUPABASE_URL: process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    })) return new NextResponse(null, { status: 503 });
    if (rejectPreviewMcpOnlyPath(pathname, mcpReadOnly)) return new NextResponse(null, { status: 404 });
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
  // The worker-only host must also intercept /_next assets, not just API paths.
  matcher: ["/:path*"],
};
