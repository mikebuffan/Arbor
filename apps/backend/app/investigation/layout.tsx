import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Arbor Investigation Workbench",
  description: "Private evidence-grade investigation workspace.",
};

async function requireInvestigationAccess() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Investigation authentication is not configured");

  const cookieStore = await cookies();
  const auth = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Session refresh is handled by the browser auth flow.
      },
    },
  });

  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) redirect("/login?next=/investigation");

  const admin = supabaseAdmin();
  const { data: access, error } = await admin
    .from("arbor_vault_access_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!access) redirect("/");

  return { userId: user.id, role: access.role as "owner" | "editor" | "viewer" };
}

export default async function InvestigationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireInvestigationAccess();
  return children;
}
