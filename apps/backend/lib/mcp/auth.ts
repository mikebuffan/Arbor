import "server-only";

import type { AuthInfo } from "@modelcontextprotocol/server";
import { createUserClientForBearerToken } from "@/lib/supabase/user";

type VerifiedTokenClaims = {
  client_id?: unknown;
  exp?: unknown;
};

function verifiedTokenClaims(token: string): VerifiedTokenClaims {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

export async function verifyArkMcpToken(
  _request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const token = bearerToken?.trim();
  if (!token) return undefined;

  const supabase = createUserClientForBearerToken(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return undefined;

  // Claims are consumed only after Supabase has validated the complete token.
  const claims = verifiedTokenClaims(token);

  return {
    token,
    clientId:
      typeof claims.client_id === "string"
        ? claims.client_id
        : "supabase-oauth-client",
    scopes: ["ark.read"],
    expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
    extra: {
      userId: user.id,
      email: user.email ?? null,
    },
  };
}
