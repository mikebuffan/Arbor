import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";
import {
  loadVersionedAnnabelleWorkspace,
  restoreLatestAnnabelleWorkspaceRevision,
  updateAnnabelleWorkspace,
} from "@/lib/arbor/subsystem/annabelleWorkspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Test-only connection to the EXISTING workspace owner. Disabled unless both
// the separately approved atomic migration and an exact synthetic project
// allowlist are enabled. NEVER binds or imports a private manuscript.
const ProjectId = z.string().uuid();
const Base = {
  projectId: ProjectId,
  requestId: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
};
const Mutation = z.discriminatedUnion("action", [
  z.object({
    ...Base, action: z.literal("save"),
    workingDelta: z.string().max(100_000).nullable(),
  }).strict(),
  z.object({ ...Base, action: z.literal("restore") }).strict(),
]);

function permitted(): boolean {
  return process.env.ANNABELLE_ATOMIC_WORKSPACE_ENABLED === "true" &&
    process.env.ANNABELLE_SYNTHETIC_WORKSPACE_ENABLED === "true" &&
    ProjectId.safeParse(process.env.ANNABELLE_SYNTHETIC_PROJECT_ID).success;
}
function output(body: object, status = 200) {
  return NextResponse.json(body, {
    status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
function deniedProject(projectId: string): boolean {
  return projectId !== process.env.ANNABELLE_SYNTHETIC_PROJECT_ID;
}
function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return output({ ok: false, error: "invalid_workspace_request" }, 400);
  const issue = error as { code?: unknown; message?: unknown } | null;
  const message = typeof issue?.message === "string" ? issue.message : "";
  if (message === "annabelle_test_project_contains_manuscript")
    return output({ ok: false, error: message }, 409);
  if (message === "annabelle_atomic_version_conflict" ||
      message === "annabelle_atomic_request_id_conflict" ||
      message === "annabelle_atomic_post_write_changed")
    return output({ ok: false, error: message }, 409);
  return routeErrorResponse(error);
}

// Even a misconfigured allowlist must never write into a manuscript project.
async function assertEmptySyntheticProject(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string, projectId: string,
): Promise<void> {
  const { data, error } = await supabase.from("annabelle_manuscripts")
    .select("id").eq("user_id", userId).eq("project_id", projectId).limit(1);
  if (error) throw error;
  if ((data?.length ?? 0) > 0)
    throw new Error("annabelle_test_project_contains_manuscript");
}

export async function GET(req: Request) {
  if (!permitted()) return output({ ok: false, error: "annabelle_synthetic_editor_disabled" }, 404);
  try {
    const { userId, supabase } = await requireUser(req);
    const projectId = ProjectId.parse(new URL(req.url).searchParams.get("projectId"));
    if (deniedProject(projectId)) return output({ ok: false, error: "synthetic_project_only" }, 404);
    await assertProjectOwnedByUser(supabase, userId, projectId);
    await assertEmptySyntheticProject(supabase, userId, projectId);
    const { workspace, editVersion } = await loadVersionedAnnabelleWorkspace({ supabase, userId, projectId });
    return output({ ok: true, workspace, editVersion });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(req: Request) {
  if (!permitted()) return output({ ok: false, error: "annabelle_synthetic_editor_disabled" }, 404);
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"))
    return output({ ok: false, error: "json_required" }, 415);
  try {
    const reader = req.body?.getReader();
    if (!reader) return output({ ok: false, error: "invalid_workspace_request" }, 400);
    const chunks: Uint8Array[] = [];
    let count = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        count += value.byteLength;
        if (count > 120_000) {
          await reader.cancel();
          return output({ ok: false, error: "workspace_body_too_large" }, 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let parsed: unknown;
    try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return output({ ok: false, error: "invalid_json" }, 400); }
    const body = Mutation.parse(parsed);
    if (deniedProject(body.projectId)) return output({ ok: false, error: "synthetic_project_only" }, 404);
    const { userId, supabase } = await requireUser(req);
    await assertProjectOwnedByUser(supabase, userId, body.projectId);
    await assertEmptySyntheticProject(supabase, userId, body.projectId);
    const scope = {
      supabase, userId, projectId: body.projectId,
      requestId: body.requestId, expectedVersion: body.expectedVersion,
    };
    // The RPC is atomic, but a second caller can commit before this response's
    // independent readback. Never label a stale payload with a newer version.
    const confirmExactCommit = async (workspace: Awaited<ReturnType<typeof updateAnnabelleWorkspace>>) => {
      const verified = await loadVersionedAnnabelleWorkspace(scope);
      if (verified.editVersion !== body.expectedVersion + 1 ||
          JSON.stringify(verified.workspace) !== JSON.stringify(workspace))
        throw new Error("annabelle_atomic_post_write_changed");
      return verified.editVersion;
    };
    if (body.action === "restore") {
      const workspace = await restoreLatestAnnabelleWorkspaceRevision(scope);
      const editVersion = await confirmExactCommit(workspace);
      return output({ ok: true, workspace, editVersion, restored: true });
    }
    const workspace = await updateAnnabelleWorkspace({
      ...scope, reason: "synthetic draft acceptance",
    }, current => ({ ...current, workingDelta: body.workingDelta }));
    const editVersion = await confirmExactCommit(workspace);
    return output({ ok: true, workspace, editVersion, saved: true });
  } catch (error) {
    return failure(error);
  }
}
