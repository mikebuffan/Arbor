import "server-only";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export class PublicAlphaError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

export function checkPublicAlphaEnvironment(
  env: Record<string, string | undefined> = process.env,
): void {
  const ref = env.ARBOR_PUBLIC_APP_SUPABASE_REF?.trim() ?? "";
  const expectedUrl = "https://" + ref + ".supabase.co";
  const authUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const adminUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  // The production Firefly and private ARK Preview project refs are publicly
  // discoverable deployment metadata, NOT credentials.
  const protectedRefs = new Set([
    "ncpdlyakrzfvobmwzbon",
    "tzbpjbhroxiqftqwatnb",
  ]);
  if (
    env.ARBOR_PUBLIC_APP_ENABLED !== "true" ||
    !/^[a-z0-9]{20}$/.test(ref) ||
    protectedRefs.has(ref) ||
    authUrl !== expectedUrl ||
    adminUrl !== expectedUrl ||
    !env.ARBOR_PUBLIC_APP_TEST_EMAILS?.trim()
  ) {
    throw new PublicAlphaError("alpha_not_configured", 503);
  }
}

export async function requirePublicAlphaUser(req: Request) {
  checkPublicAlphaEnvironment();
  let userId: string;
  let email: string;
  try {
    const result = await requireUser(req);
    userId = result.userId;
    const response = await result.supabase.auth.getUser();
    const user = response.data.user;
    if (response.error || !user || user.id !== userId) {
      throw new Error("Invalid token");
    }
    email = user.email?.toLowerCase().trim() ?? "";
    if (!email || !user.email_confirmed_at) {
      throw new PublicAlphaError("email_confirmation_required", 403);
    }
  } catch (error) {
    if (error instanceof PublicAlphaError) throw error;
    throw new PublicAlphaError("unauthorized", 401);
  }
  const allowed = new Set(
    (process.env.ARBOR_PUBLIC_APP_TEST_EMAILS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!allowed.has(email)) {
    throw new PublicAlphaError("alpha_access_denied", 403);
  }
  return { userId, db: supabaseAdmin() };
}

export function publicAlphaResponse(error: unknown): NextResponse {
  if (error instanceof PublicAlphaError) {
    return NextResponse.json(
      { ok: false, error: error.code },
      { status: error.status },
    );
  }
  // Never send raw database errors, service URLs, model credentials,
  // user content, or stack traces to the client.
  return NextResponse.json(
    { ok: false, error: "public_app_unavailable" },
    { status: 503 },
  );
}
