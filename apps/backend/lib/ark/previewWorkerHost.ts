/** Strict, default-OFF ingress for the isolated ARK Preview worker deployment. */
export const ARK_PREVIEW_WORKER_PROJECT_ID = "prj_OHM6b4QpfGZGNWpx4hSPkgHCuyzp";
export const ARK_PREVIEW_WORKER_BRANCH = "feature/ark-mcp-reader-execution-deny-20260926";
export const ARK_PREVIEW_DB = "https://tzbpjbhroxiqftqwatnb.supabase.co";
export const ARK_PREVIEW_WORKER_ROUTE = "/api/admin/ark/heartbeat";

export type WorkerHostEnvironment = {
  ARK_PREVIEW_WORKER_ONLY_HOST?: string;
  ARK_PREVIEW_MCP_READONLY_HOST?: string;
  VERCEL_ENV?: string;
  VERCEL_PROJECT_ID?: string;
  VERCEL_GIT_COMMIT_REF?: string;
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
};

export function isWorkerOnlyDeployment(env: WorkerHostEnvironment): boolean {
  return env.ARK_PREVIEW_WORKER_ONLY_HOST === "true";
}

export function correctWorkerHostEnvironment(env: WorkerHostEnvironment): boolean {
  return env.ARK_PREVIEW_WORKER_ONLY_HOST === "true" &&
    env.ARK_PREVIEW_MCP_READONLY_HOST !== "true" &&
    env.VERCEL_ENV === "preview" &&
    env.VERCEL_PROJECT_ID === ARK_PREVIEW_WORKER_PROJECT_ID &&
    env.VERCEL_GIT_COMMIT_REF === ARK_PREVIEW_WORKER_BRANCH &&
    env.SUPABASE_URL === ARK_PREVIEW_DB &&
    env.NEXT_PUBLIC_SUPABASE_URL === ARK_PREVIEW_DB;
}

export function rejectWorkerOnlyRequest(path: string, method: string): boolean {
  // No homepage, chat, MCP, attachments, OPTIONS, GET, system heartbeat or unrelated admin routes.
  return path !== ARK_PREVIEW_WORKER_ROUTE || method !== "POST";
}
