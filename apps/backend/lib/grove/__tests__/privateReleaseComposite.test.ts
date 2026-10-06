import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Source acceptance only. Does not assert a Vercel project was provisioned. */
describe("dedicated Grove release source denies inherited Firefly scheduled jobs", () => {
  it("has no cron jobs in the dedicated private-host config", () => {
    const backend = JSON.parse(readFileSync(
      new URL("../../../vercel.grove.json", import.meta.url), "utf8",
    ));
    expect(backend.crons).toEqual([]);
    expect(JSON.stringify(backend))
      .not.toContain("/api/admin/system/heartbeat");
  });
});
