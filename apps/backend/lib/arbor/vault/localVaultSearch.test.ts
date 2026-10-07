import { describe, expect, it } from "vitest";
import { searchVaultRows } from "./localVaultSearch";

describe("local Vault search", () => {
  it("searches the already-scoped Vault rows without an RPC", () => {
    const results = searchVaultRows({
      entries: [{
        id: "k1", slug: "identity-anchor", title: "Identity Anchor",
        domain: "identity", status: "active",
        summary: "Canonical Arbor identity state.",
      }],
      capabilities: [{
        id: "c1", capability_key: "continuity", name: "Continuity",
        category: "memory", description: "Durable continuity projection.",
        current_state: "bench_proven",
      }],
      codeArtifacts: [],
      observations: [],
      dossiers: [],
    }, "continuity");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      result_kind: "capability",
      result_key: "continuity",
      title: "Continuity",
      status: "bench_proven",
    });
  });

  it("bounds results and prefers stronger title matches", () => {
    const results = searchVaultRows({
      entries: [
        { id: "1", slug: "ark", title: "ARK", domain: "agency", status: "active", summary: "Durable tasks" },
        { id: "2", slug: "other", title: "Other", domain: "agency", status: "active", summary: "mentions ARK later" },
      ],
      capabilities: [],
      codeArtifacts: [],
      observations: [],
      dossiers: [],
    }, "ark", 1);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("ARK");
  });
});
