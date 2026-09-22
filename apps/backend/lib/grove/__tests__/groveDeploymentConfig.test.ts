import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("private Grove deployment-only Vercel configuration", () => {
  it("does not register inherited Firefly cron jobs", () => {
    const vercelConfigUrl = new URL("../../../vercel.json", import.meta.url);
    const config = JSON.parse(readFileSync(vercelConfigUrl, "utf8"));
    expect(config.crons).toEqual([]);
    expect(JSON.stringify(config)).not.toContain("/api/admin/system/heartbeat");
  });
});
