import { describe, expect, it } from "vitest";

import { mergeAgencyUnresolvedWork } from "../unresolvedWork";

describe("canonical agency ownership", () => {
  it("keeps the active goal owned while a blocker is added", () => {
    expect(
      mergeAgencyUnresolvedWork(
        [
          "complete goal: finish Arbor",
          "fix persistence",
          "verify capability result: inspect_repo",
        ],
        ["complete boundary action: publish_firewall"],
      ),
    ).toEqual([
      "complete goal: finish Arbor",
      "complete boundary action: publish_firewall",
    ]);
  });

  it("does not let a capability transition erase sibling branches", () => {
    expect(
      mergeAgencyUnresolvedWork(
        [
          "complete goal: finish Arbor",
          "recover capability: preview",
          "execute capability: inspect_repo",
        ],
        ["verify capability result: inspect_repo"],
      ),
    ).toEqual([
      "complete goal: finish Arbor",
      "recover capability: preview",
      "verify capability result: inspect_repo",
    ]);
  });

  it("requires an explicit empty verified frontier to surrender ownership", () => {
    expect(
      mergeAgencyUnresolvedWork(
        [
          "complete goal: finish Arbor",
          "finalize verified goal",
        ],
        [],
      ),
    ).toEqual([]);
  });
});
