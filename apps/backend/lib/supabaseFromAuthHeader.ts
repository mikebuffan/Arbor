import { createRequestScopedUserClient } from "@/lib/supabase/user";

export function supabaseFromAuthHeader(req: Request) {
  return createRequestScopedUserClient(req);
}
