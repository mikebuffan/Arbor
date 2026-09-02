import type { SupabaseClient } from "@supabase/supabase-js";
import { createRequestScopedUserClient } from "@/lib/supabase/user";

export function supabaseFromAuthHeader(req: Request): SupabaseClient {
  return createRequestScopedUserClient(req);
}
