import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

type AuthenticatedUser = {
  userId: string;
  supabase: SupabaseClient;
};

export async function requireUser(req: Request): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  const token = match?.[1]?.trim() ?? "";
  if (!token) {
    throw new RouteAccessError(401, "auth_required");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new RouteAccessError(500, "auth_not_configured");
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new RouteAccessError(401, "invalid_token");
  }

  return { userId: user.id, supabase };
}

export async function requireUserId(req: Request): Promise<string> {
  const { userId } = await requireUser(req);
  return userId;
}
