import type { SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { createRequestScopedUserClient } from "@/lib/supabase/user";

type AuthenticatedUser = {
  userId: string;
  supabase: SupabaseClient;
};

export async function requireUser(req: Request): Promise<AuthenticatedUser> {
  const supabase = createRequestScopedUserClient(req);
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
