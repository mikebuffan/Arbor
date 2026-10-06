import "server-only";
import type { ResearchSession } from "./sessionPolicy";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runStoredDocumentHopTick } from "./documentHopExecutor";
import { SupabaseResearchStore } from "./supabaseResearchStore";

/**
 * Narrow privileged broker for already-authenticated, owner/project-scoped
 * document-hop operations. API routes must prove ownership before calling.
 */
export async function stopPrivilegedResearchSession(input: {
  userId: string;
  projectId: string;
  session: ResearchSession;
}) {
  if (input.session.userId !== input.userId || input.session.projectId !== input.projectId)
    throw new Error("research_owner_scope_mismatch");
  const writer = new SupabaseResearchStore(
    supabaseAdmin(), input.userId, input.projectId, "owner-stop",
  );
  await writer.stop({
    session: input.session,
    status: "cancelled",
    reason: "cancelled_by_owner",
  });
}

export async function runPrivilegedDocumentHopTick(input: {
  ownerId: string;
  projectId: string;
  workerId: string;
  sessionId: string;
  unitId: string;
  at: string;
  enabled: boolean;
}) {
  return runStoredDocumentHopTick({
    db: supabaseAdmin(),
    ...input,
  });
}
