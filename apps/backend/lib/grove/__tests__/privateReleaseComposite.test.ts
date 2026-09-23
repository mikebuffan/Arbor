import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Source acceptance only. Does not assert a Vercel project was provisioned. */
describe("dedicated Grove release source denies inherited Firefly scheduled jobs", () => {
  it("has no cron jobs at either supported Vercel root-directory location", () => {
    const backend = JSON.parse(readFileSync(
      new URL("../../../vercel.json", import.meta.url), "utf8",
    ));
    const root = JSON.parse(readFileSync(
      new URL("../../../../../vercel.json", import.meta.url), "utf8",
    ));
    expect(backend.crons).toEqual([]);
    expect(root.crons).toEqual([]);
    expect(JSON.stringify(backend) + JSON.stringify(root))
      .not.toContain("/api/admin/system/heartbeat");
  });
});
