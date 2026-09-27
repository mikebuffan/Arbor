import type { ServerContext } from "@modelcontextprotocol/server";

import {
  ARK_PREVIEW_DB,
  ARK_PREVIEW_WORKER_BRANCH,
} from "@/lib/ark/previewWorkerHost";

export const ARK_PREVIEW_MCP_SUBMIT_PROJECT_ID = "prj_JArYlugmdFovY10CxZ0LEJmcrsKC";

export type ArkSubmissionEnvironment = {
  ARK_PREVIEW_MCP_SUBMIT_HOST?: string;
  ARK_PREVIEW_MCP_SUBMIT_USER_ID?: string;
  ARK_PREVIEW_MCP_SUBMIT_CLIENT_ID?: string;
  ARK_PREVIEW_MCP_READONLY_HOST?: string;
  ARK_PREVIEW_WORKER_ONLY_HOST?: string;
  VERCEL_ENV?: string;
  VERCEL_PROJECT_ID?: string;
  VERCEL_GIT_COMMIT_REF?: string;
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT?: string;
  ARBOR_ARK_ENABLE_LIVE_EXECUTION?: string;
  ARBOR_ENABLE_ARK_EXECUTION?: string;
  ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY?: string;
  ARBOR_ARK_PREVIEW_RESEARCH?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function arkSubmissionEnvironment(): ArkSubmissionEnvironment {
  return {
    ARK_PREVIEW_MCP_SUBMIT_HOST: process.env.ARK_PREVIEW_MCP_SUBMIT_HOST,
    ARK_PREVIEW_MCP_SUBMIT_USER_ID: process.env.ARK_PREVIEW_MCP_SUBMIT_USER_ID,
    ARK_PREVIEW_MCP_SUBMIT_CLIENT_ID: process.env.ARK_PREVIEW_MCP_SUBMIT_CLIENT_ID,
    ARK_PREVIEW_MCP_READONLY_HOST: process.env.ARK_PREVIEW_MCP_READONLY_HOST,
    ARK_PREVIEW_WORKER_ONLY_HOST: process.env.ARK_PREVIEW_WORKER_ONLY_HOST,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT: process.env.ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT,
    ARBOR_ARK_ENABLE_LIVE_EXECUTION: process.env.ARBOR_ARK_ENABLE_LIVE_EXECUTION,
    ARBOR_ENABLE_ARK_EXECUTION: process.env.ARBOR_ENABLE_ARK_EXECUTION,
    ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY: process.env.ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY,
    ARBOR_ARK_PREVIEW_RESEARCH: process.env.ARBOR_ARK_PREVIEW_RESEARCH,
  };
}

export function isArkSubmissionHost(env: ArkSubmissionEnvironment): boolean {
  return env.ARK_PREVIEW_MCP_SUBMIT_HOST === "true" &&
    env.ARK_PREVIEW_MCP_READONLY_HOST !== "true" &&
    env.ARK_PREVIEW_WORKER_ONLY_HOST !== "true" &&
    env.VERCEL_ENV === "preview" &&
    env.VERCEL_PROJECT_ID === ARK_PREVIEW_MCP_SUBMIT_PROJECT_ID &&
    env.VERCEL_GIT_COMMIT_REF === ARK_PREVIEW_WORKER_BRANCH &&
    env.SUPABASE_URL === ARK_PREVIEW_DB &&
    env.NEXT_PUBLIC_SUPABASE_URL === ARK_PREVIEW_DB &&
    UUID.test(env.ARK_PREVIEW_MCP_SUBMIT_USER_ID ?? "") &&
    Boolean(env.ARK_PREVIEW_MCP_SUBMIT_CLIENT_ID?.trim()) &&
    env.ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT !== "true" &&
    env.ARBOR_ARK_ENABLE_LIVE_EXECUTION !== "true" &&
    env.ARBOR_ENABLE_ARK_EXECUTION !== "true" &&
    env.ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY !== "true" &&
    env.ARBOR_ARK_PREVIEW_RESEARCH !== "true";
}

export function assertArkSubmissionCaller(
  ctx: ServerContext,
  env: ArkSubmissionEnvironment,
): void {
  if (!isArkSubmissionHost(env)) {
    throw new Error("ark_submission_disabled");
  }
  const auth = ctx.http?.authInfo;
  if (!auth || auth.extra?.userId !== env.ARK_PREVIEW_MCP_SUBMIT_USER_ID) {
    throw new Error("ark_submission_user_denied");
  }
  if (auth.clientId !== env.ARK_PREVIEW_MCP_SUBMIT_CLIENT_ID) {
    throw new Error("ark_submission_client_denied");
  }
}
