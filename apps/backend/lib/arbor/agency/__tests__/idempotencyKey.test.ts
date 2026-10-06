import { describe, expect, it } from "vitest";
import { agencyOperationKey, stableJson } from "../idempotency";

describe("agency operation idempotency keys", () => {
  it("is stable across object key order, including nested objects", () => {
    const a = { z: 1, nested: { b: 2, a: 1 }, list: [{ y: 2, x: 1 }] };
    const b = { list: [{ x: 1, y: 2 }], nested: { a: 1, b: 2 }, z: 1 };
    expect(stableJson(a)).toBe(stableJson(b));
  });

  it("changes when the turn, capability, or arguments change", () => {
    const base = agencyOperationKey({
      turnId: "turn-a",
      toolName: "write",
      args: { value: 1 },
    });
    expect(
      agencyOperationKey({
        turnId: "turn-b",
        toolName: "write",
        args: { value: 1 },
      }),
    ).not.toBe(base);
    expect(
      agencyOperationKey({
        turnId: "turn-a",
        toolName: "write",
        args: { value: 2 },
      }),
    ).not.toBe(base);
  });
  it("cannot collide capability identity through argument key ordering", () => {
    const argsA={nested:{z:2,a:1},value:"x"}; const argsB={value:"x",nested:{a:1,z:2}};
    expect(agencyOperationKey({turnId:"turn",toolName:"write-a",args:argsA}))
      .toBe(agencyOperationKey({turnId:"turn",toolName:"write-a",args:argsB}));
    expect(agencyOperationKey({turnId:"turn",toolName:"write-b",args:argsB}))
      .not.toBe(agencyOperationKey({turnId:"turn",toolName:"write-a",args:argsA}));
  });
});
