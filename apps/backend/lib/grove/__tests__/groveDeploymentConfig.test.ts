import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("private Grove deployment-only Vercel configuration", () => {
  it("does not register inherited Firefly cron jobs", () => {
    const vercelConfigUrl = new URL("../../../grove.vercel.json", import.meta.url);
    const config = JSON.parse(readFileSync(vercelConfigUrl, "utf8"));
    expect(config.crons).toEqual([]);
    expect(JSON.stringify(config)).not.toContain("/api/admin/system/heartbeat");
  });
  it("skips this source repair branch in both config scopes without changing the approved branch", () => {
    for (const relative of ["../../../vercel.json", "../../../../../vercel.json"]) {
      const config = JSON.parse(readFileSync(new URL(relative, import.meta.url), "utf8"));
      const run = (branch: string, project: string) => spawnSync("sh", ["-c", config.ignoreCommand], {
        env: { ...process.env, VERCEL_GIT_COMMIT_REF: branch, VERCEL_PROJECT_ID: project },
      }).status;
      expect(run("arbor/grove-lm-source-repair-20261005", "any-project")).toBe(0);
      expect(run("arbor/grove-phone-recovery-20261005", "any-project")).toBe(0);
      expect(run("arbor/grove-phone-tests-20261005", "any-project")).toBe(0);
      expect(run("arbor/one-arbor-phone-reconciliation-20261006", "any-project")).toBe(0);
      expect(run("arbor/grove-buffalo-acceptance-20261006", "any-project")).toBe(0);
      expect(run("main", "any-project")).toBe(1);
    }
  });

});
