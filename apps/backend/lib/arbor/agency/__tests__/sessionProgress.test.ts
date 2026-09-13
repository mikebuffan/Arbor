import { describe, expect, it } from "vitest";
import { mergeAgencyUnresolvedWork } from "../unresolvedWork";

describe("agency unresolved-work graph", () => {
  it("preserves sibling work while one capability advances", () => {
    expect(
      mergeAgencyUnresolvedWork(
        [
          "complete goal: finish Arbor",
          "execute capability: inspect_repo",
          "recover capability: check_preview",
        ],
        ["verify capability result: inspect_repo"],
      ),
    ).toEqual([
      "complete goal: finish Arbor",
      "recover capability: check_preview",
      "verify capability result: inspect_repo",
    ]);
  });

  it("lets verifier replace detailed work without surrendering the active goal", () => {
    expect(
      mergeAgencyUnresolvedWork(
        [
          "complete goal: finish Arbor",
          "verify capability result: inspect_repo",
        ],
        ["fix persistence", "rerun acceptance"],
      ),
    ).toEqual([
      "complete goal: finish Arbor",
      "fix persistence",
      "rerun acceptance",
    ]);
  });

  it("accepts an explicit replacement ownership marker from the verifier", () => {
    expect(
      mergeAgencyUnresolvedWork(
        ["complete goal: finish Arbor", "fix persistence"],
        ["continue goal: finish Arbor", "rerun acceptance"],
      ),
    ).toEqual([
      "continue goal: finish Arbor",
      "rerun acceptance",
    ]);
  });

  it("does not turn an empty verified snapshot into stale work", () => {
    expect(
      mergeAgencyUnresolvedWork(
        ["complete goal: finish Arbor"],
        [],
      ),
    ).toEqual([]);
  });
});
