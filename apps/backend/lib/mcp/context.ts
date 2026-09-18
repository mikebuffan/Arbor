import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServerContext } from "@modelcontextprotocol/server";
import { createUserClientForBearerToken } from "@/lib/supabase/user";

export type ArkMcpUserContext = {
  userId: string;
  email: string | null;
  supabase: SupabaseClient;
};

export function arkMcpUserContext(ctx: ServerContext): ArkMcpUserContext {
  const auth = ctx.http?.authInfo;
  const userId = auth?.extra?.userId;

  if (!auth?.token || typeof userId !== "string") {
    throw new Error("Authenticated ARK context is unavailable");
  }

  return {
    userId,
    email: typeof auth.extra?.email === "string" ? auth.extra.email : null,
    supabase: createUserClientForBearerToken(auth.token),
  };
}
