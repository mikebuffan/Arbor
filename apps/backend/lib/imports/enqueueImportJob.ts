import "server-only";

import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function enqueueImportJob(params: {
  importId: string;
  userId: string;
  projectId: string | null;
}) {
  const { importId, userId, projectId } = params;
  const admin = supabaseAdmin();

  let ownershipQuery = admin
    .from("conversation_imports")
    .select("id")
    .eq("id", importId)
    .eq("user_id", userId);

  ownershipQuery = projectId
    ? ownershipQuery.eq("project_id", projectId)
    : ownershipQuery.is("project_id", null);

  const { data: ownedImport, error: ownershipError } =
    await ownershipQuery.maybeSingle();
  if (ownershipError) throw ownershipError;
  if (!ownedImport) {
    throw new RouteAccessError(404, "import_not_found");
  }

  const { error: jobError } = await admin.from("system_jobs").insert({
    type: "import_conversations",
    status: "pending",
    payload: { importId },
  });
  if (jobError) throw jobError;
}
