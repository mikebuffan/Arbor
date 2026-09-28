import type { ServerContext } from "@modelcontextprotocol/server";

import {
  ARK_PREVIEW_DB,
  ARK_PREVIEW_WORKER_BRANCH,
  ARK_PREVIEW_WORKER_PROJECT_ID,
} from "@/lib/ark/previewWorkerHost";


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

export const ArkSubmissionGateCheck = [
  "submit_host",
  "readonly_host",
  "worker_only_host",
  "vercel_environment",
  "vercel_project",
  "git_branch",
  "server_database",
  "public_database",
  "submit_user",
  "submit_client",
  "dedicated_heartbeat_disabled",
  "live_execution_disabled",
  "execution_disabled",
  "checkpoint_canary_disabled",
  "preview_research_execution_disabled",
] as const;

export type ArkSubmissionGateCheckName = typeof ArkSubmissionGateCheck[number];

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

export function arkSubmissionGateStatus(env: ArkSubmissionEnvironment): {
  enabled: boolean;
  failedChecks: ArkSubmissionGateCheckName[];
} {
  const checks: Array<[ArkSubmissionGateCheckName, boolean]> = [
    ["submit_host", env.ARK_PREVIEW_MCP_SUBMIT_HOST === "true"],
    ["readonly_host", env.ARK_PREVIEW_MCP_READONLY_HOST !== "true"],
    ["worker_only_host", env.ARK_PREVIEW_WORKER_ONLY_HOST !== "true"],
    ["vercel_environment", env.VERCEL_ENV === "preview"],
    ["vercel_project", env.VERCEL_PROJECT_ID === ARK_PREVIEW_WORKER_PROJECT_ID],
    ["git_branch", env.VERCEL_GIT_COMMIT_REF === ARK_PREVIEW_WORKER_BRANCH],
    ["server_database", env.SUPABASE_URL === ARK_PREVIEW_DB],
    ["public_database", env.NEXT_PUBLIC_SUPABASE_URL === ARK_PREVIEW_DB],
    ["submit_user", UUID.test(env.ARK_PREVIEW_MCP_SUBMIT_USER_ID ?? "")],
    ["submit_client", Boolean(env.ARK_PREVIEW_MCP_SUBMIT_CLIENT_ID?.trim())],
    ["dedicated_heartbeat_disabled", env.ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT !== "true"],
    ["live_execution_disabled", env.ARBOR_ARK_ENABLE_LIVE_EXECUTION !== "true"],
    ["execution_disabled", env.ARBOR_ENABLE_ARK_EXECUTION !== "true"],
    ["checkpoint_canary_disabled", env.ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY !== "true"],
    ["preview_research_execution_disabled", env.ARBOR_ARK_PREVIEW_RESEARCH !== "true"],
  ];
  const failedChecks = checks.filter(([, passed]) => !passed).map(([name]) => name);
  return { enabled: failedChecks.length === 0, failedChecks };
}

export function isArkSubmissionHost(env: ArkSubmissionEnvironment): boolean {
  return arkSubmissionGateStatus(env).enabled;
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
