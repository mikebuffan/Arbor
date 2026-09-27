import { describe, expect, it } from "vitest";

import {
  assertArkSubmissionCaller,
  isArkSubmissionHost,
  type ArkSubmissionEnvironment,
} from "../arkSubmissionGate";

const USER = "11111111-1111-4111-8111-111111111111";
const valid: ArkSubmissionEnvironment = {
  ARK_PREVIEW_MCP_SUBMIT_HOST: "true",
  ARK_PREVIEW_MCP_SUBMIT_USER_ID: USER,
  ARK_PREVIEW_MCP_SUBMIT_CLIENT_ID: "chatgpt-client",
  ARK_PREVIEW_MCP_READONLY_HOST: "false",
  ARK_PREVIEW_WORKER_ONLY_HOST: "false",
  VERCEL_ENV: "preview",
  VERCEL_PROJECT_ID: "prj_JArYlugmdFovY10CxZ0LEJmcrsKC",
  VERCEL_GIT_COMMIT_REF: "feature/ark-mcp-reader-execution-deny-20260926",
  SUPABASE_URL: "https://tzbpjbhroxiqftqwatnb.supabase.co",
  NEXT_PUBLIC_SUPABASE_URL: "https://tzbpjbhroxiqftqwatnb.supabase.co",
  ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT: "false",
  ARBOR_ARK_ENABLE_LIVE_EXECUTION: "false",
  ARBOR_ENABLE_ARK_EXECUTION: "false",
  ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY: "false",
  ARBOR_ARK_PREVIEW_RESEARCH: "false",
};

describe("ARK MCP submission gate", () => {
  it("opens only on the pinned Preview host while every execution switch is off", () => {
    expect(isArkSubmissionHost(valid)).toBe(true);
  });

  it.each([
    { ARK_PREVIEW_MCP_SUBMIT_HOST: "false" },
    { ARK_PREVIEW_MCP_READONLY_HOST: "true" },
    { ARK_PREVIEW_WORKER_ONLY_HOST: "true" },
    { VERCEL_ENV: "production" },
    { VERCEL_PROJECT_ID: "another-project" },
    { VERCEL_GIT_COMMIT_REF: "main" },
    { SUPABASE_URL: "https://ncpdlyakrzfvobmwzbon.supabase.co" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://ncpdlyakrzfvobmwzbon.supabase.co" },
    { ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT: "true" },
    { ARBOR_ARK_ENABLE_LIVE_EXECUTION: "true" },
    { ARBOR_ENABLE_ARK_EXECUTION: "true" },
    { ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY: "true" },
    { ARBOR_ARK_PREVIEW_RESEARCH: "true" },
  ])("fails closed for %o", (change) => {
    expect(isArkSubmissionHost({ ...valid, ...change })).toBe(false);
  });

  it("requires both the approved user and the validated OAuth client", () => {
    const context = {
      http: { authInfo: { clientId: "chatgpt-client", extra: { userId: USER } } },
    } as never;
    expect(() => assertArkSubmissionCaller(context, valid)).not.toThrow();
    expect(() => assertArkSubmissionCaller({
      http: { authInfo: { clientId: "other", extra: { userId: USER } } },
    } as never, valid)).toThrow("ark_submission_client_denied");
    expect(() => assertArkSubmissionCaller({
      http: { authInfo: { clientId: "chatgpt-client", extra: { userId: "22222222-2222-4222-8222-222222222222" } } },
    } as never, valid)).toThrow("ark_submission_user_denied");
  });
});
