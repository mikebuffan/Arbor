import { describe, expect, it } from "vitest";
import { normalizeUnresolvedWork } from "../state";

describe("agency state hydration", () => {
  it("preserves legacy structured unresolved work instead of erasing it", () => {
    expect(
      normalizeUnresolvedWork([
        {
          id: "chatgpt-canonical-path-recovery",
          objective: "Restore canonical Arbor.",
          exactNextAction: "Wire durable runtime carrier.",
        },
      ]),
    ).toEqual(["Wire durable runtime carrier."]);
  });

  it("still accepts ordinary string work items", () => {
    expect(normalizeUnresolvedWork([" step one ", "", "step two"])).toEqual([
      "step one",
      "step two",
    ]);
  });
});
