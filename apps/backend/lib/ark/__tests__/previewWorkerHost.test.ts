import { describe, it, expect } from "vitest";
import {
  ARK_PREVIEW_DB, ARK_PREVIEW_WORKER_BRANCH, ARK_PREVIEW_WORKER_PROJECT_ID,
  correctWorkerHostEnvironment, isWorkerOnlyDeployment,
  rejectWorkerOnlyRequest,
} from "@/lib/ark/previewWorkerHost";

const valid = {
  ARK_PREVIEW_WORKER_ONLY_HOST: "true",
  ARK_PREVIEW_MCP_READONLY_HOST: "false",
  VERCEL_ENV: "preview",
  VERCEL_PROJECT_ID: ARK_PREVIEW_WORKER_PROJECT_ID,
  VERCEL_GIT_COMMIT_REF: ARK_PREVIEW_WORKER_BRANCH,
  SUPABASE_URL: ARK_PREVIEW_DB,
  NEXT_PUBLIC_SUPABASE_URL: ARK_PREVIEW_DB,
};

describe("ARK Preview worker-only host", () => {
  it("defaults off and requires the exact enabling flag", () => {
    expect(isWorkerOnlyDeployment({})).toBe(false);
    expect(isWorkerOnlyDeployment({ ARK_PREVIEW_WORKER_ONLY_HOST: "false" })).toBe(false);
    expect(isWorkerOnlyDeployment(valid)).toBe(true);
  });
  it("requires Preview, the pinned source branch and both matching DB URLs", () => {
    expect(correctWorkerHostEnvironment(valid)).toBe(true);
    for (const change of [
      { ARK_PREVIEW_WORKER_ONLY_HOST: "false" },
      { ARK_PREVIEW_MCP_READONLY_HOST: "true" },
      { VERCEL_ENV: "production" },
      { VERCEL_ENV: undefined },
      { VERCEL_PROJECT_ID: "prj_JArYlugmdFovY10CxZ0LEJmcrsKC" },
      { VERCEL_PROJECT_ID: undefined },
      { VERCEL_GIT_COMMIT_REF: "main" },
      { VERCEL_GIT_COMMIT_REF: undefined },
      { SUPABASE_URL: "https://ncpdlyakrzfvobmwzbon.supabase.co" },
      { NEXT_PUBLIC_SUPABASE_URL: undefined },
      { NEXT_PUBLIC_SUPABASE_URL: "https://fqjqpuaoifgbweiguacf.supabase.co" },
    ]) {
      expect(correctWorkerHostEnvironment({ ...valid, ...change })).toBe(false);
    }
  });
  it("only exposes POST on the exact machine-authenticated dedicated heartbeat route", () => {
    expect(rejectWorkerOnlyRequest("/api/admin/ark/heartbeat", "POST")).toBe(false);
    for (const path of [
      "/", "/api/mcp", "/api/chat", "/api/chat/attachments/access",
      "/api/admin/system/heartbeat", "/api/admin/ark/heartbeat/",
      "/api/admin/ark/heartbeat/extra", "/.well-known/oauth-protected-resource",
      "/favicon.ico", "/_next/static/anything.js",
    ]) {
      expect(rejectWorkerOnlyRequest(path, "POST")).toBe(true);
    }
    for (const method of ["GET","OPTIONS","PUT","PATCH","DELETE","HEAD"]) {
      expect(rejectWorkerOnlyRequest("/api/admin/ark/heartbeat", method)).toBe(true);
    }
  });
});
