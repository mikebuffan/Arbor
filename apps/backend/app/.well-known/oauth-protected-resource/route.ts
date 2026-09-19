import { metadataCorsOptionsRequestHandler } from "mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizationServerUrl(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!base) throw new Error("Supabase URL is not configured");
  return `${base.replace(/\/$/, "")}/auth/v1`;
}

export function GET(request: Request): Response {
  // The resource identifier must match the full URL clients use for MCP,
  // not the application's origin (RFC 9728).
  const resource = new URL("/api/mcp", request.url).toString();
  return Response.json(
    {
      resource,
      authorization_servers: [authorizationServerUrl()],
      bearer_methods_supported: ["header"],
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    },
  );
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
