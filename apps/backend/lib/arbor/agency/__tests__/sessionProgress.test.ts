import { describe, expect, it } from "vitest";
import { mergeAgencyUnresolvedWork } from "../session";

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

  it("lets verifier output replace transient capability markers", () => {
    expect(
      mergeAgencyUnresolvedWork(
        [
          "complete goal: finish Arbor",
          "verify capability result: inspect_repo",
        ],
        ["fix persistence", "rerun acceptance"],
      ),
    ).toEqual(["fix persistence", "rerun acceptance"]);
  });

  it("does not turn an empty verified snapshot into stale work", () => {
    expect(
      mergeAgencyUnresolvedWork(
        ["verify capability result: inspect_repo"],
        [],
      ),
    ).toEqual([]);
  });
});
