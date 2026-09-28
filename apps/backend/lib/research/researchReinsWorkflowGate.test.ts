import { describe, expect, it } from "vitest";
import {
  RESEARCH_REINS_PREVIEW_BRANCH,
  RESEARCH_REINS_PREVIEW_DATABASE_URL,
  researchReinsWorkflowGate,
  requireResearchReinsWorkflowGate,
} from "./researchReinsWorkflowGate";

const valid = {
  ARBOR_RESEARCH_REINS_WORKFLOW_ENABLED: "true",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: RESEARCH_REINS_PREVIEW_BRANCH,
  SUPABASE_URL: RESEARCH_REINS_PREVIEW_DATABASE_URL,
};

describe("research reins Workflow deployment gate", () => {
  it("opens only for the explicitly enabled exact Preview branch and database", () => {
    expect(researchReinsWorkflowGate(valid)).toEqual({
      enabled: true,
      failedChecks: [],
    });
    expect(() => requireResearchReinsWorkflowGate(valid)).not.toThrow();
  });

  it.each([
    [{ ...valid, ARBOR_RESEARCH_REINS_WORKFLOW_ENABLED: "false" }, "reins_workflow_flag_off"],
    [{ ...valid, VERCEL_ENV: "production" }, "not_vercel_preview"],
    [{ ...valid, VERCEL_GIT_COMMIT_REF: "main" }, "wrong_git_branch"],
    [{ ...valid, SUPABASE_URL: "https://example.supabase.co" }, "wrong_database"],
  ] as const)("fails closed for %s", (env, check) => {
    const gate = researchReinsWorkflowGate(env);
    expect(gate.enabled).toBe(false);
    expect(gate.failedChecks).toContain(check);
  });

  it("reports every missing gate rather than guessing a fallback", () => {
    expect(researchReinsWorkflowGate({})).toEqual({
      enabled: false,
      failedChecks: [
        "reins_workflow_flag_off",
        "not_vercel_preview",
        "wrong_git_branch",
        "wrong_database",
      ],
    });
  });
});
