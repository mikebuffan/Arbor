import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Source acceptance only. Does not assert a Vercel project was provisioned. */
describe("dedicated Grove release source denies inherited Firefly scheduled jobs", () => {
  it("has no cron jobs in the dedicated release configuration", () => {
    const dedicated = JSON.parse(readFileSync(new URL("../../../grove.vercel.json", import.meta.url), "utf8"));
    expect(dedicated.crons).toEqual([]);
    expect(JSON.stringify(dedicated)).not.toContain("/api/admin/system/heartbeat");
  });
});
