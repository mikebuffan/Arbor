import { describe, expect, it } from "vitest";
import { runAgency, type AgencyRuntime } from "../engine";

type Shared = { completed: number };

describe("agency completion frontier", () => {
  it("continues when completion is reported but sibling work remains", async () => {
    let actions = 0;
    const runtime: AgencyRuntime<Shared> = {
      async loadSharedState() { return { completed: 0 }; },
      async assess({ shared }) {
        return shared.completed === 0
          ? { complete: true, unresolvedWork: ["finish sibling branch"] }
          : { complete: true, unresolvedWork: [] };
      },
      async choose() {
        return { id: "sibling", description: "finish sibling branch", reversible: true };
      },
      async execute() { actions += 1; return 1; },
      async integrate({ shared, result }) {
        return { completed: shared.completed + Number(result) };
      },
      async verify({ shared }) { return { ok: shared.completed === 1 }; },
      async selfAudit() { return {}; },
      async persist() {},
    };

    const result = await runAgency({ goal: "finish the whole graph", runtime });

    expect(result.agency.status).toBe("complete");
    expect(result.shared.completed).toBe(1);
    expect(actions).toBe(1);
  });
});
