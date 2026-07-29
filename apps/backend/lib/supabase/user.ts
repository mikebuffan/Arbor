import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

function bearerTokenFromRequest(req: Request): string {
  const authHeader = req.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  const token = match?.[1]?.trim() ?? "";

  if (!token) {
    throw new RouteAccessError(401, "auth_required");
  }

  return token;
}

function userClientConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new RouteAccessError(500, "auth_not_configured");
  }

  return { url, anonKey };
}

export function createRequestScopedUserClient(req: Request): SupabaseClient {
  const token = bearerTokenFromRequest(req);
  const { url, anonKey } = userClientConfiguration();

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
