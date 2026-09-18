import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from "mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizationServerUrl(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!base) throw new Error("Supabase URL is not configured");
  return `${base.replace(/\/$/, "")}/auth/v1`;
}

export function GET(request: Request): Response {
  return protectedResourceHandler({
    authServerUrls: [authorizationServerUrl()],
  })(request);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
